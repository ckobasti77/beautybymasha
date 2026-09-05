import { defineSchema, defineTable } from "convex/server";
import { type Infer, v } from "convex/values";
import type { LocationKey, ResourceKey } from "../lib/site";
import type { ServiceGroupKey } from "../lib/services";

/**
 * Model: lokacija × resurs × kapacitet.
 *
 * Lokacija = jedan od dva lokala u Belvilleu (različito radno vreme).
 * Resurs = grupa mesta koja rade paralelno („nokti", „kozmetika", „masaza").
 * Kapacitet = koliko ljudi istovremeno radi taj resurs u tom lokalu.
 *
 * Zato termin u masaži ne dodiruje termin u noktima, a tri manikira u 10:00
 * prolaze kad je kapacitet noktiju 3.
 */
export const locationKeyValidator = v.union(v.literal("ljubicica"), v.literal("mimoza"));

export const resourceKeyValidator = v.union(v.literal("nokti"), v.literal("kozmetika"), v.literal("masaza"));

export const serviceGroupKeyValidator = v.union(
  v.literal("nega-ruku"),
  v.literal("nega-nogu"),
  v.literal("depilacija-vosak-z"),
  v.literal("depilacija-vosak-m"),
  v.literal("depilacija-pasta-z"),
  v.literal("depilacija-pasta-m"),
  v.literal("masaza"),
  v.literal("trepavice-obrve"),
  v.literal("ostalo"),
);

/**
 * Validatori iznad moraju da se poklapaju sa tipovima iz lib/site.ts i
 * lib/services.ts. Ako se lista tamo promeni, ova tri tipa obore `tsc`.
 */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;
export type LocationKeysMatch = Expect<Same<LocationKey, Infer<typeof locationKeyValidator>>>;
export type ResourceKeysMatch = Expect<Same<ResourceKey, Infer<typeof resourceKeyValidator>>>;
export type ServiceGroupKeysMatch = Expect<Same<ServiceGroupKey, Infer<typeof serviceGroupKeyValidator>>>;

export const statusValidator = v.union(
  v.literal("nov"),
  v.literal("potvrdjen"),
  v.literal("otkazan"),
  v.literal("odbijen"),
);
export const sourceValidator = v.union(v.literal("web"), v.literal("admin"));
export const overrideKindValidator = v.union(v.literal("off"), v.literal("custom"));

export const rangeValidator = v.object({ startMin: v.number(), endMin: v.number() });

export default defineSchema({
  locations: defineTable({
    key: locationKeyValidator,
    name: v.string(),
    active: v.boolean(),
    order: v.number(),
  }).index("by_key", ["key"]),

  /** Koliko ljudi istovremeno radi jedan resurs u jednom lokalu. */
  capacities: defineTable({
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    count: v.number(),
  }).index("by_location", ["locationKey"]),

  /** Nedeljno radno vreme lokala. Više redova za isti dan = podeljena smena. */
  schedules: defineTable({
    locationKey: locationKeyValidator,
    /** 0 = nedelja … 6 = subota */
    weekday: v.number(),
    startMin: v.number(),
    endMin: v.number(),
  }).index("by_location_weekday", ["locationKey", "weekday"]),

  /** Izuzetak za datum: neradni dan ili posebno radno vreme. Ima prednost nad `schedules`. */
  scheduleOverrides: defineTable({
    locationKey: locationKeyValidator,
    /** YYYY-MM-DD */
    date: v.string(),
    kind: overrideKindValidator,
    startMin: v.optional(v.number()),
    endMin: v.optional(v.number()),
    note: v.optional(v.string()),
  })
    .index("by_location_date", ["locationKey", "date"])
    .index("by_date", ["date"]),

  /** Pauze / blokirano vreme jednog resursa u jednom lokalu. Gase termin bez obzira na kapacitet. */
  blocks: defineTable({
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    date: v.string(),
    startMin: v.number(),
    endMin: v.number(),
    reason: v.optional(v.string()),
  }).index("by_location_date", ["locationKey", "date"]),

  /**
   * Ceo katalog usluga živi u bazi, ne u kodu: 144 stavke koje vlasnica sama
   * dodaje i menja kroz admin. `priceRsd: null` = stavka bez cene ([POTVRDITI]).
   * Cene su verbatim iz cenovnika; trajanja su procena i menjaju se u adminu.
   */
  services: defineTable({
    key: v.string(),
    groupKey: serviceGroupKeyValidator,
    title: v.string(),
    durationMin: v.number(),
    priceRsd: v.union(v.number(), v.null()),
    /** Može li gost sam da zakaže (dodaci i paketi ne mogu). */
    bookable: v.boolean(),
    /** Dodatak uz glavnu uslugu (french, nail art…). */
    addon: v.boolean(),
    /** Sklonjena sa sajta; admin je i dalje može ručno upisati. */
    hidden: v.boolean(),
    order: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_group", ["groupKey"]),

  bookings: defineTable({
    name: v.string(),
    /** Normalizovan broj (bez razmaka/crtica); prazan string za ručne termine bez telefona. */
    phone: v.string(),
    email: v.optional(v.string()),
    serviceKey: v.string(),
    /** Naslov usluge u trenutku zahteva — istorija ostaje čitljiva i kad se katalog promeni. */
    serviceTitle: v.string(),
    durationMin: v.number(),
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    /** YYYY-MM-DD */
    date: v.string(),
    startMin: v.number(),
    endMin: v.number(),
    note: v.optional(v.string()),
    status: statusValidator,
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
    source: sourceValidator,
    /** Loyalty član koji je zakazao; prazno za goste. Popunjava ga prompt 3 (Convex Auth). */
    customerId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_phone", ["phone"])
    .index("by_location_date", ["locationKey", "date"])
    .index("by_date", ["date"])
    .index("by_createdAt", ["createdAt"])
    // Ovaj indeks nosi proveru kapaciteta: sva zauzeća jednog resursa,
    // u jednom lokalu, jednog dana — u jednom čitanju.
    .index("by_location_resource_date", ["locationKey", "resourceKey", "date"]),

  /** Jedan dokument. */
  settings: defineTable({
    slotStepMin: v.number(),
    leadTimeMin: v.number(),
    horizonDays: v.number(),
    holdHours: v.number(),
    /** Postavlja se kad vlasnica prvi put sačuva radno vreme (skriva baner „Podesi radno vreme"). */
    hoursConfirmed: v.optional(v.boolean()),
  }),
});
