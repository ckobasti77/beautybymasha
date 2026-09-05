"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { useOptionalLenis } from "@/components/providers/SmoothScroll";
import { Button } from "@/components/ui/Button";
import { ScrollTrigger } from "@/lib/gsap";
import { PRICE_CHIPS, chipOfGroup, type PriceChipKey } from "@/lib/priceList";
import { computeView } from "@/lib/priceListView";
import { PRICE_EVENT, parsePriceHash, type PriceDetail } from "@/lib/sectionIntent";
import { isServiceGroupKey, services, type ServiceGroupKey } from "@/lib/services";
import { site } from "@/lib/site";
import { useHashIntent } from "@/lib/useHashIntent";
import { GroupBlock } from "./GroupBlock";
import { MostWanted } from "./MostWanted";
import { StickyBar } from "./StickyBar";
import { priceList as t } from "./strings";

/**
 * Cenovnik kao alat (spec 11 A): lepljivi čipovi grupa + pretraga sa sinonimima,
 * „Najčešće" na vrhu, dodaci kao čipovi, „Zakažite" na svakom redu.
 *
 * Svih 144 stavki je uvek u DOM-u; `computeView` (lib/priceListView.ts) samo kaže šta
 * nosi `hidden`. Pretraga i čip se isključuju: kucanje briše čip (pretraga ide preko
 * svih grupa, nema skrivenih pogodaka), izbor čipa briše upit.
 *
 * Skrol: posle promene čipa lista ume da počne iznad kadra (gost je bio duboko u
 * dugoj grupi) — tada se vrati na početak liste. Deep link `#cenovnik-<grupa>`
 * (krugovi iz sekcije Usluge, lib/sectionIntent.ts) postavi čip pa doskroluje do
 * naslova grupe. Oba skrola idu iz efekta posle commit-a, kad je raspored gotov.
 *
 * `ScrollTrigger.refresh()` posle promene vidljivog skupa: visina strane se menja, a
 * `Reveal` sekcije ispod (Lokacije, Recenzije) imaju `once` trigere sa keširanim
 * startom — bez osvežavanja bi ušle prekasno.
 */

type PendingScroll = { group: ServiceGroupKey; initial: boolean };

const NAV_HEIGHT = () => (window.matchMedia("(min-width: 768px)").matches ? 80 : 64);

/**
 * Pozicija u dokumentu bez uticaja transformacija: lista je u `Reveal` kontejneru
 * koji pre ulaska stoji na `translateY(24px)`, pa bi `getBoundingClientRect` dao
 * metu 24 px prenisko.
 */
function documentTop(el: HTMLElement): number {
  let y = 0;
  let node: HTMLElement | null = el;
  while (node) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

export function PriceBrowser() {
  const [chip, setChip] = useState<PriceChipKey | null>(null);
  const [sub, setSub] = useState<ServiceGroupKey | null>(null);
  const [query, setQuery] = useState("");
  const lenis = useOptionalLenis();

  const barRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingGroup = useRef<PendingScroll | null>(null);
  const pendingListTop = useRef(false);
  const mounted = useRef(false);

  const view = useMemo(() => computeView({ chip, sub, query }), [chip, sub, query]);

  const pickChip = (next: PriceChipKey | null) => {
    setChip(next);
    setSub(null);
    setQuery("");
    pendingListTop.current = true;
  };
  const pickSub = (group: ServiceGroupKey | null) => {
    setSub(group);
    pendingListTop.current = true;
  };
  const onQuery = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setChip(null);
      setSub(null);
    }
  };

  useHashIntent<ServiceGroupKey>({
    event: PRICE_EVENT,
    parseHash: parsePriceHash,
    fromEvent: (e) => {
      const d = e.detail as PriceDetail | undefined;
      return d && isServiceGroupKey(d.group) ? d.group : null;
    },
    onIntent: (group, { initial }) => {
      setChip(chipOfGroup(group).key);
      setSub(null);
      setQuery("");
      pendingGroup.current = { group, initial };
    },
  });

  // Posle svake promene prikaza: odloženi skrolovi (raspored je gotov) + refresh trigera.
  useEffect(() => {
    const bar = barRef.current;
    const offset = () => (bar ? bar.getBoundingClientRect().height : 0) + NAV_HEIGHT() + 12;
    const smooth = lenis?.current;
    const jump = (y: number, immediate: boolean) => {
      const top = Math.max(0, y);
      if (smooth && !immediate) smooth.scrollTo(top, { duration: 0.8 });
      else window.scrollTo({ top });
    };

    const target = pendingGroup.current;
    const heading = target ? document.getElementById(`cenovnik-${target.group}`) : null;
    // Naslov skrivene grupe nema kutiju (offsetParent null): pri montiranju je čip tek
    // zatražen, pa skok čeka sledeći prolaz — kad se grupa pojavi.
    if (target && heading && heading.offsetParent) {
      pendingGroup.current = null;
      pendingListTop.current = false;
      jump(documentTop(heading) - offset(), target.initial);
    } else if (!target && pendingListTop.current) {
      pendingListTop.current = false;
      const list = listRef.current;
      if (list && bar) {
        const barBottom = bar.getBoundingClientRect().bottom;
        const top = documentTop(list) - window.scrollY;
        if (top < barBottom - 1) jump(documentTop(list) - offset(), false);
      }
    }

    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [view, lenis]);

  const countText =
    view.mode === "search"
      ? t.count.search(view.rowCount + view.addonCount, query.trim())
      : view.mode === "chip"
        ? t.count.chip(view.rowCount, view.addonCount)
        : t.count.all(services.length, PRICE_CHIPS.length);

  const empty = view.mode === "search" && view.rowCount + view.addonCount === 0;

  return (
    <div>
      <StickyBar
        barRef={barRef}
        query={query}
        chip={chip}
        sub={sub}
        countText={countText}
        onQuery={onQuery}
        onChip={pickChip}
        onSub={pickSub}
      />

      <Reveal className="mt-6" delay={0.1}>
        <div ref={listRef}>
          <MostWanted hidden={!view.showMostWanted} />

          <div hidden={!empty} data-reveal="off" className="rounded-lg border border-line bg-bg-sunken p-6">
            <p className="text-fg">{t.empty.text(query.trim())}</p>
            <p className="mt-4">
              <Button as="a" href={site.phone.href} variant="ghost" magnetic={false} leading={<Phone size={16} strokeWidth={1.5} aria-hidden />}>
                {t.empty.call}
              </Button>
            </p>
          </div>

          {PRICE_CHIPS.map((c) =>
            c.groups.map((g, i) => (
              <GroupBlock
                key={g}
                group={g}
                chip={c}
                first={i === 0}
                view={view}
                query={query}
                onShowAll={() => pickChip(c.key)}
              />
            )),
          )}
        </div>
      </Reveal>
    </div>
  );
}
