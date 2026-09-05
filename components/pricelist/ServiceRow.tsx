"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatRsd } from "@/lib/format";
import { canBook } from "@/lib/priceList";
import { matchRanges } from "@/lib/serviceSearch";
import type { Service } from "@/lib/services";
import { site } from "@/lib/site";
import { BookLink } from "./BookLink";
import { priceList as t } from "./strings";

/** Naslov sa obojenim pogocima pretrage. Pogodak samo preko sinonima ne boji ništa. */
export function Highlighted({ text, query }: { text: string; query: string }) {
  const ranges = query ? matchRanges(text, query) : [];
  if (ranges.length === 0) return <>{text}</>;
  const out: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], i) => {
    if (start > cursor) out.push(text.slice(cursor, start));
    out.push(
      <mark key={i} className="rounded-sm bg-tint px-0.5 text-fg">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return <>{out}</>;
}

const TEL_LINK =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-pill border border-line bg-bg-elev px-4 text-sm font-semibold text-fg transition-[border-color,background-color] duration-150 hover:border-line-strong hover:bg-bg-sunken focus-ring";

/**
 * Jedan red cenovnika: naziv · trajanje · cena · „Zakažite". Ispod `md` je cela
 * kartica dodirljiva (stretched link u `BookLink`). Cena je verbatim, trajanje procena.
 *
 * Paket (`package`) nosi oznaku „paket od 10" i „Raspitajte se" (poziv); stavka bez
 * cene piše „na upit" i nudi „Pozovite" — ni jedno ni drugo se ne zakazuje samo.
 * Red je uvek u DOM-u; `hidden` odlučuje filter (lib/priceListView.ts).
 */
export function ServiceRow({ service: s, query, hidden }: { service: Service; query: string; hidden: boolean }) {
  const bookable = canBook(s);
  return (
    <li
      hidden={hidden}
      className="group relative flex items-center gap-4 px-4 py-3 transition-colors duration-150 can-hover:hover:bg-tint-wash active:bg-tint-wash"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg md:text-base">
          <Highlighted text={s.title} query={query} />
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-2">
          <span className="num text-caption text-fg-muted">{formatDuration(s.durationMin)}</span>
          {s.package ? <Badge tone="mint">{t.packageBadge(s.sessions ?? 10)}</Badge> : null}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-5">
        <span className="num text-sm font-semibold text-fg">
          {s.priceRsd === null ? t.onRequest : formatRsd(s.priceRsd)}
        </span>
        {bookable ? (
          <BookLink serviceKey={s.key} title={s.title} stretch="mobile" />
        ) : (
          <a href={site.phone.href} className={TEL_LINK}>
            {s.package ? t.ask : t.call}
          </a>
        )}
      </span>
    </li>
  );
}
