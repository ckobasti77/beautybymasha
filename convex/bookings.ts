import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import schema, { locationKeyValidator, resourceKeyValidator, statusValidator } from "./schema";
import { assertAdmin, assertSignedIn, currentUser } from "./lib/admin";
import {
  MAX_BOOKINGS_PER_DAY,
  getLocation,
  getService,
  getSettings,
  hasFreeSeat,
  occupies,
  resourceOfGroup,
  slotsFor,
  workRangesFor,
} from "./lib/availability";
import {
  MESSAGES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  normalizePhone,
  validateEmail,
  validateName,
  validateNote,
  validatePhone,
} from "./lib/validate";
import { locationByKey, type LocationKey } from "../lib/site";
import { belgradeNow, diffDays, fmtRange, isValidDate } from "../lib/slots";

const bookingDoc = schema.doc("bookings");

const MAX_DURATION_MIN = 12 * 60;

async function assertRateLimit(ctx: MutationCtx, phone: string, now: number): Promise<void> {
  const recent = await ctx.db
    .query("bookings")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .order("desc")
    .filter((q) => q.gt(q.field("createdAt"), now - RATE_LIMIT_WINDOW_MS))
    .take(RATE_LIMIT_MAX);
  if (recent.length >= RATE_LIMIT_MAX) throw new ConvexError(MESSAGES.rateLimit);
}

function assertStartMin(startMin: number, durationMin: number): number {
  if (!Number.isInteger(startMin) || startMin < 0) throw new ConvexError(MESSAGES.range);
  const endMin = startMin + durationMin;
  if (endMin > 24 * 60) throw new ConvexError(MESSAGES.range);
  return endMin;
}

/* =====================================================================
 * Javno — zahtev za termin sa sajta
 * ===================================================================== */

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    serviceKey: v.string(),
    locationKey: locationKeyValidator,
    date: v.string(),
    startMin: v.number(),
    note: v.optional(v.string()),
    /** Honeypot — pravi ljudi ga nikad ne popune. */
    website: v.optional(v.string()),
  },
  returns: v.object({
    id: v.union(v.id("bookings"), v.null()),
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    startMin: v.number(),
    endMin: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Honeypot: glumimo uspeh bez upisa, da bot ne sazna da je otkriven.
    if (args.website && args.website.trim() !== "") {
      return {
        id: null,
        locationKey: args.locationKey,
        resourceKey: "nokti" as const,
        startMin: args.startMin,
        endMin: args.startMin,
      };
    }

    const name = validateName(args.name);
    const phone = validatePhone(args.phone);
    const email = validateEmail(args.email);
    const note = validateNote(args.note);

    // Ništa od klijenta se ne veruje: usluga, trajanje, resurs i lokal se
    // ponovo čitaju iz baze, pa se slot ponovo računa u OVOJ transakciji.
    const service = await getService(ctx, args.serviceKey);
    if (!service || service.hidden || !service.bookable) throw new ConvexError(MESSAGES.service);
    const resourceKey = resourceOfGroup(service.groupKey);
    const durationMin = service.durationMin;

    const location = await getLocation(ctx, args.locationKey);
    if (!location || !location.active) throw new ConvexError(MESSAGES.location);

    if (!isValidDate(args.date)) throw new ConvexError(MESSAGES.dateFormat);
    const settings = await getSettings(ctx);
    const today = belgradeNow(now);
    if (args.date < today.date) throw new ConvexError(MESSAGES.datePast);
    if (diffDays(today.date, args.date) > settings.horizonDays) throw new ConvexError(MESSAGES.horizon);
    const endMin = assertStartMin(args.startMin, durationMin);

    // Neradni dan (Mimoza ponedeljkom, godisnji, praznik) ima svoju poruku —
    // gostu nije isto "zatvoreno" i "termin je upravo popunjen".
    if ((await workRangesFor(ctx, args.locationKey, args.date)).length === 0) {
      throw new ConvexError(MESSAGES.closed);
    }

    // Dva istovremena zahteva za isti slot čitaju isti opseg indeksa
    // `by_location_resource_date`, pa serijabilno izvršavanje Convex-a
    // garantuje da kroz kapacitet prođe tačno onoliko koliko ima mesta.
    const free = await slotsFor(ctx, {
      locationKey: args.locationKey,
      resourceKey,
      date: args.date,
      durationMin,
      settings,
      nowMs: now,
    });
    if (!free.includes(args.startMin)) throw new ConvexError(MESSAGES.taken);

    await assertRateLimit(ctx, phone, now);

    // Ulogovan gost: termin se veže za nalog, pa se vidi u „Moji termini" i broji
    // kao plaćena poseta u loyalty ciklusu. Gost bez naloga zakazuje kao i pre.
    const user = await currentUser(ctx);

    const id = await ctx.db.insert("bookings", {
      name,
      phone,
      email,
      serviceKey: service.key,
      serviceTitle: service.title,
      durationMin,
      locationKey: args.locationKey,
      resourceKey,
      date: args.date,
      startMin: args.startMin,
      endMin,
      note,
      status: "nov",
      createdAt: now,
      source: "web",
      customerId: user?._id,
    });

    await ctx.scheduler.runAfter(0, internal.notify.newRequest, {
      name,
      phone,
      serviceTitle: service.title,
      locationName: locationByKey(args.locationKey).fullName,
      date: args.date,
      timeRange: fmtRange(args.startMin, endMin),
      note: note ?? "",
      holdHours: settings.holdHours,
    });

    return { id, locationKey: args.locationKey, resourceKey, startMin: args.startMin, endMin };
  },
});

/* =====================================================================
 * Javno — moji termini
 * ===================================================================== */

/**
 * Istorija termina prijavljenog člana (`/nalog`). Vraćaju se samo svoji termini,
 * i samo polja koja član i sam zna — telefon i imejl se ne šalju nazad.
 * Termini zakazani pre registracije nemaju `customerId` i ovde se ne vide.
 */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await assertSignedIn(ctx);
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(50);
    return rows.map((b) => ({
      _id: b._id,
      serviceTitle: b.serviceTitle,
      locationKey: b.locationKey,
      date: b.date,
      startMin: b.startMin,
      endMin: b.endMin,
      status: b.status,
      createdAt: b.createdAt,
    }));
  },
});

/* =====================================================================
 * Admin
 * ===================================================================== */

/** Termini u opsegu datuma, opciono suženi na status i lokal. */
export const list = query({
  args: {
    key: v.string(),
    from: v.string(),
    to: v.string(),
    status: v.optional(statusValidator),
    locationKey: v.optional(locationKeyValidator),
  },
  returns: v.array(bookingDoc),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.gte("date", args.from).lte("date", args.to))
      .take(1000);
    return rows
      .filter((b) => (args.status ? b.status === args.status : true))
      .filter((b) => (args.locationKey ? b.locationKey === args.locationKey : true))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startMin - b.startMin));
  },
});

/** Zahtevi na čekanju, najbliži termin prvi. */
export const pending = query({
  args: { key: v.string() },
  returns: v.array(bookingDoc),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "nov"))
      .take(200);
    return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startMin - b.startMin));
  },
});

export const pendingCount = query({
  args: { key: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "nov"))
      .take(100);
    return rows.length;
  },
});

const ALLOWED_TRANSITIONS: Record<Doc<"bookings">["status"], Doc<"bookings">["status"][]> = {
  nov: ["potvrdjen", "odbijen", "otkazan"],
  potvrdjen: ["otkazan"],
  otkazan: [],
  odbijen: [],
};

async function setStatus(
  ctx: MutationCtx,
  id: Doc<"bookings">["_id"],
  status: Doc<"bookings">["status"],
): Promise<null> {
  const doc = await ctx.db.get("bookings", id);
  if (!doc) throw new ConvexError(MESSAGES.notFound);
  if (doc.status === status) return null;
  if (!ALLOWED_TRANSITIONS[doc.status].includes(status)) throw new ConvexError(MESSAGES.transition);
  await ctx.db.patch("bookings", id, { status, decidedAt: Date.now() });
  return null;
}

/**
 * Potvrda ne mora ponovo da proverava kapacitet: zahtev na čekanju ga je već
 * zauzeo u trenutku upisa i drži ga sve dok se ne odbije, otkaže ili istekne.
 */
export const confirm = mutation({
  args: { key: v.string(), id: v.id("bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    return await setStatus(ctx, args.id, "potvrdjen");
  },
});

export const reject = mutation({
  args: { key: v.string(), id: v.id("bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    return await setStatus(ctx, args.id, "odbijen");
  },
});

export const cancel = mutation({
  args: { key: v.string(), id: v.id("bookings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    return await setStatus(ctx, args.id, "otkazan");
  },
});

/** Termin dogovoren telefonom ide pravo u kalendar, kao potvrđen. */
export const createManual = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    serviceKey: v.string(),
    locationKey: locationKeyValidator,
    date: v.string(),
    startMin: v.number(),
    durationMin: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  returns: v.id("bookings"),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const name = validateName(args.name);
    const phoneRaw = args.phone?.trim() ?? "";
    const phone = phoneRaw ? validatePhone(phoneRaw) : "";
    const email = validateEmail(args.email);
    const note = validateNote(args.note);

    const service = await getService(ctx, args.serviceKey);
    if (!service) throw new ConvexError(MESSAGES.service);
    const resourceKey = resourceOfGroup(service.groupKey);
    const durationMin = args.durationMin ?? service.durationMin;
    if (!Number.isInteger(durationMin) || durationMin <= 0 || durationMin > MAX_DURATION_MIN) {
      throw new ConvexError(MESSAGES.duration);
    }
    const location = await getLocation(ctx, args.locationKey);
    if (!location) throw new ConvexError(MESSAGES.location);
    if (!isValidDate(args.date)) throw new ConvexError(MESSAGES.dateFormat);
    const endMin = assertStartMin(args.startMin, durationMin);

    // Ručni termin sme van radnog vremena i bez najave, ali nikad preko pauze
    // i nikad preko kapaciteta.
    const free = await hasFreeSeat(ctx, {
      locationKey: args.locationKey,
      resourceKey,
      date: args.date,
      startMin: args.startMin,
      endMin,
    });
    if (!free) throw new ConvexError(MESSAGES.overlap);

    const now = Date.now();
    return await ctx.db.insert("bookings", {
      name,
      phone,
      email,
      serviceKey: service.key,
      serviceTitle: service.title,
      durationMin,
      locationKey: args.locationKey,
      resourceKey,
      date: args.date,
      startMin: args.startMin,
      endMin,
      note,
      status: "potvrdjen",
      createdAt: now,
      decidedAt: now,
      source: "admin",
    });
  },
});

/** Pomeranje termina: drugi datum, drugo vreme, drugi lokal ili drugo trajanje. */
export const move = mutation({
  args: {
    key: v.string(),
    id: v.id("bookings"),
    locationKey: v.optional(locationKeyValidator),
    date: v.optional(v.string()),
    startMin: v.optional(v.number()),
    durationMin: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const doc = await ctx.db.get("bookings", args.id);
    if (!doc) throw new ConvexError(MESSAGES.notFound);
    // Otkazan ili odbijen termin se ne pomera — on vise ne drzi mesto.
    if (!occupies(doc.status)) throw new ConvexError(MESSAGES.transition);

    const locationKey: LocationKey = args.locationKey ?? doc.locationKey;
    const date = args.date ?? doc.date;
    const startMin = args.startMin ?? doc.startMin;
    const durationMin = args.durationMin ?? doc.durationMin;
    if (!isValidDate(date)) throw new ConvexError(MESSAGES.dateFormat);
    if (!Number.isInteger(durationMin) || durationMin <= 0 || durationMin > MAX_DURATION_MIN) {
      throw new ConvexError(MESSAGES.duration);
    }
    const location = await getLocation(ctx, locationKey);
    if (!location) throw new ConvexError(MESSAGES.location);
    const endMin = assertStartMin(startMin, durationMin);

    // Termin koji se pomera ne sme da blokira sam sebe.
    const free = await hasFreeSeat(ctx, {
      locationKey,
      resourceKey: doc.resourceKey,
      date,
      startMin,
      endMin,
      excludeId: doc._id,
    });
    if (!free) throw new ConvexError(MESSAGES.overlap);

    await ctx.db.patch("bookings", args.id, { locationKey, date, startMin, endMin, durationMin });
    return null;
  },
});

/** Cron: zahtevi na čekanju stariji od `holdHours` postaju „otkazan" uz napomenu „isteklo". */
export const expirePending = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const settings = await getSettings(ctx);
    const cutoff = Date.now() - settings.holdHours * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "nov"))
      .take(MAX_BOOKINGS_PER_DAY);
    let n = 0;
    for (const b of rows) {
      if (b.createdAt >= cutoff) continue;
      const note = b.note ? `${b.note} · isteklo` : "isteklo";
      await ctx.db.patch("bookings", b._id, { status: "otkazan", note, decidedAt: Date.now() });
      n++;
    }
    return n;
  },
});

/**
 * Čišćenje test-zahteva (smoke test na produkciji, e2e):
 *   npx convex run bookings:purgeByPhone '{"phone":"0600000000"}' [--prod]
 */
export const purgeByPhone = internalMutation({
  args: { phone: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    // Prazan broj bi pogodio ručne termine bez telefona (phone: "") — nikad.
    if (!phone) return 0;
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .take(100);
    for (const b of rows) await ctx.db.delete("bookings", b._id);
    return rows.length;
  },
});
