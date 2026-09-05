"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Reveal } from "@/components/motion/Reveal";
import { ProductCard, type LivePrice } from "@/components/shop/ProductCard";
import { ShopFiltersBar } from "@/components/shop/ShopFiltersBar";
import { products as catalog, type Product } from "@/lib/products";
import { applyFilters, filtersFromParams, filtersToQuery, type ShopFilters } from "@/lib/shopFilters";

/**
 * Zid swatch-eva. Filtriranje je čisto klijentsko — katalog ima 70 stavki i ceo
 * je već u HTML-u, pa nema razloga za odlazak na server pri svakoj promeni.
 *
 * Stanje filtera nosi URL (`router.replace`, bez skrola): link se deli, dugme
 * „nazad" vraća prethodni izbor, a ponovno učitavanje zatiče isti zid.
 *
 * Cene: kartice se crtaju iz statičkog kataloga, a živa cena i stanje stižu iz
 * Convex-a i prepisuju ih. Bez `NEXT_PUBLIC_CONVEX_URL` nema auth provider-a,
 * pa `useQuery` tada ne sme da se pozove — otuda dve komponente.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

function useFilters(): [ShopFilters, (next: ShopFilters) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filters = useMemo(() => filtersFromParams(params), [params]);
  const setFilters = useCallback(
    (next: ShopFilters) => router.replace(`${pathname}${filtersToQuery(next)}`, { scroll: false }),
    [router, pathname],
  );
  return [filters, setFilters];
}

function Grid({ products, prices }: { products: Product[]; prices: Map<string, LivePrice> }) {
  if (products.length === 0) {
    return (
      <p className="mt-12 rounded-md border border-line bg-bg-elev p-8 text-center text-fg-muted">
        Ovoj kombinaciji filtera ne odgovara nijedan proizvod. Poništite jedan filter pa probajte ponovo.
      </p>
    );
  }
  return (
    <Reveal
      as="ul"
      stagger={0.02}
      // Ceo tekst kartice je unutar <a> i mora da bude čitljiv istog trena; bez
      // ovoga bi text-reveal obeležio <li> i tražio reči kojih tu nema.
      revealOff
      className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {products.map((p, i) => (
        <ProductCard
          key={p.slug}
          product={p}
          price={prices.get(p.slug)}
          priority={i < 4}
          sizes="(min-width: 1280px) 200px, (min-width: 768px) 24vw, 40vw"
        />
      ))}
    </Reveal>
  );
}

function Wall({ prices }: { prices: Map<string, LivePrice> }) {
  const [filters, setFilters] = useFilters();
  const visible = useMemo(() => applyFilters(catalog, filters), [filters]);

  return (
    <>
      <ShopFiltersBar
        products={catalog}
        filters={filters}
        onChange={setFilters}
        resultCount={visible.length}
      />
      <Grid products={visible} prices={prices} />
    </>
  );
}

function WallWithLivePrices() {
  const rows = useQuery(api.products.list, {});
  const prices = useMemo(() => {
    const map = new Map<string, LivePrice>();
    for (const r of rows ?? []) {
      map.set(r.slug, {
        priceRsd: r.priceRsd,
        finalPriceRsd: r.finalPriceRsd,
        discountPercent: r.discountPercent,
        inStock: r.inStock,
      });
    }
    return map;
  }, [rows]);
  return <Wall prices={prices} />;
}

const NO_PRICES = new Map<string, LivePrice>();

export function ShopWall() {
  if (!HAS_BACKEND) return <Wall prices={NO_PRICES} />;
  return <WallWithLivePrices />;
}
