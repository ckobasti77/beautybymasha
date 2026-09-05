/**
 * Idempotentno punjenje baze iz `data/*.json`.
 *
 * Ova dva posla rade i `admin.init` / `admin.seedShop` (kroz panel, uz ključ) i
 * `seedDemo.run` (iz komandne linije, bez ključa). Logika stoji ovde da ne bi
 * postojala u dve verzije koje se razilaze.
 *
 * Pravilo je isto na oba mesta: uparuje se po ključu (`key`, `sku`) i ništa što
 * je vlasnica već promenila u adminu se ne pregazi.
 */
import type { MutationCtx } from "../_generated/server";
import { RESOURCE_KEYS, site } from "../../lib/site";
import { services as catalog } from "../../lib/services";
import { productCategories as productCategoryCatalog, products as productCatalog } from "../../lib/products";
import { DEFAULT_CAPACITY, DEFAULT_SETTINGS, DEFAULT_WEEK_BY_LOCATION } from "./availability";

export type CoreSeedResult = {
  locations: number;
  capacities: number;
  schedules: number;
  services: number;
  settings: boolean;
};

export async function seedCore(ctx: MutationCtx): Promise<CoreSeedResult> {
  const result: CoreSeedResult = {
    locations: 0,
    capacities: 0,
    schedules: 0,
    services: 0,
    settings: false,
  };

  const existingLocations = await ctx.db.query("locations").take(10);
  const byKey = new Map(existingLocations.map((l) => [l.key, l]));
  for (const [index, l] of site.locations.entries()) {
    const existing = byKey.get(l.key);
    if (!existing) {
      await ctx.db.insert("locations", { key: l.key, name: l.name, active: true, order: index });
      result.locations++;
      continue;
    }
    // Naziv lokala se ne menja u panelu (tamo se pali i gasi, ne preimenuje), pa je
    // data/site.json jedini izvor — bez ovoga bi ispravka slova ostala samo na sajtu,
    // a panel bi mesecima pisao staro ime.
    if (existing.name !== l.name) {
      await ctx.db.patch(existing._id, { name: l.name });
      result.locations++;
    }
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
}

export type ShopSeedResult = { categories: number; products: number };

export async function seedShopCore(ctx: MutationCtx): Promise<ShopSeedResult> {
  const result: ShopSeedResult = { categories: 0, products: 0 };

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
}
