"use client";

import { Badge } from "@/components/ui/Badge";
import { formatNumber } from "@/lib/format";
import type { Service } from "@/lib/services";
import { Highlighted } from "./ServiceRow";
import { priceList as t } from "./strings";

/**
 * Dodaci (`addon: true`) nisu redovi nego čipovi ispod grupe: „French +300 ·
 * Nail art +150". Biraju se u salonu, pa nemaju „Zakažite". U pretrazi ostaju samo
 * oni koji pogađaju upit.
 */
export function AddonChips({
  addons,
  visible,
  query,
  hidden,
}: {
  addons: readonly Service[];
  visible: ReadonlySet<string>;
  query: string;
  hidden: boolean;
}) {
  if (addons.length === 0) return null;
  return (
    <div hidden={hidden} data-reveal="off" className="mt-3">
      <p className="text-caption text-fg-muted">{t.addons}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {addons.map((a) => (
          <li key={a.key} hidden={!visible.has(a.key)}>
            <Badge tone="neutral" className="min-h-7">
              <Highlighted text={a.title} query={query} />
              <span className="num text-fg">+{formatNumber(a.priceRsd ?? 0)}</span>
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
