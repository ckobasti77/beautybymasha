/**
 * Cenovnik kao alat, ne zid (spec 11 A): šest čipova grupa, blok „Najčešće" i pregled
 * po grupi. Ovde su samo podaci i pravila — bez React-a, da se testira u node-u.
 *
 * Ništa se ne izmišlja: čipovi samo grupišu postojećih 9 grupa iz `data/services.json`,
 * a „Najčešće" je lista ključeva iz spec-a koju vlasnica tek treba da potvrdi.
 */
import { assert, assertUnique } from "./data-guard";
import { categoryOfGroup, type ServiceCategoryKey } from "./serviceCategories";
import { SERVICE_GROUP_KEYS, serviceByKey, services, type Service, type ServiceGroupKey } from "./services";

export const PRICE_CHIP_KEYS = ["nega-ruku", "nega-nogu", "depilacija", "masaza", "trepavice-obrve", "ostalo"] as const;
export type PriceChipKey = (typeof PRICE_CHIP_KEYS)[number];

export type PriceChip = {
  readonly key: PriceChipKey;
  readonly title: string;
  /** Grupe iz services.json koje čip pokriva; prva je ona koja se vidi u pregledu. */
  readonly groups: readonly ServiceGroupKey[];
};

export const PRICE_CHIPS: readonly PriceChip[] = [
  { key: "nega-ruku", title: "Nega ruku", groups: ["nega-ruku"] },
  { key: "nega-nogu", title: "Nega nogu", groups: ["nega-nogu"] },
  {
    key: "depilacija",
    title: "Depilacija",
    groups: ["depilacija-vosak-z", "depilacija-vosak-m", "depilacija-pasta-z", "depilacija-pasta-m"],
  },
  { key: "masaza", title: "Masaža", groups: ["masaza"] },
  { key: "trepavice-obrve", title: "Trepavice i obrve", groups: ["trepavice-obrve"] },
  { key: "ostalo", title: "Ostalo", groups: ["ostalo"] },
];

assertUnique(PRICE_CHIPS, (c) => c.key, "priceList.chips");
for (const g of SERVICE_GROUP_KEYS) {
  const owners = PRICE_CHIPS.filter((c) => c.groups.includes(g));
  assert(owners.length === 1, `priceList: grupa "${g}" mora biti u tačno jednom čipu (ima ${owners.length})`);
}

/**
 * Naslovi grupa za UI, sa dijakritikom. `services.json` ih drži bez kvačica
 * („Depilacija voskom - zensko telo"), a na sajtu se piše š đ č ć ž (CLAUDE.md).
 */
export const GROUP_LABELS: Readonly<Record<ServiceGroupKey, string>> = {
  "nega-ruku": "Nega ruku",
  "nega-nogu": "Nega nogu",
  "depilacija-vosak-z": "Depilacija voskom, žensko telo",
  "depilacija-vosak-m": "Depilacija voskom, muško telo",
  "depilacija-pasta-z": "Depilacija šećernom pastom, žensko telo",
  "depilacija-pasta-m": "Depilacija šećernom pastom, muško telo",
  masaza: "Masaža",
  "trepavice-obrve": "Trepavice i obrve",
  ostalo: "Ostalo",
};

/** Kratki natpisi pod-čipova unutar Depilacije. */
export const SUB_CHIP_LABELS: Readonly<Partial<Record<ServiceGroupKey, string>>> = {
  "depilacija-vosak-z": "Vosak, žensko",
  "depilacija-vosak-m": "Vosak, muško",
  "depilacija-pasta-z": "Pasta, žensko",
  "depilacija-pasta-m": "Pasta, muško",
};

/**
 * Šest usluga na vrhu cenovnika kad nema filtera. Redosled i izbor su iz spec-a
 * (.nightrun/specs/11-cenovnik-swatch.md) — [POTVRDITI kod vlasnice] koje se zaista
 * najčešće zakazuju. Menja se samo ova lista, ništa u podacima.
 */
export const MOST_WANTED_KEYS = [
  "manikir-trajni-lak",
  "pedikir-trajni",
  "vosak-z-cele-noge",
  "masaza-relax-60",
  "lash-lift-botox",
  "korekcija-orly-m",
] as const;

/** Koliko redova jedna grupa pokazuje u pregledu (bez čipa i pretrage). */
export const PREVIEW_ROWS = 5;

/** Može li gost sam da zakaže: ima cenu i nije dodatak ni paket. */
export function canBook(s: Service): boolean {
  return s.bookable && s.priceRsd !== null;
}

export const mostWanted: readonly Service[] = MOST_WANTED_KEYS.map((key) => {
  const s = serviceByKey(key);
  assert(s && canBook(s), `priceList: „najčešće" usluga "${key}" ne postoji ili se ne zakazuje`);
  return s;
});

const ROWS = new Map<ServiceGroupKey, readonly Service[]>(
  SERVICE_GROUP_KEYS.map((g) => [g, services.filter((s) => s.group === g && s.addon !== true)]),
);
const ADDONS = new Map<ServiceGroupKey, readonly Service[]>(
  SERVICE_GROUP_KEYS.map((g) => [g, services.filter((s) => s.group === g && s.addon === true)]),
);

/** Redovi grupe: sve što nije dodatak (usluge, paketi, stavke „na upit"). */
export function rowsOf(group: ServiceGroupKey): readonly Service[] {
  return ROWS.get(group) ?? [];
}

/** Dodaci grupe — prikazuju se kao čipovi ispod redova, ne kao redovi. */
export function addonsOf(group: ServiceGroupKey): readonly Service[] {
  return ADDONS.get(group) ?? [];
}

export function chipByKey(key: PriceChipKey): PriceChip {
  const c = PRICE_CHIPS.find((x) => x.key === key);
  assert(c, `priceList: nepoznat čip "${key}"`);
  return c;
}

export function chipOfGroup(group: ServiceGroupKey): PriceChip {
  const c = PRICE_CHIPS.find((x) => x.groups.includes(group));
  assert(c, `priceList: grupa "${group}" nema čip`);
  return c;
}

/** Krug iz sekcije Usluge vodi na prvu grupu svoje kategorije („Nokti" → Nega ruku). */
export function groupOfCategory(category: ServiceCategoryKey): ServiceGroupKey {
  const g = SERVICE_GROUP_KEYS.find((key) => categoryOfGroup(key)?.key === category);
  assert(g, `priceList: kategorija "${category}" nema nijednu grupu`);
  return g;
}

export function isPriceChipKey(value: unknown): value is PriceChipKey {
  return (PRICE_CHIP_KEYS as readonly string[]).includes(value as string);
}

/** Broj redova koje čip otvara — za dugme „Sve usluge u grupi … (n)". */
export function rowCountOfChip(chip: PriceChip): number {
  return chip.groups.reduce((n, g) => n + rowsOf(g).length, 0);
}

export function addonCountOfChip(chip: PriceChip): number {
  return chip.groups.reduce((n, g) => n + addonsOf(g).length, 0);
}

/**
 * Kontekst usluge u kartici „Najčešće": „Cele noge" bez grupe ne znači ništa, pa
 * kartica piše „Depilacija · vosak, žensko". Za grupe sa jednom stavkom samo naziv čipa.
 */
export function contextLabel(s: Service): string {
  const chip = chipOfGroup(s.group);
  const sub = SUB_CHIP_LABELS[s.group];
  return chip.groups.length > 1 && sub ? `${chip.title} · ${sub.toLowerCase()}` : chip.title;
}
