import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertAdmin, assertStaff, currentUser } from "./lib/admin";
import { belgradeNow } from "../lib/slots";
import { roleValidator } from "./schema";
import { getSettings, isSeeded } from "./lib/availability";
import { seedCore, seedShopCore } from "./lib/seed";

/**
 * Ko sam ja i šta smem da vidim. Nikad ne puca — gost dobija `role: null`, pa
 * panel ume da ga pošalje na prijavu umesto da prikaže grešku.
 *
 * `keyWorks` je tačno onaj rezervni put iz convex/lib/admin.ts: važi samo dok u
 * bazi nema nijednog admin naloga.
 */
export const me = query({
  args: { key: v.optional(v.string()) },
  returns: v.object({
    signedIn: v.boolean(),
    role: v.union(roleValidator, v.null()),
    name: v.union(v.string(), v.null()),
    email: v.union(v.string(), v.null()),
    canOpenPanel: v.boolean(),
    isAdmin: v.boolean(),
    keyWorks: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    const adminExists =
      (await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .first()) !== null;

    const adminKey = process.env.ADMIN_KEY;
    const keyWorks = !adminExists && !!adminKey && args.key === adminKey;
    const role = user?.role ?? null;
    const isAdmin = role === "admin" || keyWorks;

    return {
      signedIn: user !== null,
      role,
      name: user?.name ?? null,
      email: user?.email ?? null,
      canOpenPanel: isAdmin || role === "staff",
      isAdmin,
      keyWorks,
    };
  },
});

/** Da li je baza inicijalizovana i da li vlasnica tek treba da potvrdi radno vreme. */
export const status = query({
  args: { key: v.string() },
  returns: v.object({
    seeded: v.boolean(),
    hoursConfirmed: v.boolean(),
    locations: v.number(),
    services: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const settings = await getSettings(ctx);
    const locations = await ctx.db.query("locations").take(10);
    const services = await ctx.db.query("services").take(500);
    return {
      seeded: await isSeeded(ctx),
      hoursConfirmed: settings.hoursConfirmed,
      locations: locations.length,
      services: services.length,
    };
  },
});

/**
 * Idempotentni seed iz data/*.json: lokali, kapaciteti, nedeljno radno vreme,
 * ceo cenovnik i podešavanja.
 *
 * Sme da se pozove koliko god puta: sve se dodaje po ključu i ništa što je
 * vlasnica već promenila u adminu se ne pregazi. Nova usluga u data/services.json
 * uđe pri sledećem pozivu; postojeća ostane onakva kakvom ju je ona ostavila.
 */
export const init = mutation({
  args: { key: v.string() },
  returns: v.object({
    locations: v.number(),
    capacities: v.number(),
    schedules: v.number(),
    services: v.number(),
    settings: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    return await seedCore(ctx);
  },
});

/**
 * Idempotentan seed webshopa iz data/products.json: 4 kategorije i 70 proizvoda.
 *
 * Isto pravilo kao `init`: uparuje se po `sku` i ništa što je vlasnica već
 * promenila u adminu se ne pregazi. Nov proizvod u JSON-u uđe pri sledećem
 * pozivu; postojeći ostane onakav kakvim ga je ona ostavila — uključujući
 * stanje, cenu i popust.
 */
export const seedShop = mutation({
  args: { key: v.optional(v.string()) },
  returns: v.object({ categories: v.number(), products: v.number() }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    return await seedShopCore(ctx);
  },
});

/**
 * Brisanje probnog naloga po imejlu — nalog, njegove auth zapise i njegovu
 * loyalty istoriju. Nije izloženo klijentu; poziva se ručno posle testiranja
 * registracije kroz sajt:
 *   npx convex run admin:purgeUserByEmail '{"email":"test@primer.rs"}'
 *
 * Porudžbine i termini se NE brišu — oni su poslovni podaci; ostaju bez veze
 * sa nalogom, kao da su poručeni bez prijave.
 */
export const purgeUserByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) return 0;

    for (const table of ["authAccounts", "authSessions"] as const) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        if (row.userId === user._id) await ctx.db.delete(row._id);
      }
    }
    const redemptions = await ctx.db
      .query("loyaltyRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const r of redemptions) await ctx.db.delete(r._id);

    await ctx.db.delete(user._id);
    return 1;
  },
});

/**
 * Prvi ekran: sve što joj treba dok otključava telefon, u jednom čitanju.
 *
 * Promet dana je namerno dvodelan: usluge su zbir cena potvrđenih termina tog
 * dana (procena — cena usluge iz cenovnika), shop je zbir robe u porudžbinama
 * napravljenim tog dana bez otkazanih. Poštarina se ne broji u promet.
 */
export const today = query({
  args: { key: v.optional(v.string()), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    const date = args.date ?? belgradeNow().date;

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("date", date))
      .take(500);

    const pending = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "nov"))
      .take(200);

    const services = await ctx.db.query("services").take(500);
    const priceOf = new Map(services.map((s) => [s.key, s.priceRsd ?? 0]));

    const confirmed = bookings.filter((b) => b.status === "potvrdjen");
    const servicesRevenueRsd = confirmed.reduce((sum, b) => sum + (priceOf.get(b.serviceKey) ?? 0), 0);

    // Granice dana po beogradskom vremenu — porudžbine se broje po `createdAt`.
    const dayStartMs = new Date(`${date}T00:00:00+02:00`).getTime();
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
    const recentOrders = await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(200);
    const todaysOrders = recentOrders.filter(
      (o) => o.createdAt >= dayStartMs && o.createdAt < dayEndMs && o.status !== "otkazana",
    );
    const shopRevenueRsd = todaysOrders.reduce((sum, o) => sum + o.subtotalRsd - o.loyaltyDiscountRsd, 0);
    const newOrders = recentOrders.filter((o) => o.status === "nova").length;

    return {
      date,
      bookings: bookings
        .filter((b) => b.status === "nov" || b.status === "potvrdjen")
        .sort((a, b) => a.startMin - b.startMin),
      counts: {
        today: confirmed.length,
        pending: pending.length,
        newOrders,
      },
      revenue: {
        servicesRsd: servicesRevenueRsd,
        shopRsd: shopRevenueRsd,
        totalRsd: servicesRevenueRsd + shopRevenueRsd,
      },
    };
  },
});

/** Bedževi u navigaciji — jedan upit umesto dva, i ne puca za radnicu. */
export const badges = query({
  args: { key: v.optional(v.string()) },
  returns: v.object({ pending: v.number(), newOrders: v.number(), newMessages: v.number() }),
  handler: async (ctx, args) => {
    const user = await assertStaff(ctx, args.key);
    const pending = (
      await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", "nov"))
        .take(200)
    ).length;

    // Radnica ne vidi porudžbine ni poruke, pa im ni bedž ne treba.
    if (user !== null && user.role === "staff") return { pending, newOrders: 0, newMessages: 0 };

    const newOrders = (
      await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", "nova"))
        .take(200)
    ).length;
    const newMessages = (
      await ctx.db
        .query("inquiries")
        .withIndex("by_status", (q) => q.eq("status", "nova"))
        .take(200)
    ).length;
    return { pending, newOrders, newMessages };
  },
});
