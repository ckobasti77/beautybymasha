"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color, Vector2, type ShaderMaterial } from "three";
import { FRAGMENT_SHADER, HERO_PALETTE, VERTEX_SHADER } from "./liquidShader";

/**
 * WebGL sloj hero sekcije. Montira se SAMO kad `components/hero/Hero.tsx` utvrdi da
 * smemo (WebGL2, desktop širina, bez prefers-reduced-motion) — vidi `useHeroWebGL`.
 * Zato ovde nema nijedne provere sposobnosti: ako je ova komponenta na ekranu,
 * odluka je već doneta.
 *
 * Jedan `PlaneGeometry(2, 2)` u ortografskoj kameri, skaliran na veličinu kadra, pa
 * popunjava ekran bez obzira na oblik prozora. Odnos stranica ulazi u shader kroz
 * `uResolution`, da mrlje ostanu okrugle i na širokom monitoru.
 */

/** Vrednosti koje hero gura u shader spolja (pointer i skrol). */
export type HeroDrivers = {
  /** Cilj u opsegu -1..1; shader ga stiže inercijom. */
  readonly pointer: { current: { x: number; y: number } };
  /** Napredak hero pin-a, 0..1. */
  readonly scroll: { current: number };
};

/** Inercija pointera (DNA: lerp 0.06). */
const POINTER_LERP = 0.06;
const SCROLL_LERP = 0.12;
/** Posle pauze (`demand`, drugi tab) prvi `delta` ume da bude ogroman. */
const MAX_DELTA = 1 / 30;

/**
 * Uniformi su vlasništvo materijala, ne React state-a: menjaju se svakog frejma, a
 * ono što vrati React hook se po pravilima ne sme mutirati. Zato se objekat napravi
 * jednom i preda materijalu, a `useFrame` ga posle dohvata sa `material.current`.
 */
function createUniforms() {
  return {
    uTime: { value: 0 },
    uPointer: { value: new Vector2(0, 0) },
    uScroll: { value: 0 },
    uPalette: { value: HERO_PALETTE.map((hex) => new Color(hex)) },
    uReduced: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
  };
}

type Uniforms = ReturnType<typeof createUniforms>;

function LiquidPlane({ drivers }: { drivers: HeroDrivers }) {
  const material = useRef<ShaderMaterial>(null);
  const [initialUniforms] = useState(createUniforms);
  // R3F drži ortografsku kameru u pikselima (left = -w/2 … right = w/2, zoom 1), pa
  // se plane 2×2 skalira na pola širine i visine kadra i tačno ga popunjava.
  const size = useThree((s) => s.size);

  useFrame((state, delta) => {
    const u = material.current?.uniforms as Uniforms | undefined;
    if (!u) return;

    u.uTime.value += Math.min(delta, MAX_DELTA);

    const target = drivers.pointer.current;
    const p = u.uPointer.value;
    p.x += (target.x - p.x) * POINTER_LERP;
    p.y += (target.y - p.y) * POINTER_LERP;

    u.uScroll.value += (drivers.scroll.current - u.uScroll.value) * SCROLL_LERP;
    u.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh scale={[size.width / 2, size.height / 2, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={material}
        uniforms={initialUniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Kad se crtanje vrati iz pauze (`demand`), traži jedan frejm odmah. Bez toga se na
 * ekranu ume zateći stara slika: dok je canvas mirovao, pin je promenio raspored i
 * platno je promenilo veličinu, pa deo kadra ostane nenacrtan do sledećeg frejma.
 */
function FrameGate({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [active, invalidate]);
  return null;
}

export default function LiquidCanvas({
  drivers,
  active,
}: {
  drivers: HeroDrivers;
  /** `false` kad hero izađe iz kadra ili se tab sakrije — tada se ne crta ništa. */
  active: boolean;
}) {
  return (
    // Roditelj sa DEFINISANOM kutijom (`absolute inset-0` = veličina hero sekcije), a
    // `<Canvas>` puni njega svojim R3F default stilom (`position:relative; 100%×100%`).
    // Ranije je Canvas nosio `position:absolute; inset:0` bez širine/visine, pa je
    // react-use-measure na mount-u znao da izmeri 0×0 → canvas ostane 300×150 (HTML
    // default) i shader ništa ne nacrta. Ovako wrapper uvek ima nenultu meru, a
    // `resize={{ debounce: 0 }}` osigura remeru čim se prozor promeni.
    <div className="absolute inset-0">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], zoom: 1, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        frameloop={active ? "always" : "demand"}
        resize={{ debounce: 0 }}
        aria-hidden
      >
        <color attach="background" args={[HERO_PALETTE[3]]} />
        <FrameGate active={active} />
        <LiquidPlane drivers={drivers} />
      </Canvas>
    </div>
  );
}
