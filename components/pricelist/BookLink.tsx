"use client";

import type { MouseEvent } from "react";
import { ArrowRight } from "lucide-react";
import { bookingHash, emitBooking } from "@/lib/sectionIntent";
import { priceList as t } from "./strings";

/**
 * „Zakažite" u cenovniku — pravi link na `#zakazivanje?usluga=<key>`, ne dugme:
 *  - pre hidratacije browser samo postavi hash (nema mete, pa nema skoka), a čarobnjak
 *    ga pročita pri montiranju; sa JS-om link ne skače nego javi čarobnjaku
 *    (`emitBooking`), koji glatko doskroluje i upiše uslugu;
 *  - `stopPropagation`: React sluša na `document`, Lenis (`anchors: true`) na `window`,
 *    a Lenis ne sme da vidi hash sa `?` (traži `getElementById` i upozorava);
 *  - srednji klik i Ctrl/Cmd+klik ostaju browseru (otvaranje u novom tabu).
 *
 * `stretch`: „mobile" rasteže dodirnu površinu preko cele kartice reda ispod `md`
 * (stretched link — jedno interaktivno u redu, tekst na desktopu ostaje selektabilan),
 * „always" preko cele kartice na svim širinama (kartice „Najčešće").
 */
export function BookLink({
  serviceKey,
  title,
  stretch = "none",
  className,
}: {
  serviceKey: string;
  title: string;
  stretch?: "none" | "mobile" | "always";
  className?: string;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    emitBooking(serviceKey);
  };

  return (
    <a
      href={bookingHash(serviceKey)}
      aria-label={t.bookAria(title)}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center gap-1 whitespace-nowrap font-semibold focus-ring",
        "text-caption text-link",
        "md:min-h-11 md:rounded-pill md:border md:border-line md:bg-bg-elev md:px-4 md:text-sm md:text-fg",
        "md:transition-[background-color,border-color,color] md:duration-150",
        "md:group-hover:border-brand md:group-hover:bg-brand md:group-hover:text-brand-fg",
        stretch === "always"
          ? "after:absolute after:inset-0"
          : stretch === "mobile"
            ? "max-md:after:absolute max-md:after:inset-0"
            : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {t.book}
      <ArrowRight size={14} strokeWidth={2} aria-hidden className="md:hidden" />
    </a>
  );
}
