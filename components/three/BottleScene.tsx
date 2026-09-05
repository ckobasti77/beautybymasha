"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { BottleModel } from "./BottleModel";

/**
 * WebGL sloj bočice na zidu shopa. Montira se SAMO kad `BottleShowcase` utvrdi da smemo
 * (WebGL2, desktop širina, bez `prefers-reduced-motion`) — vidi `lib/webgl.ts`.
 * Zato ovde nema nijedne provere sposobnosti: odluka je već doneta.
 *
 * Sama bočica (mreže, materijali, okruženje) je u `BottleModel.tsx` — deli je sa herojem.
 * Ovde je samo ono što je specifično za shop: spora rotacija i prevlačenje.
 * Bez postprocessinga i bez senki (docs/3D-ASSETS.md): jedno usmereno svetlo + studio
 * okruženje iz `RoomEnvironment`.
 */

/**
 * Šta showcase gura u scenu spolja, van React state-a.
 *
 * Brojači su KUMULATIVNI i scena ih samo čita: pamti koliko je već videla i
 * računa razliku. Da ih scena prazni, pisala bi po tuđem prop-u — a to je i
 * pravilo React compiler-a i, praktičnije, izvor bagova kad se scena remontira.
 */
export type BottleDrivers = {
  /** Ukupan horizontalni pomeraj prevlačenja od montiranja, u pikselima. */
  readonly dragX: { current: number };
  /** Isto po vertikali — daje blago naginjanje. */
  readonly dragY: { current: number };
  /** Drži li korisnik trenutno bočicu. */
  readonly dragging: { current: boolean };
};

/** Spora rotacija u praznom hodu, rad/s. */
const IDLE_SPIN = 0.32;
/** Koliko radijana nosi jedan piksel prevlačenja. */
const DRAG_SENSITIVITY = 0.007;
/** Koliko brzo se posle puštanja vraća na sporu rotaciju. */
const SPIN_SETTLE = 0.035;
/** Granica naginjanja napred-nazad, u radijanima. */
const TILT_LIMIT = 0.28;
/** Posle pauze (`demand`, drugi tab) prvi `delta` ume da bude ogroman. */
const MAX_DELTA = 1 / 30;

function Bottle({ hex, drivers }: { hex: string; drivers: BottleDrivers }) {
  const group = useRef<Group>(null);
  const seenX = useRef(0);
  const seenY = useRef(0);
  const spin = useRef(IDLE_SPIN);
  const tilt = useRef(0);

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, MAX_DELTA);

    const dx = drivers.dragX.current - seenX.current;
    const dy = drivers.dragY.current - seenY.current;
    seenX.current = drivers.dragX.current;
    seenY.current = drivers.dragY.current;

    if (drivers.dragging.current) {
      g.rotation.y += dx * DRAG_SENSITIVITY;
      // Brzina se pamti da bi bočica posle puštanja nastavila po inerciji.
      spin.current = delta > 0 ? (dx * DRAG_SENSITIVITY) / delta : spin.current;
      tilt.current = Math.max(
        -TILT_LIMIT,
        Math.min(TILT_LIMIT, tilt.current + dy * DRAG_SENSITIVITY),
      );
    } else {
      spin.current += (IDLE_SPIN - spin.current) * SPIN_SETTLE;
      g.rotation.y += spin.current * delta;
      tilt.current += (0 - tilt.current) * SPIN_SETTLE * 2;
    }
    g.rotation.x = tilt.current;
  });

  return <BottleModel hex={hex} groupRef={group} />;
}

export default function BottleScene({
  hex,
  drivers,
  active,
}: {
  /** Boja tečnosti, `#RRGGBB` iz `data/products.json`. */
  hex: string;
  drivers: BottleDrivers;
  /** `false` kad blok izađe iz kadra ili se tab sakrije — tada se ne crta ništa. */
  active: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 21], fov: 30, near: 1, far: 60 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={active ? "always" : "demand"}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <directionalLight position={[6, 8, 5]} intensity={1.1} />
      <Bottle hex={hex} drivers={drivers} />
    </Canvas>
  );
}
