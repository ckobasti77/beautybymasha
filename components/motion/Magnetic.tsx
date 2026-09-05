"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Magnetni hover (DNA cursor_effects.magnetic-buttons): element blago prati kursor
 * unutar zone od 24 px oko sebe, pa se elastično vrati. Radi samo sa pravim mišem
 * (hover + fine pointer) i bez prefers-reduced-motion — na touch se ne kači ništa.
 * Pomera se unutrašnji omotač (GSAP x/y), pa hover transform samog dugmeta ne smeta.
 */
export function Magnetic({
  children,
  className,
  style,
  strength = 6,
  zone = 24,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Maksimalni pomeraj u px. */
  strength?: number;
  /** Zona oko elementa u px. */
  zone?: number;
  disabled?: boolean;
}) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i || !contextSafe || disabled) return;

      const mm = gsap.matchMedia();
      mm.add("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const xTo = gsap.quickTo(i, "x", { duration: 0.4, ease: "power3.out" });
        const yTo = gsap.quickTo(i, "y", { duration: 0.4, ease: "power3.out" });
        const clamp = gsap.utils.clamp(-strength, strength);

        const onMove = contextSafe((e: PointerEvent) => {
          const r = i.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          xTo(clamp(dx * 0.18));
          yTo(clamp(dy * 0.18));
        });
        const onLeave = contextSafe(() => {
          gsap.to(i, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
        });

        o.addEventListener("pointermove", onMove);
        o.addEventListener("pointerleave", onLeave);
        return () => {
          o.removeEventListener("pointermove", onMove);
          o.removeEventListener("pointerleave", onLeave);
        };
      });
    },
    { scope: outer, dependencies: [strength, disabled] },
  );

  return (
    // data-reveal="off": omotač je span bez sopstvenog teksta — text-reveal ga ne sme uzeti
    // (CSS bi ga sakrio kao kandidata, a dugme unutra je ionako chrome).
    <span
      ref={outer}
      data-reveal="off"
      className={["inline-flex", className].filter(Boolean).join(" ")}
      style={{ padding: zone, margin: -zone, ...style }}
    >
      <span ref={inner} className="inline-flex will-change-transform">
        {children}
      </span>
    </span>
  );
}
