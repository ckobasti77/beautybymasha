"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import { HERO_PALETTE } from "@/components/hero/liquidShader";
import type { HeroDrivers } from "@/components/hero/heroDrivers";
import { bottleLayout, heroChoreography } from "@/lib/heroChoreography";
import { TOTAL_HEIGHT } from "./bottleGeometry";
import { BottleModel } from "./BottleModel";

/**
 * Bočica u heroju (spec 12 → B, C, E): desna polovina kadra, ~62 % visine, tečnost brend
 * mint. Živi u ISTOM canvasu sa shaderom (`components/hero/LiquidCanvas.tsx`), ispred
 * fullscreen ravni, u perspektivnoj kameri.
 *
 * Tri sloja pokreta, sva na transformu grupe, nula React state-a po frejmu:
 *  - idle: lebdenje po y (±1,5 % visine kadra, period 6 s) i blagi yaw (±7°, 11 s)
 *  - pointer: do ±6° ka kursoru, lerp 0.05 (na touch širinama canvas se i ne montira)
 *  - skrol: `lib/heroChoreography.ts` — nagib ka copy-ju, pa smanjivanje, drift ka
 *    centru i nestajanje; `drivers.scroll` (0..1) se glača lerp-om 0.12 kao i `uScroll`.
 *
 * Staklo (`transmission`) refraktuje shader ravan jer su u istoj sceni; taj prolaz crta
 * scenu još jednom u render target — `transmissionResolutionScale` 0.5 (postavlja ga
 * `LiquidCanvas` pri stvaranju renderera) ga svodi na četvrtinu piksela (budžet E), a
 * razlika se na staklu ne vidi.
 */

const FLOAT_PERIOD = 6;
/** Amplituda lebdenja kao deo vidljive visine kadra. */
const FLOAT_AMP = 0.015;
const YAW_PERIOD = 11;
const YAW_DEG = 7;
const POINTER_DEG = 6;
const POINTER_LERP = 0.05;
const SCROLL_LERP = 0.12;
/** Posle pauze (`demand`, drugi tab) prvi `delta` ume da bude ogroman. */
const MAX_DELTA = 1 / 30;
/** Spec B: okruženje sa niskim intenzitetom, da bočica ne blešti preko shadera. */
const ENV_INTENSITY = 0.6;

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export function HeroBottle({ drivers }: { drivers: HeroDrivers }) {
  const group = useRef<Group>(null);
  // Vidljiva širina/visina scene u koordinatnom početku, u jedinicama scene (prati resize).
  const viewport = useThree((s) => s.viewport);

  // Ref koji `BottleModel` čita svakog frejma — kroz state bi svaki frejm bio
  // re-render tri materijala.
  const opacityRef = useRef(1);

  const time = useRef(0);
  const scroll = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((_, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, MAX_DELTA);
    time.current += delta;

    scroll.current += (drivers.scroll.current - scroll.current) * SCROLL_LERP;
    const target = drivers.pointer.current;
    pointer.current.x += (target.x - pointer.current.x) * POINTER_LERP;
    pointer.current.y += (target.y - pointer.current.y) * POINTER_LERP;

    const c = heroChoreography(scroll.current);
    const layout = bottleLayout(viewport.width, viewport.height, TOTAL_HEIGHT);
    const t = time.current;
    const floatY = Math.sin((t * TAU) / FLOAT_PERIOD) * viewport.height * FLOAT_AMP;
    const yaw = Math.sin((t * TAU) / YAW_PERIOD) * YAW_DEG * DEG;

    // Drift: od centra desne polovine ka centru kadra dok se smanjuje i bledi.
    g.position.set(layout.x * (1 - c.drift), floatY, 0);
    g.scale.setScalar(layout.scale * c.scale);
    g.rotation.set(
      c.tiltX * DEG - pointer.current.y * POINTER_DEG * DEG,
      yaw + pointer.current.x * POINTER_DEG * DEG,
      c.tiltZ * DEG,
    );
    opacityRef.current = c.opacity;
  });

  return <BottleModel hex={HERO_PALETTE[0]} groupRef={group} opacity={opacityRef} envIntensity={ENV_INTENSITY} />;
}
