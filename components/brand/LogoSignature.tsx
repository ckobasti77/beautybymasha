"use client";

import { useRef, type RefObject } from "react";
import { Logo, type LogoProps } from "./Logo";
import { gsap, useGSAP } from "@/lib/gsap";

const SESSION_KEY = "bbm-logo-drawn";

/** Ručka na intro ispis: hero (korak 14) ga prekida kad `p` preuzme putanje potpisa. */
export type SignatureIntro = {
  /** Prekini ispis na tekućem stanju i ostavi potpis nacrtan (dasharray L, offset 0, popuna 1). */
  finish(): void;
};

/**
 * Logo čiji se rukopisni deo („by Masha") ispisuje stroke-dashoffset animacijom:
 * slovo po slovo, 900 ms, ease-out, pa se popuna pojavi. Jednom po sesiji —
 * posle toga (i uz prefers-reduced-motion) logo je odmah gotov.
 * DNA: visual_effects.svg_animations (logo-reveal).
 *
 * Glifovi su sakriveni CSS-om (globals.css, `[data-logo-sig="pending"]`) dok GSAP ne
 * postavi dasharray, pa nema bljeska gotovog loga pre ispisa.
 *
 * `introRef` dobija `finish()`: hero ga zove pre nego što počne da BRIŠE potpis iz skrola —
 * nikad dva pisca na istim putanjama. Posle `finish()` dasharray ostaje (hero ga vozi dalje).
 */
export function LogoSignature({
  once = true,
  className,
  introRef,
  ...logo
}: Omit<LogoProps, "animate"> & { once?: boolean; className?: string; introRef?: RefObject<SignatureIntro | null> }) {
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
      const handOver = (fn: () => void) => {
        if (introRef) introRef.current = { finish: fn };
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
        handOver(() => undefined);
      });
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (drawn) {
          finish();
          handOver(() => undefined);
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

        const play = gsap.to(draw, {
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
            handOver(() => undefined);
          },
        });
        // Prekid iz heroja: ostavi nacrtano stanje SA dasharray-om — hero odatle briše.
        handOver(() => {
          play.kill();
          draw.kill();
          gsap.set(paths, { strokeDashoffset: 0, fillOpacity: 1, strokeOpacity: 0 });
          group.dataset.logoSig = "done";
          handOver(() => undefined);
        });
      });

      return () => {
        if (introRef) introRef.current = null;
      };
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
