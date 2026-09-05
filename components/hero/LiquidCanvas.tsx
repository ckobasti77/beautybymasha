"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color, Vector2, type ShaderMaterial } from "three";
import { HeroBottle } from "@/components/three/HeroBottle";
import { LiquidColor } from "@/components/three/liquidColor";
import { heroChoreography, pourMaxRadius } from "@/lib/heroChoreography";
import { HERO_CAMERA, type HeroDrivers } from "./heroDrivers";
import { FRAGMENT_SHADER, HERO_PALETTE, VERTEX_SHADER } from "./liquidShader";

/**
 * WebGL sloj hero sekcije. Montira se SAMO kad `components/hero/Hero.tsx` utvrdi da
 * smemo (WebGL2, desktop širina, bez prefers-reduced-motion) — vidi `lib/webgl.ts`.
 * Zato ovde nema nijedne provere sposobnosti: ako je ova komponenta na ekranu,
 * odluka je već doneta.
 *
 * JEDAN canvas, jedna scena, jedna perspektivna kamera (spec 12 → A):
 *  - shader ravan 2×2 čiji vertex shader ide pravo u NDC (puni kadar bez obzira na
 *    kameru), bez testa dubine, `renderOrder -1` — crta se prva, kao pozadina;
 *  - bočica (`HeroBottle`) ispred nje, samo ≥ 1024 px (`bottle` prop). Od 769 do 1023
 *    px shader radi sam, bez bočice (razlivanje kreće iz DOM kapi).
 * Odnos stranica ulazi u shader kroz `uResolution`, da mrlje ostanu okrugle i na
 * širokom monitoru.
 *
 * Boja (spec 13 → D): ciklus vozi `Hero.tsx` i piše hex par u `drivers.liquid`; ovde ga
 * `ColorDriver` (prvi u sceni, pa mu `useFrame` ide prvi) pretvara u jedan `THREE.Color`
 * koji čitaju i shader (`uPourColor`) i bočica. `localClippingEnabled` je za nivo tečnosti
 * (spec F, `components/three/liquidLevel.ts`).
 */

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
    uPour: { value: 0 },
    uPourColor: { value: new Color(HERO_PALETTE[0]) },
    uPourOrigin: { value: new Vector2(0.72, 0) },
    uPourMax: { value: 1.5 },
    uPalette: { value: HERO_PALETTE.map((hex) => new Color(hex)) },
    uReduced: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
  };
}

type Uniforms = ReturnType<typeof createUniforms>;

/** Prvi u sceni: hex par → `THREE.Color`, pre nego što shader i bočica pročitaju boju. */
function ColorDriver({ drivers, liquid }: { drivers: HeroDrivers; liquid: LiquidColor }) {
  useFrame(() => {
    liquid.update(drivers.liquid.current);
  });
  return null;
}

function LiquidPlane({ drivers, liquid }: { drivers: HeroDrivers; liquid: LiquidColor }) {
  const material = useRef<ShaderMaterial>(null);
  const [initialUniforms] = useState(createUniforms);

  useFrame((state, delta) => {
    const u = material.current?.uniforms as Uniforms | undefined;
    if (!u) return;

    u.uTime.value += Math.min(delta, MAX_DELTA);

    const target = drivers.pointer.current;
    const p = u.uPointer.value;
    p.x += (target.x - p.x) * POINTER_LERP;
    p.y += (target.y - p.y) * POINTER_LERP;

    // Isti lerp kao bočica, pa se razlivanje i nagib slažu frejm za frejmom.
    u.uScroll.value += (drivers.scroll.current - u.uScroll.value) * SCROLL_LERP;
    u.uPour.value = heroChoreography(u.uScroll.value).pour;
    u.uPourColor.value.copy(liquid.value);

    const origin = drivers.pourOrigin.current;
    const aspect = state.size.width / Math.max(1, state.size.height);
    u.uPourOrigin.value.set(origin.x, origin.y);
    u.uPourMax.value = pourMaxRadius(origin, aspect);
    u.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    // Vertex shader ignoriše kameru, pa bi frustum culling po položaju u sceni ravan
    // pogrešno izbacio — mesh je uvek „u kadru".
    <mesh frustumCulled={false} renderOrder={-1}>
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
 * ekranu ume zateći stara slika: dok je canvas mirovao, platno je promenilo veličinu,
 * pa deo kadra ostane nenacrtan do sledećeg frejma.
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
  bottle,
}: {
  drivers: HeroDrivers;
  /** `false` kad hero izađe iz kadra ili se tab sakrije — tada se ne crta ništa. */
  active: boolean;
  /** Bočica samo ≥ 1024 px (spec 12 → D); shader sam radi i od 769 px. */
  bottle: boolean;
}) {
  const [liquid] = useState(() => new LiquidColor());

  return (
    // Roditelj sa DEFINISANOM kutijom (`absolute inset-0` = veličina stage-a), a
    // `<Canvas>` puni njega svojim R3F default stilom (`position:relative; 100%×100%`).
    // Ranije je Canvas nosio `position:absolute; inset:0` bez širine/visine, pa je
    // react-use-measure na mount-u znao da izmeri 0×0 → canvas ostane 300×150 (HTML
    // default) i shader ništa ne nacrta. Ovako wrapper uvek ima nenultu meru, a
    // `resize={{ debounce: 0 }}` osigura remeru čim se prozor promeni.
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, HERO_CAMERA.distance], fov: HERO_CAMERA.fov, near: 1, far: 80 }}
        // Budžet E: dpr do 1.5; antialias zbog ivica stakla (shader sam ga ne traži).
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        frameloop={active ? "always" : "demand"}
        // `scroll: false`: R3F inače prati i položaj omotača na SKROL (react-use-measure) i na
        // svaku promenu `top` zove `gl.setSize` + re-render cele R3F scene — u fazi izlaska
        // stage se pomera svakog frejma, pa je to bilo ~150 setSize/s (profil, korak 13).
        // Veličinu i dalje prati ResizeObserver.
        resize={{ scroll: false, debounce: 0 }}
        // Transmission prolaz stakla bočice crta scenu (i fBm shader) još jednom u render
        // target; na četvrtini piksela to je +25 % umesto +100 % (budžet E). Bez bočice
        // nema transmisivnih objekata, pa podešavanje ne košta ništa. Clipping ravan
        // (nivo tečnosti) traži `localClippingEnabled`.
        onCreated={({ gl }) => {
          gl.transmissionResolutionScale = 0.5;
          gl.localClippingEnabled = true;
        }}
        aria-hidden
      >
        <color attach="background" args={[HERO_PALETTE[3]]} />
        <FrameGate active={active} />
        <ColorDriver drivers={drivers} liquid={liquid} />
        <LiquidPlane drivers={drivers} liquid={liquid} />
        {/* Svetla (key + rim sweep) su u HeroBottle — ona ih vozi po frejmu. */}
        {bottle ? <HeroBottle drivers={drivers} liquid={liquid} /> : null}
      </Canvas>
    </div>
  );
}
