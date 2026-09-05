"use client";

import { Select, type SelectOption } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  BRANDS,
  BRAND_LABELS,
  COLOR_FAMILIES,
  FINISHES,
  PRODUCT_CATEGORY_KEYS,
  productCategoryByKey,
  type Brand,
  type ColorFamily,
  type Finish,
  type Product,
  type ProductCategoryKey,
} from "@/lib/products";
import {
  FAMILY_LABELS,
  FINISH_LABELS,
  PRICE_BANDS,
  applyFilters,
  availableValues,
  hasAnyFilter,
  type PriceBandKey,
  type ShopFilters,
} from "@/lib/shopFilters";

/**
 * Pet padajućih lista nad zidom. Nativni `<select>` je namerno: na telefonu
 * otvara sistemski točkić, ima 44 px i radi sa tastaturom bez ijedne linije JS-a.
 *
 * Ponuđene su samo vrednosti koje u katalogu zaista postoje — filter koji vodi
 * u prazan zid se ne nudi. Svaka lista gleda katalog suzen OSTALIM filterima,
 * pa se izbor „ORLY + gel lak" (kombinacija koja ne postoji) ni ne pojavljuje.
 *
 * Forma je u `skipSelector`-u text-reveal sistema — kontrole moraju da budu
 * čitljive istog trenutka.
 */

const ANY = "";

function options<T extends string>(values: readonly T[], label: (v: T) => string, all: string): SelectOption[] {
  return [{ value: ANY, label: all }, ...values.map((v) => ({ value: v, label: label(v) }))];
}

export function ShopFiltersBar({
  products,
  filters,
  onChange,
  resultCount,
}: {
  products: readonly Product[];
  filters: ShopFilters;
  onChange: (next: ShopFilters) => void;
  resultCount: number;
}) {
  /** Katalog suzen svime OSIM jedne ose — to su vrednosti koje ta osa sme da ponudi. */
  const without = (key: keyof ShopFilters) => applyFilters(products, { ...filters, [key]: null });

  const brands = availableValues(without("brand"), BRANDS, (p) => p.brand);
  const categories = availableValues(without("category"), PRODUCT_CATEGORY_KEYS, (p) => p.category);
  const families = availableValues(without("family"), COLOR_FAMILIES, (p) => p.family);
  const finishes = availableValues(without("finish"), FINISHES, (p) => p.finish);
  const bands = PRICE_BANDS.filter((b) =>
    without("price").some((p) => p.priceRsd >= b.min && p.priceRsd < b.max),
  );

  const set = <K extends keyof ShopFilters>(key: K, raw: string) =>
    onChange({ ...filters, [key]: raw === ANY ? null : (raw as ShopFilters[K]) });

  return (
    <form
      className="mt-10"
      aria-label="Filteri kataloga"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Select
          label="Brend"
          value={filters.brand ?? ANY}
          onChange={(e) => set("brand", e.target.value)}
          options={options(brands, (b: Brand) => BRAND_LABELS[b], "Svi brendovi")}
        />
        <Select
          label="Kategorija"
          value={filters.category ?? ANY}
          onChange={(e) => set("category", e.target.value)}
          options={options(
            categories,
            (c: ProductCategoryKey) => productCategoryByKey(c).title,
            "Sve kategorije",
          )}
        />
        <Select
          label="Porodica boje"
          value={filters.family ?? ANY}
          onChange={(e) => set("family", e.target.value)}
          options={options(families, (f: ColorFamily) => FAMILY_LABELS[f], "Sve boje")}
        />
        <Select
          label="Finiš"
          value={filters.finish ?? ANY}
          onChange={(e) => set("finish", e.target.value)}
          options={options(finishes, (f: Finish) => FINISH_LABELS[f], "Svi finiši")}
        />
        <Select
          label="Cena"
          className="col-span-2 md:col-span-1"
          value={filters.price ?? ANY}
          onChange={(e) => set("price", e.target.value)}
          options={[
            { value: ANY, label: "Sve cene" },
            ...bands.map((b) => ({ value: b.key as PriceBandKey, label: b.label })),
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-fg-muted">
          {resultCount === 0
            ? "Nijedan proizvod ne odgovara izboru."
            : `Prikazano ${resultCount} od ${products.length} proizvoda.`}
        </p>
        {hasAnyFilter(filters) ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onChange({ brand: null, category: null, family: null, finish: null, price: null })
            }
          >
            Poništi filtere
          </Button>
        ) : null}
      </div>
    </form>
  );
}
