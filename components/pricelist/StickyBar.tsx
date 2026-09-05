"use client";

import type { ReactNode, RefObject } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PRICE_CHIPS, SUB_CHIP_LABELS, chipByKey, type PriceChipKey } from "@/lib/priceList";
import type { ServiceGroupKey } from "@/lib/services";
import { priceList as t } from "./strings";

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={[
        "min-h-11 shrink-0 snap-start whitespace-nowrap rounded-pill border px-4 text-sm font-medium transition-[background-color,border-color,color] duration-150 focus-ring",
        pressed
          ? "border-brand bg-brand text-brand-fg"
          : "border-line bg-bg-elev text-fg hover:border-line-strong hover:bg-bg-sunken",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Red čipova: na telefonu se skroluje horizontalno (bleed do ivice), od `md` se prelama. */
const SCROLLER =
  "-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:flex-wrap md:px-0";

/**
 * Lepljiva traka ispod navigacije: pretraga + čipovi grupa (+ pod-čipovi depilacije)
 * + broj pogodaka. Chrome, ne sadržaj: ništa ovde ne ulazi kroz reveal — mora da se
 * čita istog trena. Stoji VAN `Reveal` kontejnera liste (transformisan predak kvari
 * backdrop-blur).
 */
export function StickyBar({
  barRef,
  query,
  chip,
  sub,
  countText,
  onQuery,
  onChip,
  onSub,
}: {
  barRef: RefObject<HTMLDivElement | null>;
  query: string;
  chip: PriceChipKey | null;
  sub: ServiceGroupKey | null;
  countText: string;
  onQuery: (value: string) => void;
  onChip: (chip: PriceChipKey | null) => void;
  onSub: (group: ServiceGroupKey | null) => void;
}) {
  const searching = query.trim().length > 0;
  const subChips = chip === "depilacija" ? chipByKey("depilacija").groups : null;

  return (
    <div
      ref={barRef}
      data-reveal="off"
      className="sticky top-[var(--nav-h)] z-20 -mx-5 flex flex-col gap-3 bg-bg/90 px-5 py-3 backdrop-blur md:-mx-8 md:px-8"
    >
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex items-center gap-3">
        <Input
          label={t.search.label}
          hideLabel
          type="search"
          placeholder={t.search.placeholder}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          prefix={<Search size={16} strokeWidth={1.5} aria-hidden />}
          className="w-full md:max-w-sm"
        />
        <p aria-live="polite" className="num hidden text-caption text-fg-muted md:block">
          {countText}
        </p>
      </form>

      <div role="group" aria-label={t.chips.group} className={SCROLLER}>
        <Chip pressed={chip === null && !searching} onClick={() => onChip(null)}>
          {t.chips.all}
        </Chip>
        {PRICE_CHIPS.map((c) => (
          <Chip key={c.key} pressed={chip === c.key && !searching} onClick={() => onChip(c.key)}>
            {c.title}
          </Chip>
        ))}
      </div>

      {subChips ? (
        <div role="group" aria-label={t.chips.sub} className={SCROLLER}>
          <Chip pressed={sub === null} onClick={() => onSub(null)}>
            {t.chips.subAll}
          </Chip>
          {subChips.map((g) => (
            <Chip key={g} pressed={sub === g} onClick={() => onSub(g)}>
              {SUB_CHIP_LABELS[g] ?? g}
            </Chip>
          ))}
        </div>
      ) : null}

      <p aria-live="polite" className="num text-caption text-fg-muted md:hidden">
        {countText}
      </p>
    </div>
  );
}
