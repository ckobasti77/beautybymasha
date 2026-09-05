"use client";

import { useRef } from "react";
import { Logo, type LogoProps } from "./Logo";
import { gsap, useGSAP } from "@/lib/gsap";

const SESSION_KEY = "bbm-logo-drawn";

/**
 * Logo čiji se rukopisni deo („by Masha") ispisuje stroke-dashoffset animacijom:
 * slovo po slovo, 900 ms, ease-out, pa se popuna pojavi. Jednom po sesiji —
 * posle toga (i uz prefers-reduced-motion) logo je odmah gotov.
 * DNA: visual_effects.svg_animations (logo-reveal).
 *
 * Glifovi su sakriveni CSS-om (globals.css, `[data-logo-sig="pending"]`) dok GSAP ne
 * postavi dasharray, pa nema bljeska gotovog loga pre ispisa.
 */
export function LogoSignature({
  once = true,
  className,
  ...logo
}: Omit<LogoProps, "animate"> & { once?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const host = ref.current;
      if (!host) return;
      const group = host.querySelector<SVGGElement>("[data-logo-sig]");
      const paths = [...host.querySelectorAll<SVGPathElement>("[data-sig-glyph]")];
      if (!group || !paths.length) return;

      const finish = () => {
        group.dataset.logoSig = "done";
        gsap.set(paths, { clearProps: "strokeDasharray,strokeDashoffset,strokeOpacity,fillOpacity" });
        // stroke ostaje u markup-u ali nevidljiv — oblik glifa je tačan
        gsap.set(paths, { strokeOpacity: 0 });
      };

      let drawn = false;
      try {
        drawn = once && window.sessionStorage.getItem(SESSION_KEY) === "1";
      } catch {
        /* privatni režim */
      }

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        finish();
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (drawn) {
          finish();
          return;
        }
        const lengths = paths.map((p) => p.getTotalLength());
        const total = lengths.reduce((a, b) => a + b, 0);

        gsap.set(paths, {
          strokeDasharray: (i: number) => lengths[i],
          strokeDashoffset: (i: number) => lengths[i],
          strokeOpacity: 1,
          fillOpacity: 0,
        });
        group.dataset.logoSig = "armed";

        // Ispis: glif za glifom, trajanje proporcionalno dužini konture; ceo timeline
        // se zatim pušta kroz jedan ease-out od 900 ms.
        const draw = gsap.timeline({ paused: true });
        let at = 0;
        paths.forEach((p, i) => {
          const d = lengths[i] / total;
          draw.to(p, { strokeDashoffset: 0, duration: d, ease: "none" }, at);
          at += d;
        });
        draw.to(paths, { fillOpacity: 1, duration: 0.25, ease: "power2.out" }, 0.8);
        draw.to(paths, { strokeOpacity: 0, duration: 0.2, ease: "power2.out" }, 0.95);

        gsap.to(draw, {
          progress: 1,
          duration: 0.9 * draw.duration(),
          ease: "power2.out",
          onComplete: () => {
            try {
              if (once) window.sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              /* ignorisano */
            }
            group.dataset.logoSig = "done";
          },
        });
      });
    },
    { scope: ref },
  );

  // data-reveal="off": span bez teksta bi inače ostao sakriven CSS-om iz hideCss()
  return (
    <span ref={ref} className={className} data-reveal="off">
      <Logo {...logo} animate />
    </span>
  );
}

/** Za kontrolnu tablu: zaboravi da je ispis već odigran u ovoj sesiji. */
export function forgetLogoDrawn() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorisano */
  }
}
