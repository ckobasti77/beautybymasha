/**
 * Podaci o salonu iz data/site.json, tipovani i validirani pri učitavanju.
 * BEZ React importa i BEZ `@/` aliasa — uvozi ga i Convex backend (prompt 2).
 * Sve što je [POTVRDITI] ostaje takvo u JSON-u; ovde se ništa ne izmišlja.
 */
import raw from "../data/site.json";
import { HHMM_RE, assert, assertUnique, oneOf } from "./data-guard";

export const RESOURCE_KEYS = ["nokti", "kozmetika", "masaza"] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const LOCATION_KEYS = ["ljubicica", "mimoza"] as const;
export type LocationKey = (typeof LOCATION_KEYS)[number];

export type Interval = { readonly start: string; readonly end: string };
/** Indeks 0 = nedelja … 6 = subota. Prazan niz = zatvoreno. */
export type WorkWeek = readonly [
  readonly Interval[],
  readonly Interval[],
  readonly Interval[],
  readonly Interval[],
  readonly Interval[],
  readonly Interval[],
  readonly Interval[],
];

export type HoursLine = { readonly days: string; readonly time: string };

export type Location = {
  readonly key: LocationKey;
  readonly name: string;
  readonly fullName: string;
  readonly address: {
    readonly street: string;
    readonly building: string;
    readonly area: string;
    readonly city: string;
  };
  readonly phone: { readonly display: string; readonly href: string };
  readonly mapsQuery: string;
  readonly hours: readonly HoursLine[];
  readonly workWeek: WorkWeek;
  readonly capacity: Readonly<Record<ResourceKey, number>>;
  readonly capacityNote?: string;
};

export type Site = {
  readonly name: string;
  readonly legalName: string;
  readonly tagline: string;
  readonly lang: string;
  readonly currency: "RSD";
  readonly timezone: string;
  readonly url: string;
  readonly urlNote?: string;
  readonly phone: { readonly display: string; readonly href: string };
  readonly viber: string;
  readonly whatsapp: string;
  readonly email: string;
  readonly social: { readonly instagram: string; readonly facebook: string; readonly threads: string };
  readonly locations: readonly Location[];
  readonly booking: {
    readonly slotStepMin: number;
    readonly leadTimeMin: number;
    readonly horizonDays: number;
    readonly holdHours: number;
  };
  readonly loyalty: {
    readonly discountPercent: number;
    readonly headline: string;
    readonly sub: string;
    readonly note: string;
  };
  readonly shipping: { readonly flatRsd: number; readonly freeOverRsd: number; readonly note?: string };
};

function parseWorkWeek(input: unknown, what: string): WorkWeek {
  assert(Array.isArray(input) && input.length === 7, `${what}.workWeek mora imati 7 dana`);
  const days = input.map((day, i) => {
    assert(Array.isArray(day), `${what}.workWeek[${i}] mora biti niz`);
    return day.map((iv: { start?: unknown; end?: unknown }) => {
      assert(
        typeof iv.start === "string" && HHMM_RE.test(iv.start) && typeof iv.end === "string" && HHMM_RE.test(iv.end),
        `${what}.workWeek[${i}]: interval mora biti HH:MM`,
      );
      assert(iv.start < iv.end, `${what}.workWeek[${i}]: start mora biti pre end`);
      return { start: iv.start, end: iv.end } as Interval;
    });
  });
  return days as unknown as WorkWeek;
}

function parseLocation(input: (typeof raw.locations)[number]): Location {
  const key = oneOf(input.key, LOCATION_KEYS, "location.key");
  const capacity = {} as Record<ResourceKey, number>;
  for (const r of RESOURCE_KEYS) {
    const c = (input.capacity as Record<string, unknown>)[r];
    assert(typeof c === "number" && Number.isInteger(c) && c >= 0, `${key}.capacity.${r} mora biti ceo broj ≥ 0`);
    capacity[r] = c;
  }
  return {
    key,
    name: input.name,
    fullName: input.fullName,
    address: input.address,
    phone: input.phone,
    mapsQuery: input.mapsQuery,
    hours: input.hours,
    workWeek: parseWorkWeek(input.workWeek, key),
    capacity,
    capacityNote: input.capacityNote,
  };
}

function parseSite(input: typeof raw): Site {
  assert(input.currency === "RSD", "site.currency mora biti RSD");
  const locations = input.locations.map(parseLocation);
  assertUnique(locations, (l) => l.key, "locations");
  assert(locations.length === LOCATION_KEYS.length, "site.locations mora imati oba lokala");
  return {
    name: input.name,
    legalName: input.legalName,
    tagline: input.tagline,
    lang: input.lang,
    currency: "RSD",
    timezone: input.timezone,
    url: input.url,
    urlNote: input.urlNote,
    phone: input.phone,
    viber: input.viber,
    whatsapp: input.whatsapp,
    email: input.email,
    social: input.social,
    locations,
    booking: input.booking,
    loyalty: input.loyalty,
    shipping: input.shipping,
  };
}

export const site: Site = parseSite(raw);
export const locations: readonly Location[] = site.locations;

export function locationByKey(key: LocationKey): Location {
  const found = locations.find((l) => l.key === key);
  assert(found, `Nepoznat lokal "${key}"`);
  return found;
}

export function isLocationKey(value: unknown): value is LocationKey {
  return (LOCATION_KEYS as readonly string[]).includes(value as string);
}

export function isResourceKey(value: unknown): value is ResourceKey {
  return (RESOURCE_KEYS as readonly string[]).includes(value as string);
}

/** Naslovi resursa za UI i admin (iz services.json meta). */
export const RESOURCE_LABELS: Readonly<Record<ResourceKey, string>> = {
  nokti: "Nokti",
  kozmetika: "Kozmetika",
  masaza: "Masaža",
};
