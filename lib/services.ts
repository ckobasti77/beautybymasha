/**
 * Cenovnik iz data/services.json, tipovan i validiran pri učitavanju.
 * BEZ React importa i BEZ `@/` aliasa — uvozi ga i Convex backend (prompt 2).
 *
 * Cene su VERBATIM iz njenog cenovnika i ne menjaju se u kodu.
 * Trajanja su procena i menjaju se samo kroz admin.
 */
import raw from "../data/services.json";
import { assert, assertUnique, oneOf } from "./data-guard";
import { RESOURCE_KEYS, type ResourceKey } from "./site";

export const SERVICE_GROUP_KEYS = [
  "nega-ruku",
  "nega-nogu",
  "depilacija-vosak-z",
  "depilacija-vosak-m",
  "depilacija-pasta-z",
  "depilacija-pasta-m",
  "masaza",
  "trepavice-obrve",
  "ostalo",
] as const;
export type ServiceGroupKey = (typeof SERVICE_GROUP_KEYS)[number];

export type ServiceGroup = {
  readonly key: ServiceGroupKey;
  readonly title: string;
  readonly resource: ResourceKey;
  readonly order: number;
};

export type Service = {
  readonly key: string;
  readonly group: ServiceGroupKey;
  readonly title: string;
  /** Procena — menja se samo u adminu. */
  readonly durationMin: number;
  /** Verbatim iz cenovnika. `null` = stavka bez cene ([POTVRDITI]). */
  readonly priceRsd: number | null;
  /** Može li klijent da zakaže samostalno (dodaci i paketi ne mogu). */
  readonly bookable: boolean;
  readonly addon?: boolean;
  readonly package?: boolean;
  readonly sessions?: number;
  readonly note?: string;
};

type RawService = (typeof raw.services)[number] & {
  addon?: boolean;
  package?: boolean;
  sessions?: number;
  note?: string;
};

function parseGroup(g: (typeof raw.groups)[number]): ServiceGroup {
  return {
    key: oneOf(g.key, SERVICE_GROUP_KEYS, "group.key"),
    title: g.title,
    resource: oneOf(g.resource, RESOURCE_KEYS, `group ${g.key}.resource`),
    order: g.order,
  };
}

function parseService(s: RawService, groups: readonly ServiceGroup[]): Service {
  const group = oneOf(s.group, SERVICE_GROUP_KEYS, `service ${s.key}.group`);
  assert(groups.some((g) => g.key === group), `service ${s.key}: grupa "${group}" ne postoji`);
  assert(
    Number.isInteger(s.durationMin) && s.durationMin > 0,
    `service ${s.key}: durationMin mora biti ceo broj > 0`,
  );
  assert(
    s.priceRsd === null || (Number.isInteger(s.priceRsd) && s.priceRsd >= 0),
    `service ${s.key}: priceRsd mora biti ceo broj ili null`,
  );
  assert(!(s.bookable && s.priceRsd === null), `service ${s.key}: bookable bez cene`);
  return {
    key: s.key,
    group,
    title: s.title,
    durationMin: s.durationMin,
    priceRsd: s.priceRsd,
    bookable: s.bookable,
    addon: s.addon,
    package: s.package,
    sessions: s.sessions,
    note: s.note,
  };
}

const groups = raw.groups.map(parseGroup).sort((a, b) => a.order - b.order);
assertUnique(groups, (g) => g.key, "groups");
assert(groups.length === SERVICE_GROUP_KEYS.length, "services.json: nedostaje grupa");

const all = (raw.services as RawService[]).map((s) => parseService(s, groups));
assertUnique(all, (s) => s.key, "services");

export const serviceGroups: readonly ServiceGroup[] = groups;
export const services: readonly Service[] = all;

/** Usluge koje klijent može sam da zakaže (imaju cenu, nisu dodaci ni paketi). */
export const bookableServices: readonly Service[] = all.filter((s) => s.bookable && s.priceRsd !== null);
/** Dodaci uz glavnu uslugu (french, nail art…) — biraju se u salonu ili uz termin. */
export const addonServices: readonly Service[] = all.filter((s) => s.addon === true);
/** Stavke bez cene — postoje na Instagramu, nisu u cenovniku. [POTVRDITI] */
export const unpricedServices: readonly Service[] = all.filter((s) => s.priceRsd === null);

export function serviceByKey(key: string): Service | undefined {
  return all.find((s) => s.key === key);
}

export function servicesByGroup(groupKey: ServiceGroupKey): readonly Service[] {
  return all.filter((s) => s.group === groupKey);
}

export function serviceGroupByKey(groupKey: ServiceGroupKey): ServiceGroup {
  const g = groups.find((x) => x.key === groupKey);
  assert(g, `Nepoznata grupa "${groupKey}"`);
  return g;
}

/** Resurs (nokti / kozmetika / masaža) koji usluga zauzima — preko njene grupe. */
export function resourceOfService(key: string): ResourceKey | undefined {
  const s = serviceByKey(key);
  return s ? serviceGroupByKey(s.group).resource : undefined;
}

export function isServiceGroupKey(value: unknown): value is ServiceGroupKey {
  return (SERVICE_GROUP_KEYS as readonly string[]).includes(value as string);
}

export const servicesMeta = {
  source: raw.meta.source,
  pricesAreVerbatim: raw.meta.pricesAreVerbatim,
  durationsAreEstimates: raw.meta.durationsAreEstimates,
  resources: raw.meta.resources as Readonly<Record<ResourceKey, string>>,
} as const;
