/**
 * Jezgro dostupnosti. Iz baze razrešava radno vreme lokala, kapacitet resursa,
 * pauze i postojeće termine, pa ih prosleđuje čistoj `buildDaySlots` iz lib/slots.ts.
 *
 * Koriste ga i upiti (čitanje) i mutacije `bookings.create` / `createManual` /
 * `move` — ponovna provera unutar transakcije je ono što čini prekoračenje
 * kapaciteta nemogućim.
 *
 * Pravilo (spec): slot [start, start+duration) je slobodan za (lokacija, resurs) akko
 *   1. ceo interval je unutar radnog vremena tog lokala za taj datum,
 *   2. ne preklapa se ni sa jednom pauzom tog lokala i resursa,
 *   3. broj postojećih „nov"/„potvrdjen" termina koji se preklapaju je < kapaciteta,
 *   4. start >= now + leadTimeMin,
 *   5. datum <= today + horizonDays.
 */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { serviceGroupByKey, type ServiceGroupKey } from "../../lib/services";
import { site, type LocationKey, type ResourceKey } from "../../lib/site";
import type { ShopConfig } from "../../lib/shop";
import {
  type Range,
  belgradeNow,
  buildDaySlots,
  diffDays,
  hasCapacity,
  minStartFor,
  overlaps,
  toMin,
  weekdayOf,
} from "../../lib/slots";

export type Ctx = QueryCtx | MutationCtx;

/**
 * Podrazumevana poruka uz potvrdu termina. Vlasnica je menja u „Podešavanjima";
 * vitičaste zagrade se zamenjuju podacima termina pre slanja.
 */
export const DEFAULT_CONFIRM_MESSAGE =
  "Zdravo {ime}, termin je potvrđen: {usluga}, {datum} u {vreme}, {lokal}. Vidimo se!";

/** Podrazumevana podešavanja — iz data/site.json, ne izmišljena. */
export const DEFAULT_SETTINGS = {
  slotStepMin: site.booking.slotStepMin,
  leadTimeMin: site.booking.leadTimeMin,
  horizonDays: site.booking.horizonDays,
  holdHours: site.booking.holdHours,
  shippingFlatRsd: site.shipping.flatRsd,
  shippingFreeOverRsd: site.shipping.freeOverRsd,
  loyaltyPercent: site.loyalty.discountPercent,
  confirmMessage: DEFAULT_CONFIRM_MESSAGE,
} as const;

export type Settings = {
  slotStepMin: number;
  leadTimeMin: number;
  horizonDays: number;
  holdHours: number;
  hoursConfirmed: boolean;
  shippingFlatRsd: number;
  shippingFreeOverRsd: number;
  loyaltyPercent: number;
  confirmMessage: string;
};

function byLocation<T>(pick: (location: (typeof site.locations)[number]) => T): Record<LocationKey, T> {
  const out = {} as Record<LocationKey, T>;
  for (const l of site.locations) out[l.key] = pick(l);
  return out;
}

/** Nedeljno radno vreme oba lokala iz data/site.json — polazna vrednost za seed. */
export const DEFAULT_WEEK_BY_LOCATION: Readonly<Record<LocationKey, readonly (readonly Range[])[]>> = byLocation(
  (l) => l.workWeek.map((day) => day.map((r) => ({ startMin: toMin(r.start), endMin: toMin(r.end) }))),
);

/** Podrazumevani kapaciteti iz data/site.json. [POTVRDITI kod vlasnice] — vidi capacityNote. */
export const DEFAULT_CAPACITY: Readonly<Record<LocationKey, Readonly<Record<ResourceKey, number>>>> = byLocation(
  (l) => l.capacity,
);

export const MAX_SCHEDULE_ROWS = 20;
export const MAX_BLOCKS_PER_DAY = 100;
export const MAX_BOOKINGS_PER_DAY = 500;
export const MAX_SERVICES = 400;

export async function getSettings(ctx: Ctx): Promise<Settings> {
  const doc = await ctx.db.query("settings").first();
  if (!doc) return { ...DEFAULT_SETTINGS, hoursConfirmed: false };
  // Polja dodata u koraku 06 fale u starijem dokumentu — tada važi data/site.json.
  return {
    slotStepMin: doc.slotStepMin,
    leadTimeMin: doc.leadTimeMin,
    horizonDays: doc.horizonDays,
    holdHours: doc.holdHours,
    hoursConfirmed: doc.hoursConfirmed ?? false,
    shippingFlatRsd: doc.shippingFlatRsd ?? DEFAULT_SETTINGS.shippingFlatRsd,
    shippingFreeOverRsd: doc.shippingFreeOverRsd ?? DEFAULT_SETTINGS.shippingFreeOverRsd,
    loyaltyPercent: doc.loyaltyPercent ?? DEFAULT_SETTINGS.loyaltyPercent,
    confirmMessage: doc.confirmMessage ?? DEFAULT_SETTINGS.confirmMessage,
  };
}

/** Podešavanja shopa u obliku koji `lib/shop.ts` očekuje. */
export async function getShopConfig(ctx: Ctx): Promise<ShopConfig> {
  const s = await getSettings(ctx);
  return {
    shippingFlatRsd: s.shippingFlatRsd,
    shippingFreeOverRsd: s.shippingFreeOverRsd,
    loyaltyPercent: s.loyaltyPercent,
  };
}

/** true kad je `admin.init` prošao (postoje lokali). */
export async function isSeeded(ctx: Ctx): Promise<boolean> {
  return (await ctx.db.query("locations").first()) !== null;
}

export async function getLocation(ctx: Ctx, locationKey: LocationKey): Promise<Doc<"locations"> | null> {
  return await ctx.db
    .query("locations")
    .withIndex("by_key", (q) => q.eq("key", locationKey))
    .first();
}

export async function activeLocationKeys(ctx: Ctx): Promise<LocationKey[]> {
  const rows = await ctx.db.query("locations").take(10);
  return rows
    .filter((r) => r.active)
    .sort((a, b) => a.order - b.order)
    .map((r) => r.key);
}

/** Resurs koji usluga zauzima — preko svoje grupe (data/services.json → groups[].resource). */
export function resourceOfGroup(groupKey: ServiceGroupKey): ResourceKey {
  return serviceGroupByKey(groupKey).resource;
}

export async function getService(ctx: Ctx, serviceKey: string): Promise<Doc<"services"> | null> {
  return await ctx.db
    .query("services")
    .withIndex("by_key", (q) => q.eq("key", serviceKey))
    .first();
}

/**
 * Koliko ljudi istovremeno radi taj resurs u tom lokalu.
 * Bez reda u bazi vraća 0 — pre `admin.init` se ne nudi nijedan termin.
 * Fail-closed je jedini bezbedan smer: bolje nijedan slot nego dupli termin.
 */
export async function capacityFor(ctx: Ctx, locationKey: LocationKey, resourceKey: ResourceKey): Promise<number> {
  const rows = await ctx.db
    .query("capacities")
    .withIndex("by_location", (q) => q.eq("locationKey", locationKey))
    .take(10);
  const row = rows.find((r) => r.resourceKey === resourceKey);
  return row?.count ?? 0;
}

/** Radno vreme lokala za datum: izuzetak ima prednost nad nedeljnim rasporedom. */
export async function workRangesFor(ctx: Ctx, locationKey: LocationKey, date: string): Promise<Range[]> {
  const override = await ctx.db
    .query("scheduleOverrides")
    .withIndex("by_location_date", (q) => q.eq("locationKey", locationKey).eq("date", date))
    .first();
  if (override) {
    if (override.kind === "off") return [];
    if (override.startMin === undefined || override.endMin === undefined) return [];
    return [{ startMin: override.startMin, endMin: override.endMin }];
  }
  const weekday = weekdayOf(date);
  const rows = await ctx.db
    .query("schedules")
    .withIndex("by_location_weekday", (q) => q.eq("locationKey", locationKey).eq("weekday", weekday))
    .take(MAX_SCHEDULE_ROWS);
  return rows.map((r) => ({ startMin: r.startMin, endMin: r.endMin }));
}

/** Pauze jednog resursa u jednom lokalu tog dana. */
export async function blockedRangesFor(
  ctx: Ctx,
  locationKey: LocationKey,
  resourceKey: ResourceKey,
  date: string,
): Promise<Range[]> {
  const rows = await ctx.db
    .query("blocks")
    .withIndex("by_location_date", (q) => q.eq("locationKey", locationKey).eq("date", date))
    .take(MAX_BLOCKS_PER_DAY);
  return rows
    .filter((b) => b.resourceKey === resourceKey)
    .map((b) => ({ startMin: b.startMin, endMin: b.endMin }));
}

/** Termini koji zauzimaju mesto: samo „nov" i „potvrdjen". Otkazani i odbijeni ne broje. */
export function occupies(status: Doc<"bookings">["status"]): boolean {
  return status === "nov" || status === "potvrdjen";
}

/**
 * Zauzeti opsezi jednog resursa u jednom lokalu tog dana — JEDAN red po terminu.
 * Ne spajaju se: broj redova preko slota je upravo ono što se poredi sa kapacitetom.
 */
export async function busyRangesFor(
  ctx: Ctx,
  locationKey: LocationKey,
  resourceKey: ResourceKey,
  date: string,
  excludeId?: Id<"bookings">,
): Promise<Range[]> {
  const rows = await ctx.db
    .query("bookings")
    .withIndex("by_location_resource_date", (q) =>
      q.eq("locationKey", locationKey).eq("resourceKey", resourceKey).eq("date", date),
    )
    .take(MAX_BOOKINGS_PER_DAY);
  return rows
    .filter((b) => occupies(b.status) && b._id !== excludeId)
    .map((b) => ({ startMin: b.startMin, endMin: b.endMin }));
}

export type SlotsForArgs = {
  locationKey: LocationKey;
  resourceKey: ResourceKey;
  date: string;
  durationMin: number;
  settings: Settings;
  /** Sat u ms — prosleđuje pozivalac (klijent za upite, Date.now() u mutacijama). */
  nowMs: number;
};

/** Slobodni počeci (minuti od ponoći) za jedan lokal, jedan resurs i jedan datum. */
export async function slotsFor(
  ctx: Ctx,
  { locationKey, resourceKey, date, durationMin, settings, nowMs }: SlotsForArgs,
): Promise<number[]> {
  const now = belgradeNow(nowMs);
  const minStartMin = minStartFor(now, date, settings.leadTimeMin);
  if (minStartMin === null) return [];
  if (diffDays(now.date, date) > settings.horizonDays) return [];
  const capacity = await capacityFor(ctx, locationKey, resourceKey);
  if (capacity <= 0) return [];
  const workRanges = await workRangesFor(ctx, locationKey, date);
  if (workRanges.length === 0) return [];
  return buildDaySlots({
    workRanges,
    blockedRanges: await blockedRangesFor(ctx, locationKey, resourceKey, date),
    busyRanges: await busyRangesFor(ctx, locationKey, resourceKey, date),
    capacity,
    durationMin,
    stepMin: settings.slotStepMin,
    minStartMin,
  });
}

export type SlotCheck = {
  locationKey: LocationKey;
  resourceKey: ResourceKey;
  date: string;
  startMin: number;
  endMin: number;
  /** Termin koji se pomera — ne sme da blokira sam sebe. */
  excludeId?: Id<"bookings">;
};

/**
 * Ima li mesta u [startMin, endMin) — bez obzira na radno vreme i najavu.
 * Koriste je ručni upis i pomeranje termina: vlasnica sme van radnog vremena,
 * ali nikad preko pauze i nikad preko kapaciteta.
 */
export async function hasFreeSeat(ctx: Ctx, check: SlotCheck): Promise<boolean> {
  const { locationKey, resourceKey, date, startMin, endMin, excludeId } = check;
  const slot = { startMin, endMin };
  const blocked = await blockedRangesFor(ctx, locationKey, resourceKey, date);
  if (blocked.some((b) => overlaps(slot, b))) return false;
  const capacity = await capacityFor(ctx, locationKey, resourceKey);
  const busy = await busyRangesFor(ctx, locationKey, resourceKey, date, excludeId);
  return hasCapacity(busy, slot, capacity);
}
