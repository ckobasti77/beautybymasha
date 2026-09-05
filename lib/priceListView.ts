/**
 * Šta se u cenovniku vidi za dato stanje (čip · pod-čip · upit). Čista funkcija:
 * svih 144 stavki je uvek u DOM-u (pretraživači ih vide), a ovo samo kaže koji red,
 * dodatak i grupa nose `hidden`. Bez React-a — testira se u node-u.
 *
 * Tri režima, uvek tačno jedan:
 *  - `preview` (bez čipa i upita): „Najčešće" + prvih PREVIEW_ROWS redova prve grupe
 *    svakog čipa + dugme „Sve usluge u grupi …";
 *  - `chip`: sve grupe čipa (ili samo pod-čip), svi redovi i dodaci;
 *  - `search`: pretraga preko svih grupa; čip se ignoriše, pa nema skrivenih pogodaka.
 */
import {
  PREVIEW_ROWS,
  PRICE_CHIPS,
  addonsOf,
  chipByKey,
  rowCountOfChip,
  rowsOf,
  type PriceChipKey,
} from "./priceList";
import { matchesQuery } from "./serviceSearch";
import { SERVICE_GROUP_KEYS, type ServiceGroupKey } from "./services";

export type PriceListState = {
  readonly chip: PriceChipKey | null;
  readonly sub: ServiceGroupKey | null;
  readonly query: string;
};

export type PriceListMode = "preview" | "chip" | "search";

export type PriceListView = {
  readonly mode: PriceListMode;
  readonly showMostWanted: boolean;
  readonly visibleGroups: ReadonlySet<ServiceGroupKey>;
  readonly visibleRows: ReadonlySet<string>;
  readonly visibleAddons: ReadonlySet<string>;
  /** Čipovi čija prva grupa u pregledu dobija dugme „Sve usluge u grupi …". */
  readonly previewMore: ReadonlySet<PriceChipKey>;
  readonly rowCount: number;
  readonly addonCount: number;
};

export function computeView(state: PriceListState): PriceListView {
  const query = state.query.trim();
  const groups = new Set<ServiceGroupKey>();
  const rows = new Set<string>();
  const addons = new Set<string>();
  const more = new Set<PriceChipKey>();

  if (query) {
    for (const g of SERVICE_GROUP_KEYS) {
      for (const s of rowsOf(g)) {
        if (matchesQuery(s, query)) {
          rows.add(s.key);
          groups.add(g);
        }
      }
      for (const a of addonsOf(g)) {
        if (matchesQuery(a, query)) {
          addons.add(a.key);
          groups.add(g);
        }
      }
    }
    return {
      mode: "search",
      showMostWanted: false,
      visibleGroups: groups,
      visibleRows: rows,
      visibleAddons: addons,
      previewMore: more,
      rowCount: rows.size,
      addonCount: addons.size,
    };
  }

  if (state.chip) {
    const chip = chipByKey(state.chip);
    for (const g of chip.groups) {
      if (state.sub && chip.groups.includes(state.sub) && g !== state.sub) continue;
      groups.add(g);
      for (const s of rowsOf(g)) rows.add(s.key);
      for (const a of addonsOf(g)) addons.add(a.key);
    }
    return {
      mode: "chip",
      showMostWanted: false,
      visibleGroups: groups,
      visibleRows: rows,
      visibleAddons: addons,
      previewMore: more,
      rowCount: rows.size,
      addonCount: addons.size,
    };
  }

  for (const chip of PRICE_CHIPS) {
    const first = chip.groups[0];
    groups.add(first);
    for (const s of rowsOf(first).slice(0, PREVIEW_ROWS)) rows.add(s.key);
    if (rowCountOfChip(chip) > PREVIEW_ROWS) more.add(chip.key);
  }
  return {
    mode: "preview",
    showMostWanted: true,
    visibleGroups: groups,
    visibleRows: rows,
    visibleAddons: addons,
    previewMore: more,
    rowCount: rows.size,
    addonCount: 0,
  };
}
