"use client";

import type { RefObject } from "react";
import { ProductSwatch } from "@/components/shop/ProductSwatch";

/**
 * Bez 3D bočice (≤ 1023 px; ADR-005 drži WebGL van telefona, a 769–1023 ima shader bez bočice):
 * velika `ProductSwatch` kap desno od naslova ciklira iste boje kao bočica (spec 13 → H) —
 * hvatanje boje na prvi skrol tako ostaje vidljivo i na telefonu. Sav pokret vozi `Hero.tsx`
 * kroz ove ref-ove, isti motor i isti `p` kao za bočicu:
 *  - `swatchRef` → `--sw` (boja kapi) na svaki tik ciklusa;
 *  - `dropRef`   → pad do dna stage-a 0.30–0.40 (samo transform), pa `visibility: hidden`;
 *  - `pourRef`   → prosipanje 0.36–0.78: unapred nacrtan krug (`.hero-pour`) sa centrom u tački
 *    sletanja, `scale` 0 → 1 (compositor; radial-gradient preko celog kadra po frejmu bi
 *    repaint-ovao ceo prvi ekran na telefonu).
 *
 * `HeroDrop` stoji u copy kontejneru (naslov mu ostavlja mesto, `max-lg:pr-24`), `HeroPour`
 * u stage-u — krug mora da preživi izlazak copy-ja. `.sw` nosi `container-type`, pa krug ne
 * sme u njega. Montira se tek posle hidratacije (media query), apsolutno — CLS 0.
 */
export function HeroDrop({
  hex,
  swatchRef,
  dropRef,
}: {
  hex: string;
  swatchRef: RefObject<HTMLSpanElement | null>;
  dropRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={dropRef} aria-hidden className="pointer-events-none absolute right-0 top-0 w-20 md:w-24">
      <ProductSwatch ref={swatchRef} hex={hex} finish="creme" className="w-full" />
    </div>
  );
}

export function HeroPour({ pourRef }: { pourRef: RefObject<HTMLDivElement | null> }) {
  return <div ref={pourRef} aria-hidden className="hero-pour" />;
}
