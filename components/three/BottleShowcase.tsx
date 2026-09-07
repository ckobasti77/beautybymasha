"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useCanvasActive, useWebGLAllowed } from "@/lib/webgl";
import type { BottleDrivers } from "./BottleScene";

/**
 * Bočica laka u boji proizvoda: spora rotacija, prevlačenje da se okrene.
 *
 * Kapija je ista kao za hero shader (ADR-005, `lib/webgl.ts`): nikad na mobilnom,
 * nikad uz `prefers-reduced-motion`, nikad bez WebGL2. Kad ne sme, prikazuje se
 * `fallback` — swatch krug ili fotografija proizvoda. 3D je ukras iznad sadržaja
 * koji već postoji, a ne sadržaj sam.
 *
 * Scena se učitava tek kad kapija propusti (`next/dynamic`, `ssr: false`), pa
 * `three` ne ulazi u početni JS nijedne strane.
 */

const BottleScene = dynamic(() => import("./BottleScene"), { ssr: false });

export function BottleShowcase({
  hex,
  label,
  caption,
  className,
  fallback = null,
}: {
  /** Boja tečnosti, `#RRGGBB`. */
  hex: string;
  /** Šta čitač ekrana kaže umesto platna. Platno je `aria-hidden`. */
  label: string;
  /**
   * Natpis ispod bočice. Stoji ovde, a ne u strani, da ga na mobilnom ne bi bilo
   * uopšte: tekst u `display:none` kutiji nikad ne pređe u kadar, pa bi zauvek
   * ostao `data-reveal-state="pending"` (docs/MOTION.md → provera).
   */
  caption?: string;
  className?: string;
  /** Prikazuje se kad 3D ne sme: swatch krug ili slika proizvoda. */
  fallback?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { allowed } = useWebGLAllowed();
  const active = useCanvasActive(rootRef, allowed);

  // Mutable kutija van React-a: prevlačenje piše u nju na svaki pomeraj pokazivača,
  // a scena je čita u `useFrame`. Kroz state bi svaki piksel bio jedan re-render.
  const [drivers] = useState<BottleDrivers>(() => ({
    dragX: { current: 0 },
    dragY: { current: 0 },
    dragging: { current: false },
  }));

  /* ---- prevlačenje: pokazivač se hvata na elementu, pušta bilo gde ---- */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !allowed) return;

    let pointerId: number | null = null;
    let last = { x: 0, y: 0 };

    const down = (e: PointerEvent) => {
      if (pointerId !== null || e.button !== 0) return;
      pointerId = e.pointerId;
      last = { x: e.clientX, y: e.clientY };
      drivers.dragging.current = true;
      el.setPointerCapture(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      drivers.dragX.current += e.clientX - last.x;
      drivers.dragY.current += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      drivers.dragging.current = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      drivers.dragging.current = false;
    };
  }, [allowed, drivers]);

  if (!allowed) return <>{fallback}</>;

  return (
    <>
      <div
        ref={rootRef}
        role="img"
        aria-label={label}
        // `touch-none` nije potrebno: kapija ionako ne pušta 3D na dodirnim širinama.
        className={["relative cursor-grab select-none active:cursor-grabbing", className]
          .filter(Boolean)
          .join(" ")}
      >
        <Suspense fallback={fallback}>
          <BottleScene hex={hex} drivers={drivers} active={active} />
        </Suspense>
      </div>
      {caption ? <p className="mt-2 text-caption text-fg-muted">{caption}</p> : null}
    </>
  );
}
