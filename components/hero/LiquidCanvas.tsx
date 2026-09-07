"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color, Vector2, type ShaderMaterial } from "three";
import { HeroBottle } from "@/components/three/HeroBottle";
import { LiquidColor } from "@/components/three/liquidColor";
import { heroChoreography, pourMaxRadius } from "@/lib/heroChoreography";
import { FRAME_SAMPLE_MS } from "@/lib/webgl";
import { HERO_CAMERA, type HeroDrivers } from "./heroDrivers";
import { FRAGMENT_SHADER, HERO_PALETTE, VERTEX_SHADER } from "./liquidShader";

/**
 * WebGL sloj hero sekcije. Montira se SAMO kad `components/hero/Hero.tsx` utvrdi da
 * smemo (WebGL2, sposoban uređaj, bez prefers-reduced-motion) — vidi `lib/webgl.ts`.
 * Zato ovde nema nijedne provere sposobnosti: ako je ova komponenta na ekranu,
 * odluka je već doneta. Ostaje samo merenje u radu (`FrameBudget`): ako prosek frejma u prve
 * dve sekunde probije budžet, Hero gasi platno i vraća `HeroDrop` (korak 18 A).
 *
 * JEDAN canvas, jedna scena, jedna perspektivna kamera (spec 12 → A):
 *  - shader ravan 2×2 čiji vertex shader ide pravo u NDC (puni kadar bez obzira na
 *    kameru), bez testa dubine, `renderOrder -1` — crta se prva, kao pozadina;
 *  - bočica (`HeroBottle`) ispred nje — od koraka 18 na SVAKOJ širini na kojoj platno sme
 *    da radi (ADR-005 povučen); na telefonu u mobilnom rasporedu i budžetu (`mobile` prop).
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
    uOctaves: { value: 3 },
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

function LiquidPlane({ drivers, liquid, octaves }: { drivers: HeroDrivers; liquid: LiquidColor; octaves: number }) {
  const material = useRef<ShaderMaterial>(null);
  const [initialUniforms] = useState(createUniforms);

  useFrame((state, delta) => {
    const u = material.current?.uniforms as Uniforms | undefined;
    if (!u) return;

    u.uOctaves.value = octaves;

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
/**
 * Merenje u radu (korak 18 A): prosek trajanja frejma u prve `FRAME_SAMPLE_MS` crtanja. Jedan
 * broj, jednom — Hero na osnovu njega odlučuje da li platno ostaje ili pada na `HeroDrop`.
 * Prvih nekoliko frejmova nosi kompajliranje shadera i učitavanje GLB-a, pa se preskaču.
 */
function FrameBudget({ onResult }: { onResult: (avgMs: number) => void }) {
  const box = useRef({ frames: 0, total: 0, done: false, start: 0 });

  useFrame((_state, delta) => {
    const b = box.current;
    if (b.done) return;
    b.frames += 1;
    // Prva tri frejma su kompajliranje programa i prvi upload geometrije — ne mere uređaj.
    if (b.frames <= 3) return;
    if (b.start === 0) b.start = performance.now();
    b.total += delta * 1000;
    if (performance.now() - b.start < FRAME_SAMPLE_MS) return;
    b.done = true;
    onResult(b.total / Math.max(1, b.frames - 3));
  });

  return null;
}

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
  mobile,
  narrow,
  onBudget,
}: {
  drivers: HeroDrivers;
  /** `false` kad hero izađe iz kadra ili se tab sakrije — tada se ne crta ništa. */
  active: boolean;
  /** Bočica u kadru (korak 18: uvek kad platno sme, ranije samo ≥ 1024 px). */
  bottle: boolean;
  /** Mobilni budžet (korak 18 A): bez antialiasa, low-power, 2 oktave, staklo bez transmisije. */
  mobile: boolean;
  /** Uzak kadar (< 1024 px): bočica u donjem pojasu, manja i centrirana — ne desna polovina. */
  narrow: boolean;
  /** Prosek frejma u prve 2 s — Hero na osnovu njega gasi platno ako uređaj ne stiže. */
  onBudget: (avgMs: number) => void;
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
        // Budžet E: dpr do 1.5 (mobilni 1.25); antialias zbog ivica stakla — na telefonu
        // otpada, tamo je gustina piksela sama po sebi dovoljna (korak 18 A).
        dpr={mobile ? [1, 1.25] : [1, 1.5]}
        gl={{
          antialias: !mobile,
          alpha: false,
          powerPreference: mobile ? "low-power" : "high-performance",
        }}
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
          // Bez transmisije (mobilni budžet) drugog prolaza nema, pa ni ovo podešavanje.
          if (!mobile) gl.transmissionResolutionScale = 0.5;
          gl.localClippingEnabled = true;
        }}
        aria-hidden
      >
        <color attach="background" args={[HERO_PALETTE[3]]} />
        <FrameGate active={active} />
        <FrameBudget onResult={onBudget} />
        <ColorDriver drivers={drivers} liquid={liquid} />
        <LiquidPlane drivers={drivers} liquid={liquid} octaves={mobile ? 2 : 3} />
        {/* Svetla (key + rim sweep) su u HeroBottle — ona ih vozi po frejmu. */}
        {bottle ? (
          <HeroBottle drivers={drivers} liquid={liquid} variant={narrow ? "small" : "wide"} cheapGlass={mobile} />
        ) : null}
      </Canvas>
    </div>
  );
}
