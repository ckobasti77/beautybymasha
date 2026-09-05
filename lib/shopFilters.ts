/**
 * Filteri zida swatch-eva: brend · kategorija · porodica boje · finiš · cena.
 * Stanje živi u URL-u (`/shop?brend=orly&boja=roze`), pa se filtrirani zid deli
 * linkom i vraća dugmetom „nazad".
 *
 * Ključevi u URL-u su bez dijakritike (CLAUDE.md); natpisi u UI-ju je imaju.
 */
import {
  BRANDS,
  COLOR_FAMILIES,
  FINISHES,
  PRODUCT_CATEGORY_KEYS,
  type Brand,
  type ColorFamily,
  type Finish,
  type Product,
  type ProductCategoryKey,
} from "./products";

export const FINISH_LABELS: Readonly<Record<Finish, string>> = {
  creme: "Krema",
  shimmer: "Šimer",
  glitter: "Gliter",
  holo: "Holo",
  metallic: "Metalik",
  duochrome: "Duohrom",
  sheer: "Providna",
  base: "Baza",
  top: "Nadlak",
  treatment: "Nega",
};

export const FAMILY_LABELS: Readonly<Record<ColorFamily, string>> = {
  mint: "Mint",
  roze: "Roze",
  nude: "Nude",
  crvena: "Crvena",
  ljubicasta: "Ljubičasta",
  braon: "Braon",
  zelena: "Zelena",
  crna: "Crna",
  srebrna: "Srebrna",
  multi: "Višebojna",
  bezbojna: "Bezbojna",
};

/** Tri opsega cene pokrivaju ceo katalog; granice su okrugle, ne izvedene iz podataka. */
export const PRICE_BANDS = [
  { key: "do-2500", label: "do 2.500 RSD", min: 0, max: 2500 },
  { key: "2500-3000", label: "od 2.500 do 3.000 RSD", min: 2500, max: 3000 },
  { key: "preko-3000", label: "preko 3.000 RSD", min: 3000, max: Number.POSITIVE_INFINITY },
] as const;

export type PriceBandKey = (typeof PRICE_BANDS)[number]["key"];

export type ShopFilters = {
  readonly brand: Brand | null;
  readonly category: ProductCategoryKey | null;
  readonly family: ColorFamily | null;
  readonly finish: Finish | null;
  readonly price: PriceBandKey | null;
};

export const EMPTY_FILTERS: ShopFilters = {
  brand: null,
  category: null,
  family: null,
  finish: null,
  price: null,
};

/** Imena parametara u URL-u. Menjanje ovoga razbija podeljene linkove. */
export const PARAM = {
  brand: "brend",
  category: "kategorija",
  family: "boja",
  finish: "finis",
  price: "cena",
} as const;

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

type Params = { get(name: string): string | null };

export function filtersFromParams(params: Params): ShopFilters {
  return {
    brand: pick(params.get(PARAM.brand), BRANDS),
    category: pick(params.get(PARAM.category), PRODUCT_CATEGORY_KEYS),
    family: pick(params.get(PARAM.family), COLOR_FAMILIES),
    finish: pick(params.get(PARAM.finish), FINISHES),
    price: pick(
      params.get(PARAM.price),
      PRICE_BANDS.map((b) => b.key),
    ),
  };
}

/** Query string bez praznih parametara — čist link, bez `?brend=&boja=`. */
export function filtersToQuery(filters: ShopFilters): string {
  const search = new URLSearchParams();
  if (filters.brand) search.set(PARAM.brand, filters.brand);
  if (filters.category) search.set(PARAM.category, filters.category);
  if (filters.family) search.set(PARAM.family, filters.family);
  if (filters.finish) search.set(PARAM.finish, filters.finish);
  if (filters.price) search.set(PARAM.price, filters.price);
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function hasAnyFilter(filters: ShopFilters): boolean {
  return Object.values(filters).some((v) => v !== null);
}

function matchesPrice(product: Product, key: PriceBandKey | null): boolean {
  if (!key) return true;
  const band = PRICE_BANDS.find((b) => b.key === key);
  if (!band) return true;
  return product.priceRsd >= band.min && product.priceRsd < band.max;
}

export function applyFilters(products: readonly Product[], filters: ShopFilters): Product[] {
  return products.filter(
    (p) =>
      (!filters.brand || p.brand === filters.brand) &&
      (!filters.category || p.category === filters.category) &&
      (!filters.family || p.family === filters.family) &&
      (!filters.finish || p.finish === filters.finish) &&
      matchesPrice(p, filters.price),
  );
}

/**
 * Opcije koje zaista postoje u katalogu, u zadatom redosledu. Filter za finiš
 * koji nema nijedan proizvod se ne nudi — prazan zid nije rezultat pretrage.
 */
export function availableValues<T extends string>(
  products: readonly Product[],
  order: readonly T[],
  of: (p: Product) => T,
): T[] {
  const present = new Set(products.map(of));
  return order.filter((value) => present.has(value));
}
