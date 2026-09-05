/**
 * Prevod između njene tabele i naše baze.
 *
 * Ona radi u Excelu — kolone se zovu kako se zovu, cene su „1.850,00“, stanje ume
 * da bude prazno. Ovde se to prevodi u ono što `products.bulkUpsert` očekuje, i
 * to tako da red koji ne valja ne obori ceo uvoz.
 */
import { BRANDS, PRODUCT_CATEGORY_KEYS, productCategories, type Brand, type ProductCategoryKey } from "@/lib/products";

/** Polja koja uvoz ume da napuni. `sku` je jedino obavezno — po njemu se uparuje. */
export const IMPORT_FIELDS = [
  { key: "sku", label: "Šifra (SKU)", required: true },
  { key: "name", label: "Naziv", required: false },
  { key: "priceRsd", label: "Cena", required: false },
  { key: "discountPercent", label: "Popust %", required: false },
  { key: "stock", label: "Stanje", required: false },
  { key: "categoryKey", label: "Kategorija", required: false },
  { key: "brand", label: "Brend", required: false },
  { key: "hex", label: "Boja (#RRGGBB)", required: false },
  { key: "description", label: "Opis", required: false },
  { key: "active", label: "Na sajtu (da/ne)", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

/** Reči po kojima pogađamo koja kolona je koja — da ne mora sve ručno da spaja. */
const HINTS: Record<ImportFieldKey, readonly string[]> = {
  sku: ["sku", "sifra", "šifra", "kod", "code", "artikal"],
  name: ["naziv", "ime", "name", "proizvod", "artikl"],
  priceRsd: ["cena", "price", "rsd", "din"],
  discountPercent: ["popust", "discount", "rabat"],
  stock: ["stanje", "zaliha", "kolicina", "količina", "stock", "qty"],
  categoryKey: ["kategorija", "category", "grupa"],
  brand: ["brend", "brand", "proizvodjac", "proizvođač"],
  hex: ["boja", "hex", "color"],
  description: ["opis", "description", "napomena"],
  active: ["aktivan", "aktivno", "sajt", "vidljivo", "active"],
};

function fold(input: string): string {
  return input
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]/g, "");
}

/** Prvi predlog mapiranja: kolona → polje, po nazivu zaglavlja. */
export function guessMapping(headers: readonly string[]): Record<ImportFieldKey, number | null> {
  const out = {} as Record<ImportFieldKey, number | null>;
  const used = new Set<number>();
  for (const field of IMPORT_FIELDS) {
    const hints = HINTS[field.key].map(fold);
    const index = headers.findIndex((h, i) => {
      if (used.has(i)) return false;
      const folded = fold(String(h ?? ""));
      return folded.length > 0 && hints.some((hint) => folded === hint || folded.startsWith(hint));
    });
    out[field.key] = index === -1 ? null : index;
    if (index !== -1) used.add(index);
  }
  return out;
}

/**
 * „1.850,00“ → 1850, „1850“ → 1850, „“ → undefined.
 * Tačka je hiljadarski separator, zarez decimalni — kako Excel piše na srpskom.
 */
export function parseNumber(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw) : undefined;
  const text = String(raw ?? "").trim();
  if (!text) return undefined;
  const normalized = text.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export function parseBoolean(raw: unknown): boolean | undefined {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return undefined;
  if (["da", "1", "true", "x", " da", "aktivan"].includes(text)) return true;
  if (["ne", "0", "false", "-"].includes(text)) return false;
  return undefined;
}

export function parseBrand(raw: unknown): Brand | undefined {
  const text = fold(String(raw ?? ""));
  return BRANDS.find((b) => fold(b) === text);
}

/** Prima i ključ („gel-lak“) i naslov iz cenovnika („Gel lakovi“). */
export function parseCategory(raw: unknown): ProductCategoryKey | undefined {
  const text = fold(String(raw ?? ""));
  if (!text) return undefined;
  const byKey = PRODUCT_CATEGORY_KEYS.find((k) => fold(k) === text);
  if (byKey) return byKey;
  return productCategories.find((c) => fold(c.title) === text)?.key;
}

export function parseHex(raw: unknown): string | undefined {
  const text = String(raw ?? "").trim().toUpperCase();
  if (!text) return undefined;
  const withHash = text.startsWith("#") ? text : `#${text}`;
  return /^#[0-9A-F]{6}$/.test(withHash) ? withHash : undefined;
}

export type ImportRow = {
  sku: string;
  name?: string;
  priceRsd?: number;
  discountPercent?: number;
  stock?: number;
  categoryKey?: ProductCategoryKey;
  brand?: Brand;
  hex?: string;
  description?: string;
  active?: boolean;
};

/**
 * Jedan red tabele → jedan red za `bulkUpsert`. Prazna ćelija se NE šalje —
 * prazno u tabeli znači „ne diraj“, ne „obriši“.
 */
export function buildRow(
  cells: readonly unknown[],
  mapping: Record<ImportFieldKey, number | null>,
): ImportRow | null {
  const at = (key: ImportFieldKey): unknown => {
    const index = mapping[key];
    return index === null ? undefined : cells[index];
  };

  const sku = String(at("sku") ?? "").trim();
  if (!sku) return null;

  const row: ImportRow = { sku };
  const name = String(at("name") ?? "").trim();
  if (name) row.name = name;
  const description = String(at("description") ?? "").trim();
  if (description) row.description = description;

  const priceRsd = parseNumber(at("priceRsd"));
  if (priceRsd !== undefined) row.priceRsd = priceRsd;
  const discountPercent = parseNumber(at("discountPercent"));
  if (discountPercent !== undefined) row.discountPercent = discountPercent;
  const stock = parseNumber(at("stock"));
  if (stock !== undefined) row.stock = stock;

  const categoryKey = parseCategory(at("categoryKey"));
  if (categoryKey) row.categoryKey = categoryKey;
  const brand = parseBrand(at("brand"));
  if (brand) row.brand = brand;
  const hex = parseHex(at("hex"));
  if (hex) row.hex = hex;
  const active = parseBoolean(at("active"));
  if (active !== undefined) row.active = active;

  return row;
}

/** „38 ažurirano · 12 novo · 2 preskočeno“ */
export function importSummary(result: { updated: number; created: number; skipped: readonly unknown[] }): string {
  const parts = [`${result.updated} ažurirano`, `${result.created} novo`];
  if (result.skipped.length > 0) parts.push(`${result.skipped.length} preskočeno`);
  return parts.join(" · ");
}
