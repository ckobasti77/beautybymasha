"use client";

import type { MouseEvent, ReactNode } from "react";
import { emitPriceGroup, priceHash } from "@/lib/sectionIntent";
import type { ServiceGroupKey } from "@/lib/services";

/**
 * Krug iz sekcije Usluge → cenovnik sa uključenim čipom te grupe. Pravo sidro
 * (`#cenovnik-<grupa>`, radi i bez JS-a); sa JS-om ne skače nego javi cenovniku
 * (`emitPriceGroup`), koji uključi čip pa glatko doskroluje do naslova grupe.
 * `stopPropagation` zaustavlja bubble pre Lenis-ovog `window` slušaoca (`anchors`),
 * da ne bi dva skrola išla u isto mesto. Srednji klik i Ctrl/Cmd+klik ostaju browseru.
 */
export function PriceGroupLink({
  group,
  className,
  children,
}: {
  group: ServiceGroupKey;
  className?: string;
  children: ReactNode;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    emitPriceGroup(group);
  };
  return (
    <a href={priceHash(group)} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
