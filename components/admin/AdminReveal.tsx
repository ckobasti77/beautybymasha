"use client";

import { useRef, type ReactNode } from "react";
import { EASE_ENTER, gsap, useGSAP } from "@/lib/gsap";

/**
 * Ulaz liste u panelu: deca stižu redom, 40 ms razmaka, jednom — pri montiranju.
 *
 * Namerno NIJE `components/motion/Reveal.tsx`: tamo ulaz visi o ScrollTrigger-u,
 * a ovde se tab menja bez skrola, pa bi lista ostala nevidljiva. Ovde nema
 * trigera — otvorila je tab, sadržaj je stigao.
 *
 * Animiraju se samo `transform` i `opacity` (gsap-performance). `clearProps`
 * skida i `will-change` čim se odigra, da desetine kartica ne drže slojeve
 * kompozitora do kraja sesije. `gsap.matchMedia` gasi sve uz reduced-motion.
 */
/** Najduži ukupan razmak ulaza, u sekundama (docs/MOTION.md). */
const MAX_STAGGER_WINDOW = 0.45;

export function AdminReveal({
  children,
  className,
  stagger = 0.04,
  deps,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  /** Promena ove vrednosti pušta ulaz ponovo (npr. druga nedelja u kalendaru). */
  deps?: unknown;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>("[data-enter]");
      if (items.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add(
        { reduced: "(prefers-reduced-motion: reduce)", full: "(prefers-reduced-motion: no-preference)" },
        (ctx) => {
          if (ctx.conditions?.reduced) {
            gsap.set(items, { clearProps: "all" });
            return;
          }
          // `amount`, ne `each`: katalog ume da ima 70 kartica, a razmak po
          // kartici bi ih razvukao preko 1,5 s. docs/MOTION.md daje najviše
          // ~1,2 s po ekranu, pa se ceo niz uvek uklopi u isti prozor.
          gsap.fromTo(
            items,
            { opacity: 0, y: 8 },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              ease: EASE_ENTER,
              stagger: { amount: Math.min(MAX_STAGGER_WINDOW, items.length * stagger) },
              clearProps: "transform,opacity,willChange",
            },
          );
        },
      );
      return () => mm.revert();
    },
    { scope, dependencies: [deps, stagger], revertOnUpdate: true },
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
