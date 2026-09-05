"use client";

import { useRef, type ReactNode } from "react";
import { EASE_ENTER, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { formatNumber } from "@/lib/format";

/**
 * Sistem 2 iz docs/MOTION.md — ulaz svega što NIJE tekst: kartice, slike, swatch-evi,
 * ikone, brojevi, cele sekcije. Jedna komponenta, useGSAP + ScrollTrigger.
 *
 *   <Reveal>                  jedan element, fade-up 600 ms
 *   <Reveal stagger>          direktna deca ulaze redom, 70 ms razmaka
 *   <Reveal variant="clip">   fotografije: clip-path odozdo + scale 1.06 → 1, 700 ms
 *   <Reveal variant="count">  elementi sa data-count-to="144" broje od 0
 *   <Reveal delay={0.1}>
 *
 * - start "clamp(top 85%)", once: true — odigra se jednom i ostaje; clamp() da elementi
 *   u poslednjih 15% strane ipak okinu. Bez scrub-a (scrub je samo za hero).
 * - Animira se samo transform + opacity (clip varijanta je jedini izuzetak).
 * - gsap.matchMedia(): prefers-reduced-motion → odmah finalno stanje; mobilni → kraći put.
 *
 * PRAVILO: Reveal animira KONTEJNER, text-reveal (Sistem 1) reči unutra. Nikad oba na
 * istom čvoru. `count` varijanta zato sam sebi stavlja data-reveal="off" — broj i
 * njegova oznaka ulaze kao blok, bez reč-po-reč.
 */

export type RevealVariant = "fade" | "clip" | "count";

type Tag =
  | "div"
  | "section"
  | "article"
  | "ul"
  | "ol"
  | "li"
  | "figure"
  | "header"
  | "footer"
  | "aside"
  | "span";

export type RevealProps = {
  children: ReactNode;
  as?: Tag;
  className?: string;
  id?: string;
  variant?: RevealVariant;
  /** `true` = 0.07 s između dece; broj = sopstveni razmak. */
  stagger?: boolean | number;
  /** Odlaganje u sekundama od trenutka okidanja. */
  delay?: number;
  /** Početni pomeraj naviše u px (fade). */
  y?: number;
  "aria-label"?: string;
};

const DURATION = { fade: 0.6, clip: 0.7, count: 0.9 } as const;

export function Reveal({
  children,
  as: Tag = "div",
  className,
  id,
  variant = "fade",
  stagger = false,
  delay = 0,
  y = 24,
  "aria-label": ariaLabel,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const staggerEach = stagger === true ? 0.07 : typeof stagger === "number" ? stagger : 0;
      const targets: HTMLElement[] = staggerEach
        ? (Array.from(el.children) as HTMLElement[])
        : [el];
      const counters =
        variant === "count" ? Array.from(el.querySelectorAll<HTMLElement>("[data-count-to]")) : [];
      const countValue = (c: HTMLElement) => Number(c.dataset.countTo) || 0;

      const finish = () => {
        el.dataset.revealMotion = "done";
        gsap.set(targets, { clearProps: "willChange" });
      };

      const mm = gsap.matchMedia();
      // matchMedia poziva handler samo kad bar JEDAN uslov važi — mobile/desktop
      // zajedno pokrivaju sve širine, pa handler radi uvek; `reduce` je samo zastavica.
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          mobile: "(max-width: 767px)",
          desktop: "(min-width: 768px)",
        },
        (ctx) => {
          const { reduce, mobile } = ctx.conditions as { reduce: boolean; mobile: boolean };

          if (reduce) {
            for (const c of counters) c.textContent = formatNumber(countValue(c));
            el.dataset.revealMotion = "done";
            return;
          }

          const lift = mobile ? Math.round(y * 0.66) : y;
          const isClip = variant === "clip";
          const from = isClip
            ? { clipPath: "inset(100% 0 0 0)", scale: 1.06, willChange: "transform, clip-path" }
            : { opacity: 0, y: lift, willChange: "transform, opacity" };
          const to = isClip
            ? { clipPath: "inset(0% 0 0 0)", scale: 1, duration: DURATION.clip, ease: EASE_ENTER }
            : { opacity: 1, y: 0, duration: DURATION.fade, ease: EASE_ENTER };

          gsap.set(targets, from);
          for (const c of counters) c.textContent = formatNumber(0);
          // CSS više ne krije kontejner — inline stanje preuzima (ko krije, taj i otkriva)
          el.dataset.revealMotion = "armed";

          const tl = gsap.timeline({ paused: true, delay, onComplete: finish });
          tl.to(
            targets,
            {
              ...to,
              stagger: staggerEach ? (mobile ? Math.min(staggerEach, 0.05) : staggerEach) : 0,
            },
            0,
          );
          for (const c of counters) {
            const proxy = { v: 0 };
            const target = countValue(c);
            tl.to(
              proxy,
              {
                v: target,
                duration: DURATION.count,
                ease: "power2.out",
                onUpdate: () => {
                  c.textContent = formatNumber(proxy.v);
                },
              },
              0.1,
            );
          }

          ScrollTrigger.create({
            trigger: el,
            start: "clamp(top 85%)",
            once: true,
            onEnter: () => tl.play(),
          });

          return () => {
            tl.kill();
          };
        },
      );
    },
    { scope: ref, dependencies: [variant, stagger, delay, y] },
  );

  return (
    <Tag
      // @ts-expect-error — jedan ref za više HTML tagova
      ref={ref}
      id={id}
      className={className}
      aria-label={ariaLabel}
      data-reveal-motion="pending"
      data-reveal={variant === "count" ? "off" : undefined}
    >
      {children}
    </Tag>
  );
}
