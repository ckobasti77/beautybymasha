/**
 * Katalog iz data/products.json, tipovan i validiran pri učitavanju.
 * BEZ React importa i BEZ `@/` aliasa — uvozi ga i Convex backend (prompt 3).
 *
 * Dva brenda: ORLY (lakovi, baze, nega — sa slikama) i Entity (gel lak, samo swatch —
 * `swatchOnly: true`, bez slike). Cene su okvirne ([POTVRDITI kod vlasnice]).
 * Spoljni `image` URL se NE izvozi — u kodu se koristi isključivo `localAvif`.
 */
import raw from "../data/products.json";
import { HEX_RE, assert, assertUnique, oneOf } from "./data-guard";

export const PRODUCT_CATEGORY_KEYS = ["lakovi", "baze-nadlakovi", "nega", "gel-lak"] as const;
export type ProductCategoryKey = (typeof PRODUCT_CATEGORY_KEYS)[number];

export const BRANDS = ["orly", "entity"] as const;
export type Brand = (typeof BRANDS)[number];

export const BRAND_LABELS: Readonly<Record<Brand, string>> = {
  orly: "ORLY",
  entity: "Entity",
};

export const FINISHES = [
  "creme",
  "shimmer",
  "glitter",
  "holo",
  "metallic",
  "duochrome",
  "sheer",
  "base",
  "top",
  "treatment",
] as const;
export type Finish = (typeof FINISHES)[number];

export const COLOR_FAMILIES = [
  "mint",
  "roze",
  "nude",
  "crvena",
  "ljubicasta",
  "braon",
  "zelena",
  "crna",
  "srebrna",
  "multi",
  "bezbojna",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export type ProductCategory = {
  readonly key: ProductCategoryKey;
  readonly title: string;
  readonly order: number;
};

export type Product = {
  readonly slug: string;
  readonly sku: string;
  readonly name: string;
  readonly brand: Brand;
  readonly category: ProductCategoryKey;
  /** Okvirna cena u RSD. [POTVRDITI] */
  readonly priceRsd: number;
  /** Swatch boja `#RRGGBB`. */
  readonly hex: string;
  readonly finish: Finish;
  readonly family: ColorFamily;
  readonly bestseller: boolean;
  readonly stock: number;
  /** Lokalna AVIF slika u public/, ili null kad je proizvod samo swatch. */
  readonly localAvif: string | null;
  /** Bez fotografije — kartica prikazuje samo swatch krug. */
  readonly swatchOnly: boolean;
  readonly description: string;
};

type RawProduct = (typeof raw.products)[number] & {
  brand?: string;
  bestseller?: boolean;
  swatchOnly?: boolean;
  localAvif?: string | null;
};

function parseCategory(c: (typeof raw.meta.categories)[number]): ProductCategory {
  return { key: oneOf(c.key, PRODUCT_CATEGORY_KEYS, "category.key"), title: c.title, order: c.order };
}

function parseProduct(p: RawProduct): Product {
  assert(/^[a-z0-9-]+$/.test(p.slug), `product ${p.slug}: slug sme da sadrži samo a-z, 0-9 i -`);
  assert(HEX_RE.test(p.hex), `product ${p.slug}: hex "${p.hex}" nije #RRGGBB`);
  assert(Number.isInteger(p.priceRsd) && p.priceRsd > 0, `product ${p.slug}: priceRsd mora biti ceo broj > 0`);
  assert(Number.isInteger(p.stock) && p.stock >= 0, `product ${p.slug}: stock mora biti ceo broj ≥ 0`);

  const swatchOnly = p.swatchOnly === true;
  const localAvif = p.localAvif ?? null;
  if (localAvif === null) {
    assert(swatchOnly, `product ${p.slug}: bez slike (localAvif) mora biti swatchOnly`);
  } else {
    assert(
      localAvif.startsWith("/") && localAvif.endsWith(".avif"),
      `product ${p.slug}: localAvif mora biti /…avif`,
    );
  }

  return {
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    brand: oneOf((p.brand ?? "orly").toLowerCase(), BRANDS, `product ${p.slug}.brand`),
    category: oneOf(p.category, PRODUCT_CATEGORY_KEYS, `product ${p.slug}.category`),
    priceRsd: p.priceRsd,
    hex: p.hex.toUpperCase(),
    finish: oneOf(p.finish, FINISHES, `product ${p.slug}.finish`),
    family: oneOf(p.family, COLOR_FAMILIES, `product ${p.slug}.family`),
    bestseller: p.bestseller === true,
    stock: p.stock,
    localAvif,
    swatchOnly,
    description: p.description,
  };
}

const categories = raw.meta.categories.map(parseCategory).sort((a, b) => a.order - b.order);
assertUnique(categories, (c) => c.key, "categories");
assert(categories.length === PRODUCT_CATEGORY_KEYS.length, "products.json: nedostaje kategorija");

const all = (raw.products as RawProduct[]).map(parseProduct);
assertUnique(all, (p) => p.slug, "products");
assertUnique(all, (p) => p.sku, "products.sku");

export const productCategories: readonly ProductCategory[] = categories;
export const products: readonly Product[] = all;
export const bestsellers: readonly Product[] = all.filter((p) => p.bestseller);
/** Proizvodi sa pravom bojom (lakovi i gel lak) — za zid swatch-eva. Baze i nega su bezbojni. */
export const swatchProducts: readonly Product[] = all.filter(
  (p) => p.category === "lakovi" || p.category === "gel-lak",
);

export function productBySlug(slug: string): Product | undefined {
  return all.find((p) => p.slug === slug);
}

export function productsByCategory(category: ProductCategoryKey): readonly Product[] {
  return all.filter((p) => p.category === category);
}

export function productsByBrand(brand: Brand): readonly Product[] {
  return all.filter((p) => p.brand === brand);
}

export function productCategoryByKey(key: ProductCategoryKey): ProductCategory {
  const c = categories.find((x) => x.key === key);
  assert(c, `Nepoznata kategorija "${key}"`);
  return c;
}

export function isProductCategoryKey(value: unknown): value is ProductCategoryKey {
  return (PRODUCT_CATEGORY_KEYS as readonly string[]).includes(value as string);
}

export const productsMeta = {
  priceNote: raw.meta.priceNote,
} as const;
