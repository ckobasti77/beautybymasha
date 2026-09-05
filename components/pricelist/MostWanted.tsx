"use client";

import { formatDuration, formatRsd } from "@/lib/format";
import { contextLabel, mostWanted } from "@/lib/priceList";
import { BookLink } from "./BookLink";
import { priceList as t } from "./strings";

/**
 * Šest usluga na vrhu kad nema filtera (lib/priceList.ts → MOST_WANTED_KEYS,
 * [POTVRDITI kod vlasnice]). Kartica je cela dodirljiva (stretched link).
 * Naslov i uvod ostaju u site-wide reč-po-reč prolazu; kartice su `data-reveal="off"`.
 */
export function MostWanted({ hidden }: { hidden: boolean }) {
  return (
    <div hidden={hidden}>
      <h3 className="text-h3 text-fg">{t.mostWanted.title}</h3>
      <p className="mt-1 text-sm text-fg-muted">{t.mostWanted.hint}</p>
      <ul data-reveal="off" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        {mostWanted.map((s) => (
          <li
            key={s.key}
            className="group relative flex flex-col gap-1.5 rounded-md border border-line bg-bg-elev p-4 shadow-card transition-[border-color,background-color] duration-150 can-hover:hover:border-line-strong can-hover:hover:bg-tint-wash active:bg-tint-wash"
          >
            <span className="text-caption text-fg-muted">{contextLabel(s)}</span>
            <span className="text-sm font-semibold text-fg md:text-base">{s.title}</span>
            <span className="num mt-auto flex flex-wrap items-baseline justify-between gap-x-2 pt-2 text-sm">
              <span className="text-fg-muted">{formatDuration(s.durationMin)}</span>
              <span className="font-semibold text-fg">{s.priceRsd === null ? t.onRequest : formatRsd(s.priceRsd)}</span>
            </span>
            <BookLink serviceKey={s.key} title={s.title} stretch="always" className="mt-2 self-start" />
          </li>
        ))}
      </ul>
    </div>
  );
}
