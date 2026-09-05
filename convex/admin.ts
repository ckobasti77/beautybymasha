import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertAdmin } from "./lib/admin";
import {
  DEFAULT_CAPACITY,
  DEFAULT_SETTINGS,
  DEFAULT_WEEK_BY_LOCATION,
  getSettings,
  isSeeded,
} from "./lib/availability";
import { RESOURCE_KEYS, site } from "../lib/site";
import { services as catalog } from "../lib/services";
import { productCategories as productCategoryCatalog, products as productCatalog } from "../lib/products";

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
    const result = { locations: 0, capacities: 0, schedules: 0, services: 0, settings: false };

    const existingLocations = await ctx.db.query("locations").take(10);
    const locationKeys = new Set(existingLocations.map((l) => l.key));
    for (const [index, l] of site.locations.entries()) {
      if (locationKeys.has(l.key)) continue;
      await ctx.db.insert("locations", { key: l.key, name: l.name, active: true, order: index });
      result.locations++;
    }

    for (const l of site.locations) {
      const rows = await ctx.db
        .query("capacities")
        .withIndex("by_location", (q) => q.eq("locationKey", l.key))
        .take(10);
      for (const resourceKey of RESOURCE_KEYS) {
        if (rows.some((r) => r.resourceKey === resourceKey)) continue;
        await ctx.db.insert("capacities", {
          locationKey: l.key,
          resourceKey,
          count: DEFAULT_CAPACITY[l.key][resourceKey],
        });
        result.capacities++;
      }
    }

    // Po lokalu, ne „sve ili ništa": ako je vlasnica već podesila Ljubičicu,
    // seed joj ne dira raspored, a Mimozi upiše podrazumevani.
    for (const l of site.locations) {
      const any = await ctx.db
        .query("schedules")
        .withIndex("by_location_weekday", (q) => q.eq("locationKey", l.key))
        .first();
      if (any) continue;
      for (let weekday = 0; weekday < 7; weekday++) {
        for (const r of DEFAULT_WEEK_BY_LOCATION[l.key][weekday]) {
          await ctx.db.insert("schedules", {
            locationKey: l.key,
            weekday,
            startMin: r.startMin,
            endMin: r.endMin,
          });
          result.schedules++;
        }
      }
    }

    const existingServices = await ctx.db.query("services").take(500);
    const serviceKeys = new Set(existingServices.map((s) => s.key));
    for (const [index, s] of catalog.entries()) {
      if (serviceKeys.has(s.key)) continue;
      await ctx.db.insert("services", {
        key: s.key,
        groupKey: s.group,
        title: s.title,
        durationMin: s.durationMin,
        priceRsd: s.priceRsd,
        bookable: s.bookable,
        addon: s.addon === true,
        hidden: false,
        order: index,
      });
      result.services++;
    }

    const settings = await ctx.db.query("settings").first();
    if (!settings) {
      await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, hoursConfirmed: false });
      result.settings = true;
    }

    return result;
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
    const result = { categories: 0, products: 0 };

    const existingCategories = await ctx.db.query("productCategories").take(50);
    const categoryKeys = new Set(existingCategories.map((c) => c.key));
    for (const c of productCategoryCatalog) {
      if (categoryKeys.has(c.key)) continue;
      await ctx.db.insert("productCategories", { key: c.key, title: c.title, order: c.order });
      result.categories++;
    }

    const existingProducts = await ctx.db.query("products").take(1000);
    const skus = new Set(existingProducts.map((p) => p.sku));
    for (const [index, p] of productCatalog.entries()) {
      if (skus.has(p.sku)) continue;
      await ctx.db.insert("products", {
        slug: p.slug,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        categoryKey: p.category,
        priceRsd: p.priceRsd,
        discountPercent: 0,
        hex: p.hex,
        finish: p.finish,
        family: p.family,
        description: p.description,
        swatchOnly: p.swatchOnly,
        imagePath: p.localAvif,
        storageImageIds: [],
        stock: p.stock,
        bestseller: p.bestseller,
        active: true,
        order: index,
      });
      result.products++;
    }

    return result;
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
