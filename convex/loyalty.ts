import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { redemptionKindValidator } from "./schema";
import { assertSignedIn, assertStaff, currentUser, type Ctx } from "./lib/admin";
import { computeLoyaltyEligibility, loyaltyDiscountRsd, type LoyaltyEligibility } from "./lib/loyalty";
import { normalizePhone } from "./lib/validate";

/**
 * Loyalty program (ADR-004). Član dobija 10% na sledeći račun — isti popust
 * važi i na sajtu i u salonu, i troši se jednom po ciklusu.
 *
 * Sva pravila su u `convex/lib/loyalty.ts` (`computeLoyaltyEligibility`); ovde
 * je samo posao sa bazom: šta se broji kao plaćena poseta, ko sme da troši
 * popust i kako radnica pronalazi člana za pultom.
 */

export const LOYALTY_MESSAGES = {
  notMember: "Nalog nije loyalty član.",
  notEligible: "Član trenutno nema neiskorišćen popust.",
  amount: "Iznos mora biti veći od nule.",
  notFound: "Član nije pronađen.",
  query: "Upiši bar tri znaka za pretragu.",
} as const;

export const eligibilityValidator = v.object({
  eligible: v.boolean(),
  discountPercent: v.number(),
  reason: v.union(
    v.literal("prva-poseta"),
    v.literal("posle-posete"),
    v.literal("iskoriscen"),
    v.literal("nije-clan"),
  ),
  lastRedeemedAt: v.union(v.number(), v.null()),
  redemptionsCount: v.number(),
});

/** Jedini put do „da li član sme popust" — koriste ga i `orders.create` i admin. */
export async function loyaltyStatusFor(ctx: Ctx, user: Doc<"users">): Promise<LoyaltyEligibility> {
  if (!user.loyaltyNumber || user.role === "admin") {
    return {
      eligible: false,
      discountPercent: 0,
      reason: "nije-clan",
      lastRedeemedAt: null,
      redemptionsCount: 0,
    };
  }

  const redemptions = await ctx.db
    .query("loyaltyRedemptions")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();

  const orders = await ctx.db
    .query("orders")
    .withIndex("by_customer", (q) => q.eq("customerId", user._id))
    .collect();

  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_status", (q) => q.eq("status", "potvrdjen"))
    .filter((q) => q.eq(q.field("customerId"), user._id as string))
    .collect();

  return computeLoyaltyEligibility({
    registeredAt: user.createdAt ?? user._creationTime,
    redemptionsAt: redemptions.map((r) => r.redeemedAt),
    paidVisitsAt: [
      ...orders.filter((o) => o.status === "zavrsena").map((o) => o.updatedAt),
      ...bookings.map((b) => b.decidedAt ?? b.createdAt),
    ],
  });
}

/* =====================================================================
 * Član — svoja kartica
 * ===================================================================== */

/**
 * Bez `userId` vraća status prijavljenog člana (profil, QR kartica).
 * Sa `userId` — samo za radnice i vlasnicu, kad gledaju tuđu karticu.
 */
export const status = query({
  args: { userId: v.optional(v.id("users")), key: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let user: Doc<"users"> | null;
    if (args.userId) {
      await assertStaff(ctx, args.key);
      user = await ctx.db.get(args.userId);
      if (!user) throw new ConvexError(LOYALTY_MESSAGES.notFound);
    } else {
      user = await currentUser(ctx);
      if (!user) return null;
    }

    return {
      userId: user._id,
      loyaltyNumber: user.loyaltyNumber ?? null,
      email: user.email ?? null,
      name: user.name ?? null,
      ...(await loyaltyStatusFor(ctx, user)),
    };
  },
});

/** Kartica prijavljenog člana — QR sadrži SAMO broj kartice, ništa lično. */
export const myCard = query({
  args: {},
  handler: async (ctx) => {
    const user = await assertSignedIn(ctx);
    const state = await loyaltyStatusFor(ctx, user);
    return {
      loyaltyNumber: user.loyaltyNumber ?? null,
      /** Ovo i ništa više ide u QR kod. */
      qrValue: user.loyaltyNumber ?? null,
      ...state,
    };
  },
});

/* =====================================================================
 * Salon — radnica za pultom
 * ===================================================================== */

/** Pretraga po broju kartice, imejlu, imenu ili telefonu. */
export const findMember = query({
  args: { key: v.optional(v.string()), query: v.string() },
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    const needle = args.query.trim().toLowerCase();
    if (needle.length < 3) throw new ConvexError(LOYALTY_MESSAGES.query);

    const byCard = await ctx.db
      .query("users")
      .withIndex("by_loyaltyNumber", (q) => q.eq("loyaltyNumber", needle.toUpperCase()))
      .first();

    const candidates: Doc<"users">[] = byCard ? [byCard] : [];
    if (!byCard) {
      const digits = normalizePhone(needle);
      const all = await ctx.db.query("users").take(500);
      for (const u of all) {
        if (!u.loyaltyNumber) continue;
        const haystack = [u.email ?? "", u.name ?? "", u.loyaltyNumber].join(" ").toLowerCase();
        const phoneHit = digits.length >= 6 && (u.phone ?? "").includes(digits);
        if (haystack.includes(needle) || phoneHit) candidates.push(u);
        if (candidates.length >= 20) break;
      }
    }

    return await Promise.all(
      candidates.map(async (u) => ({
        userId: u._id,
        loyaltyNumber: u.loyaltyNumber ?? null,
        email: u.email ?? null,
        name: u.name ?? null,
        phone: u.phone ?? null,
        ...(await loyaltyStatusFor(ctx, u)),
      })),
    );
  },
});

/**
 * Radnica troši popust na račun u salonu. Ista provera prava kao na sajtu —
 * ko nema neiskorišćen popust, ne dobija ga ni ovde.
 */
export const redeem = mutation({
  args: {
    key: v.optional(v.string()),
    userId: v.id("users"),
    kind: redemptionKindValidator,
    amountRsd: v.number(),
    bookingId: v.optional(v.id("bookings")),
  },
  returns: v.object({ discountRsd: v.number(), payableRsd: v.number(), redemptionId: v.id("loyaltyRedemptions") }),
  handler: async (ctx, args) => {
    const staff = await assertStaff(ctx, args.key);
    if (!Number.isFinite(args.amountRsd) || args.amountRsd <= 0) throw new ConvexError(LOYALTY_MESSAGES.amount);

    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError(LOYALTY_MESSAGES.notFound);
    if (!user.loyaltyNumber) throw new ConvexError(LOYALTY_MESSAGES.notMember);

    const state = await loyaltyStatusFor(ctx, user);
    if (!state.eligible) throw new ConvexError(LOYALTY_MESSAGES.notEligible);

    const amountRsd = Math.round(args.amountRsd);
    const discountRsd = loyaltyDiscountRsd(amountRsd, state.discountPercent);

    const redemptionId = await ctx.db.insert("loyaltyRedemptions", {
      userId: user._id,
      kind: args.kind,
      bookingId: args.bookingId,
      amountRsd,
      discountRsd,
      redeemedAt: Date.now(),
      redeemedBy: staff?._id,
    });

    return { discountRsd, payableRsd: amountRsd - discountRsd, redemptionId };
  },
});

/** Istorija trošenja jednog člana — admin panel. */
export const history = query({
  args: { key: v.optional(v.string()), userId: v.id("users") },
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    return await ctx.db
      .query("loyaltyRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});
