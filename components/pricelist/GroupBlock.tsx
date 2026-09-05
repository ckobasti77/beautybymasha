"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductSwatch } from "@/components/shop/ProductSwatch";
import { GROUP_LABELS, addonsOf, rowCountOfChip, rowsOf, type PriceChip } from "@/lib/priceList";
import type { PriceListView } from "@/lib/priceListView";
import { bestsellers } from "@/lib/products";
import type { ServiceGroupKey } from "@/lib/services";
import { AddonChips } from "./AddonChips";
import { ServiceRow } from "./ServiceRow";
import { priceList as t } from "./strings";

/** Četiri laka iz salona uz „Lakovi koje koristimo" — veza cenovnik → shop. */
const LACQUER_PICKS = bestsellers.filter((p) => p.category === "lakovi").slice(0, 4);

const NAIL_GROUPS: readonly ServiceGroupKey[] = ["nega-ruku", "nega-nogu"];

/**
 * Jedna grupa cenovnika: naslov (nosi `id="cenovnik-<grupa>"`, meta deep linka i
 * krugova iz sekcije Usluge), redovi, dugme „Sve usluge u grupi …" u pregledu, čipovi
 * dodataka i, ispod Nege ruku i Nege nogu, red ka shopu.
 *
 * Naslov ostaje u site-wide reč-po-reč prolazu; lista redova je `data-reveal="off"`
 * jer se menja na svaki dodir (isto kao zid shopa).
 */
export function GroupBlock({
  group,
  chip,
  first,
  view,
  query,
  onShowAll,
}: {
  group: ServiceGroupKey;
  chip: PriceChip;
  /** Prva grupa čipa — jedina koja se vidi u pregledu i nosi dugme „Sve usluge…". */
  first: boolean;
  view: PriceListView;
  query: string;
  onShowAll: () => void;
}) {
  const rows = rowsOf(group);
  const addons = addonsOf(group);
  const visible = view.visibleGroups.has(group);
  const showMore = view.mode === "preview" && first && view.previewMore.has(chip.key);
  const anyAddon = addons.some((a) => view.visibleAddons.has(a.key));
  const lacquers = NAIL_GROUPS.includes(group) && view.mode !== "search";

  return (
    <section hidden={!visible} aria-labelledby={`cenovnik-${group}`} className="mt-10">
      <h3 id={`cenovnik-${group}`} className="scroll-mt-52 text-h3 text-fg">
        {GROUP_LABELS[group]}
      </h3>

      <ul data-reveal="off" className="mt-4 divide-y divide-line rounded-lg border border-line bg-bg-elev">
        {rows.map((s) => (
          <ServiceRow key={s.key} service={s} query={query} hidden={!view.visibleRows.has(s.key)} />
        ))}
      </ul>

      <div hidden={!showMore} data-reveal="off" className="mt-3">
        <button
          type="button"
          onClick={onShowAll}
          className="inline-flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold text-link transition-colors duration-150 hover:bg-tint-wash focus-ring"
        >
          {t.showAll(chip.title, rowCountOfChip(chip))}
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <AddonChips addons={addons} visible={view.visibleAddons} query={query} hidden={!anyAddon} />

      {NAIL_GROUPS.includes(group) ? (
        <div hidden={!lacquers} data-reveal="off" className="mt-3">
          <Link
            href="/shop"
            className="group/shop flex items-center gap-4 rounded-lg border border-line bg-bg-elev px-4 py-3 transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-tint-wash focus-ring"
          >
            <span className="flex shrink-0 -space-x-2">
              {LACQUER_PICKS.map((p) => (
                <ProductSwatch key={p.slug} hex={p.hex} finish={p.finish} size={28} />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">{t.lacquers.title}</span>
              <span className="block text-caption text-fg-muted">{t.lacquers.sub}</span>
            </span>
            <ArrowRight
              size={18}
              strokeWidth={1.5}
              aria-hidden
              className="shrink-0 text-link transition-transform duration-150 group-hover/shop:translate-x-0.5"
            />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
