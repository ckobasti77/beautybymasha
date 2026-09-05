"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Plane, Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import type { HeroDrivers } from "@/components/hero/heroDrivers";
import { gsap } from "@/lib/gsap";
import { ACTS, bottleLayout, heroChoreography } from "@/lib/heroChoreography";
import { TOTAL_HEIGHT } from "./bottleGeometry";
import { BottleModel } from "./BottleModel";
import type { LiquidColor } from "./liquidColor";
import { SloshSpring, updateLiquidPlane } from "./liquidLevel";
import { useStudioEnvironment } from "./studioEnvironment";

/**
 * Bočica u heroju (spec 13 → C, E, F): desna polovina kadra, ~62 % visine, tečnost u boji
 * ciklusa. Živi u ISTOM canvasu sa shaderom (`components/hero/LiquidCanvas.tsx`), ispred
 * fullscreen ravni, u perspektivnoj kameri.
 *
 * JEDAN `useFrame`, bez prioriteta (prioritet > 0 bi ugasio R3F auto-render), ovim redom:
 *  1. transform grupe: idle (lebdenje, yaw — gase se do p 0.10), pointer parallax, skrol
 *     koreografija (`lib/heroChoreography.ts`, lerp 0.12 kao `uScroll`), hover skala i wobble
 *     kao ČLANOVI (frejm prepisuje position/scale/rotation, pa se ništa ne „dodaje");
 *  2. `updateMatrixWorld(true)` — R3F matrice osvežava tek pri crtanju, a kap i ravan
 *     nivoa moraju iz matrice OVOG frejma, inače trzaju dok se bočica naginje;
 *  3. zapljuskivanje + svetska clipping ravan nivoa tečnosti (`liquidLevel.ts`);
 *  4. kap: brat grupe, na vrhu zatvarača dok raste (0.18–0.30), pa pada pravo dole (0.30–0.40);
 *  5. `uPourOrigin` iz DETERMINISTIČKE poze (nagib na sirovom p, bez lebdenja/pointera/hovera,
 *     zamrznut od početka pada) — reload usred heroja daje isti centar razlivanja.
 *
 * Gamifikacija (spec F): hover kursor + skala 1.03, klik/tap wobble (±6°, 3 puta, 0.7 s) +
 * zapljuskivanje. Raycast ide na NEVIDLJIVU kapsulu, ne na 12k trouglova stakla i tečnosti.
 */

const FLOAT_PERIOD = 6;
/** Amplituda lebdenja kao deo vidljive visine kadra. */
const FLOAT_AMP = 0.015;
const YAW_PERIOD = 11;
const YAW_DEG = 7;
const POINTER_DEG = 6;
const POINTER_LERP = 0.05;
const SCROLL_LERP = 0.12;
const HOVER_SCALE = 1.03;
const HOVER_LERP = 0.1;
const WOBBLE_DEG = 6;
/** Posle pauze (`demand`, drugi tab) prvi `delta` ume da bude ogroman. */
const MAX_DELTA = 1 / 30;
/** Spec B: okruženje sa niskim intenzitetom, da bočica ne blešti preko shadera. */
const ENV_INTENSITY = 0.6;
/** Poluprečnik kapi u jedinicama modela (skalira se sa bočicom). */
const DROP_RADIUS = 0.34;
/** Kap pada do NDC y = −1.15 — ispod donje ivice kadra (spec E). */
const DROP_EXIT_NDC = -1.15;

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/**
 * Vrh bočice (vrh zatvarača) u prostoru SPOLJNE grupe (model je u njoj spušten za TOTAL/2).
 * Vrh VRATA je ispod zatvarača — kap tamo ne bi ni virila; ona se rađa na samom vrhu.
 */
const NECK_LOCAL = new Vector3(0, TOTAL_HEIGHT / 2, 0);
const scratch = new Vector3();

export function HeroBottle({ drivers, liquid }: { drivers: HeroDrivers; liquid: LiquidColor }) {
  const group = useRef<Group>(null);
  // Zaseban ref za model: `BottleModel` ga koristi samo za `visible` pri bleđenju. Da deli
  // `group`, posle Suspense zamene (GLB umesto proceduralne) ref bi pokazao na unutrašnju
  // grupu i transform bi se primenio dvaput (bočica 2× udesno — nađeno u koraku 13).
  const model = useRef<Group>(null);
  const drop = useRef<Mesh>(null);
  const dropMaterial = useRef<MeshStandardMaterial>(null);
  // Vidljiva širina/visina scene u koordinatnom početku, u jedinicama scene (prati resize).
  const viewport = useThree((s) => s.viewport);

  // Ref koji `BottleModel` čita svakog frejma — kroz state bi svaki frejm bio
  // re-render tri materijala.
  const opacityRef = useRef(1);
  const [plane] = useState(() => new Plane());
  const [slosh] = useState(() => new SloshSpring());

  const time = useRef(0);
  const scroll = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const hovered = useRef(false);
  const hoverScale = useRef(1);
  const prevRotZ = useRef(0);
  // GSAP tween-uje ovaj objekat (wobble), frejm ga čita — ref, jer ga klik mutira.
  const wobble = useRef({ z: 0 });
  // Kutija za ishodište razlivanja kroz ref: `useFrame` ne sme da piše u prop (React compiler).
  const pourOrigin = useRef(drivers.pourOrigin);

  const dropLit = useMemo(() => [dropMaterial], []);
  useStudioEnvironment(dropLit, ENV_INTENSITY);

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;
    const delta = Math.min(rawDelta, MAX_DELTA);
    time.current += delta;

    scroll.current += (drivers.scroll.current - scroll.current) * SCROLL_LERP;
    const target = drivers.pointer.current;
    pointer.current.x += (target.x - pointer.current.x) * POINTER_LERP;
    pointer.current.y += (target.y - pointer.current.y) * POINTER_LERP;
    hoverScale.current += ((hovered.current ? HOVER_SCALE : 1) - hoverScale.current) * HOVER_LERP;

    const c = heroChoreography(scroll.current);
    const layout = bottleLayout(viewport.width, viewport.height, TOTAL_HEIGHT);
    const t = time.current;
    const floatY = Math.sin((t * TAU) / FLOAT_PERIOD) * viewport.height * FLOAT_AMP * c.idle;
    const yaw = Math.sin((t * TAU) / YAW_PERIOD) * YAW_DEG * DEG * c.idle;
    const rotZ = c.tiltZ * DEG + wobble.current.z * DEG;

    // Drift: od centra desne polovine ka centru kadra dok se smanjuje i bledi.
    g.position.set(layout.x * (1 - c.drift), floatY, 0);
    g.scale.setScalar(layout.scale * c.scale * hoverScale.current);
    g.rotation.set(
      c.tiltX * DEG - pointer.current.y * POINTER_DEG * DEG,
      yaw + pointer.current.x * POINTER_DEG * DEG,
      rotZ,
    );
    opacityRef.current = c.opacity;
    g.updateMatrixWorld(true);

    // Nivo tečnosti: ravan iz matrice ovog frejma + zapljuskivanje iz ugaone brzine.
    slosh.step(delta, rotZ - prevRotZ.current);
    prevRotZ.current = rotZ;
    updateLiquidPlane(plane, g, slosh.angle);

    // Kap: na vratu dok raste, pa pravo dole do ispod kadra. Mesh je UVEK vidljiv (kad je nema,
    // skala je ~0): tako se njen program kompajlira na prvom frejmu, a ne na p = 0.18 usred
    // skrola (jedan frejm od 40 ms — izmereno u koraku 13).
    const d = drop.current;
    if (d) {
      const shown = c.dropVisible && c.opacity > 0.01;
      scratch.copy(NECK_LOCAL);
      g.localToWorld(scratch);
      const r = shown ? DROP_RADIUS * layout.scale * c.drop : 1e-4;
      const bottomY = (viewport.height / 2) * DROP_EXIT_NDC;
      const y = c.fall > 0 ? scratch.y + (bottomY - scratch.y) * c.fall : scratch.y;
      d.position.set(scratch.x, y - r * 0.9, scratch.z);
      d.scale.set(r, r * 1.3, r);
      dropMaterial.current?.color.copy(liquid.value);
    }

    /*
     * Ishodište razlivanja: x vrha vrata u uv, iz poze koja zavisi SAMO od p (nagib bez
     * lebdenja, yaw-a, pointera, hovera i wobble-a), zamrznute od početka pada. Euler XYZ:
     * v' = Rx(Ry(Rz(v))), za v = (0, h, 0) → (−h·sinZ, h·cosZ·cosX, h·cosZ·sinX).
     */
    const pd = heroChoreography(Math.min(drivers.scroll.current, ACTS.dropFall[0]));
    const h = NECK_LOCAL.y * layout.scale;
    const tz = pd.tiltZ * DEG;
    const tx = pd.tiltX * DEG;
    scratch.set(layout.x - h * Math.sin(tz), h * Math.cos(tz) * Math.cos(tx), h * Math.cos(tz) * Math.sin(tx));
    scratch.project(state.camera);
    pourOrigin.current.current = { x: (scratch.x + 1) / 2, y: 0 };
  });

  // Kursor na element ispod pokazivača (canvas), ne na renderer iz hook-a.
  const over = (e: ThreeEvent<PointerEvent>) => {
    hovered.current = true;
    const el = e.nativeEvent.target;
    if (el instanceof HTMLElement) el.style.cursor = "pointer";
  };
  const out = (e: ThreeEvent<PointerEvent>) => {
    hovered.current = false;
    const el = e.nativeEvent.target;
    if (el instanceof HTMLElement) el.style.cursor = "";
  };
  const click = () => {
    const w = wobble.current;
    gsap.killTweensOf(w);
    w.z = 0;
    // 6 nogu × 0.7/6 s = tri pune oscilacije koje se završe na 0.
    gsap.to(w, { z: WOBBLE_DEG, duration: 0.7 / 6, repeat: 5, yoyo: true, ease: "sine.inOut" });
    slosh.kick(2.4);
  };

  return (
    <>
      <group ref={group}>
        <BottleModel
          hex={liquid.value.getHexString() ? `#${liquid.value.getHexString()}` : "#57BFA8"}
          groupRef={model}
          opacity={opacityRef}
          envIntensity={ENV_INTENSITY}
          liquidPlane={plane}
          liquidColor={liquid.value}
        />
        {/* Nevidljiva kapsula za hover/klik — jedini objekat koji R3F raycast-uje. */}
        <mesh visible={false} onPointerOver={over} onPointerOut={out} onClick={click}>
          <capsuleGeometry args={[1.7, TOTAL_HEIGHT - 3.4, 4, 12]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <mesh ref={drop}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial ref={dropMaterial} roughness={0.15} metalness={0.05} envMapIntensity={ENV_INTENSITY} />
      </mesh>
    </>
  );
}
