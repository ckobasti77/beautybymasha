import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertAdminKey } from "./lib/admin";
import {
  DEFAULT_CAPACITY,
  DEFAULT_SETTINGS,
  DEFAULT_WEEK_BY_LOCATION,
  getSettings,
  isSeeded,
} from "./lib/availability";
import { RESOURCE_KEYS, site } from "../lib/site";
import { services as catalog } from "../lib/services";

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
    assertAdminKey(args.key);
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
    assertAdminKey(args.key);
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
