"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Object3D,
  Plane,
  Quaternion,
  Vector3,
  type DirectionalLight,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  PerspectiveCamera,
} from "three";
import type { HeroDrivers } from "@/components/hero/heroDrivers";
import { gsap } from "@/lib/gsap";
import { BODY_HALF, BODY_HEIGHT, BRUSH_TIP_Y, CAP_LIFT_OUT, CAP_PIVOT_Y, HERO_CAMERA, NECK_TOP, TOTAL_HEIGHT } from "@/lib/bottleDims";
import {
  ACTS,
  CAP_AWAY_X_RATIO,
  CAP_AWAY_Y_RATIO,
  FOV_REST,
  LEVEL_DROP_RATIO,
  SPARKLE_MIN,
  heroChoreography,
  ramp,
} from "@/lib/heroChoreography";
import { bottleScreen, visibleHeightAt, type BottleVariant } from "@/lib/bottleScreen";
import { BottleModel } from "./BottleModel";
import type { LiquidColor } from "./liquidColor";
import { LIQUID_LEVEL_LOCAL_Y, SloshSpring, updateLiquidPlane } from "./liquidLevel";
import { useStudioEnvironment } from "./studioEnvironment";

/**
 * Bočica u heroju (spec 14 → B): desna polovina kadra, ~62 % visine, tečnost u boji ciklusa.
 * Živi u ISTOM canvasu sa shaderom (`components/hero/LiquidCanvas.tsx`), ispred fullscreen
 * ravni, u perspektivnoj kameri čiji fov vozi koreografija (dolly-out dok se četkica vadi).
 *
 * JEDAN `useFrame`, bez prioriteta (prioritet > 0 bi ugasio R3F auto-render), ovim redom:
 *  1. `bottleScreen(p)` (lib/heroChoreography.ts) — JEDINA istina o mestu bočice na ekranu, ista
 *     koju DOM koristi za kontakt senku; fov kamere; sirov `p` (bez lerp-a: polica mora da prati
 *     DOM ivicu frejm za frejmom);
 *  2. poza tela (raspored + polica + idle lebdenje/yaw + pointer parallax i hover skala koje se
 *     gase do 0.20, njihanje, wobble) i poza ZATVARAČA (lift, spin oko ose bočice, odlazak ulevo i
 *     nagib oko SVETSKE z ose o pivotu zatvarača — kvaternioni, `applyPose`); hover diže zatvarač
 *     0.15 jed. oprugom;
 *  3. `updateMatrixWorld(true)` — R3F matrice osvežava tek pri crtanju, a kap i ravan nivoa moraju
 *     iz matrice OVOG frejma; zapljuskivanje + svetska clipping ravan nivoa (−3 % dok je stem napolju);
 *  4. kap: raste na VRHU DLAČICA (0.24–0.32), otkači se i pada (0.32–0.42) sa x/z iz
 *     DETERMINISTIČKE poze (bez idle/pointer/hover/wobble — reload daje isti centar), `uPourOrigin`;
 *  5. svetla: key ± 15 % za pointerom, rim sweep jednom po holdu boje (fazno uz crossfade);
 *  6. sparkle: `envMapIntensity` 0.6 → 0.9 → 0.6 dok front razlivanja prolazi.
 *
 * Gamifikacija (spec 13 F): hover kursor + skala 1.03, klik/tap wobble (±6°, 3 puta, 0.7 s) +
 * zapljuskivanje. Raycast ide na NEVIDLJIVU kapsulu (pokriva i hover-podignut zatvarač).
 */

const FLOAT_PERIOD = 6;
/** Amplituda lebdenja kao deo vidljive visine kadra. */
const FLOAT_AMP = 0.015;
const YAW_PERIOD = 11;
const YAW_DEG = 7;
const SWAY_PERIOD = 3.4;
const SWAY_DEG = 2;
const POINTER_DEG = 6;
const POINTER_LERP = 0.05;
const HOVER_SCALE = 1.03;
const HOVER_LERP = 0.1;
/** Hover podiže zatvarač za 0.15 jed. (opruga 2.5 Hz, blago prebacivanje) — poziv da se skrola. */
const HOVER_LIFT = 0.15;
const HOVER_OMEGA = 2 * Math.PI * 2.5;
const HOVER_ZETA = 0.45;
const WOBBLE_DEG = 6;
/** Posle pauze (`demand`, drugi tab) prvi `delta` ume da bude ogroman. */
const MAX_DELTA = 1 / 30;
/** Poluprečnik kapi u jedinicama modela (skalira se sa bočicom). */
const DROP_RADIUS = 0.3;
/** Kap pada do NDC y = −1.15 — ispod donje ivice kadra. */
const DROP_EXIT_NDC = -1.15;
/** Key svetlo gore-desno; pointer ga pomera ±15 % njegovog rastojanja. */
const KEY_LIGHT = new Vector3(6, 8, 5);
const KEY_POINTER_SHARE = 0.15;
/** Rim svetlo kruži ±60° oko prednje strane tokom crossfade-a boje (faza 0.70 → 1 perioda). */
const RIM_RADIUS = 10;
const RIM_HEIGHT = 5;
const RIM_SWEEP_DEG = 60;
const RIM_INTENSITY = 1.8;
const RIM_PHASE_FROM = 0.7;
/** Kontakt senka je 1,3 širine tela bočice. */
const SHADOW_WIDTH_RATIO = 1.3;

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const Y_AXIS = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

/** Vrh dlačica u prostoru grupe zatvarača (mreže su u njoj spuštene za −CAP_PIVOT_Y). */
const TIP_LOCAL = new Vector3(0, BRUSH_TIP_Y - CAP_PIVOT_Y, 0);

type Pose = {
  x: number;
  y: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  /** Podizanje zatvarača duž ose bočice, jedinice modela. */
  lift: number;
  spinDeg: number;
  tiltDeg: number;
  /** Pomeraj izvađenog zatvarača u SVETSKIM jedinicama scene (ulevo, gore). */
  awayX: number;
  awayY: number;
};

const qInv = new Quaternion();
const qTilt = new Quaternion();
const qSpin = new Quaternion();
const offset = new Vector3();

/**
 * Ista funkcija vozi pravu bočicu i scratch par za determinističku pozu. Zatvarač: svetski
 * nagib oko z (o pivotu), pa rotacija tela (yaw), pa spin oko sopstvene ose —
 * `capLocal = inv(body) · tilt · body · spin`, položaj = pivot + lift + svetski pomeraj u lokalu.
 */
function applyPose(body: Object3D, cap: Object3D, pose: Pose): void {
  body.position.set(pose.x, pose.y, 0);
  body.scale.setScalar(pose.scale);
  body.rotation.set(pose.rotX, pose.rotY, pose.rotZ);
  qInv.copy(body.quaternion).invert();
  offset.set(pose.awayX, pose.awayY, 0).applyQuaternion(qInv).divideScalar(pose.scale);
  cap.position.set(offset.x, CAP_PIVOT_Y + pose.lift + offset.y, offset.z);
  qTilt.setFromAxisAngle(Z_AXIS, pose.tiltDeg * DEG);
  qSpin.setFromAxisAngle(Y_AXIS, pose.spinDeg * DEG);
  cap.quaternion.copy(qInv).multiply(qTilt).multiply(body.quaternion).multiply(qSpin);
}

/** Scratch hijerarhija identična pravoj (grupa → −TOTAL/2 → zatvarač) za pozu koja zavisi SAMO od p. */
function createScratch(): { body: Object3D; cap: Object3D } {
  const body = new Object3D();
  const inner = new Object3D();
  inner.position.set(0, -TOTAL_HEIGHT / 2, 0);
  const cap = new Object3D();
  body.add(inner);
  inner.add(cap);
  return { body, cap };
}

const tipReal = new Vector3();
const tipDet = new Vector3();
const projected = new Vector3();
const debugV = new Vector3();

export function HeroBottle({
  drivers,
  liquid,
  variant = "wide",
  cheapGlass = false,
}: {
  drivers: HeroDrivers;
  liquid: LiquidColor;
  /** Raspored u kadru: desna polovina (desktop) ili centar ispod copy-ja (telefon, korak 18 A). */
  variant?: BottleVariant;
  /** Mobilni budžet: staklo bez transmisije (drugi prolaz rendera je na telefonu preskup). */
  cheapGlass?: boolean;
}) {
  const group = useRef<Group>(null);
  // Zaseban ref za model i za zatvarač: da grupa deli ref sa `BottleModel`, posle Suspense zamene
  // (GLB umesto proceduralne) transform bi se primenio dvaput (nađeno u koraku 13).
  const model = useRef<Group>(null);
  const cap = useRef<Group>(null);
  const drop = useRef<Mesh>(null);
  const dropMaterial = useRef<MeshStandardMaterial>(null);
  const keyLight = useRef<DirectionalLight>(null);
  const rimLight = useRef<DirectionalLight>(null);

  const envIntensity = useRef(SPARKLE_MIN);
  const [plane] = useState(() => new Plane());
  const [slosh] = useState(() => new SloshSpring());
  const [scratch] = useState(createScratch);
  // Kamera „zamrznuta" na 0.32 za projekciju ishodišta razlivanja — ref, jer joj frejm menja fov.
  const frozenCamera = useRef<PerspectiveCamera | null>(null);

  const time = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const hovered = useRef(false);
  const hoverScale = useRef(1);
  const hoverLift = useRef({ x: 0, v: 0 });
  const prevRotZ = useRef(0);
  // GSAP tween-uje ovaj objekat (wobble), frejm ga čita — ref, jer ga klik mutira.
  const wobble = useRef({ z: 0 });
  // Kutije za ishodište razlivanja i dev brojeve kroz ref: `useFrame` ne sme da piše u prop (React compiler).
  const pourOrigin = useRef(drivers.pourOrigin);
  const debugBox = useRef(drivers.debug);

  const dropLit = useMemo(() => [dropMaterial], []);
  useStudioEnvironment(dropLit, SPARKLE_MIN);

  // Kontakt senka na polici: DOM elipsa u `.hero-overlap` (canvas je ISPOD omotača), vozi je
  // bočica iz istih brojeva kao svoj položaj — DOM i three se ne mogu razići. Samo transform/opacity.
  const shadow = useRef<{ el: HTMLElement | null; width: number; on: boolean }>({ el: null, width: 0, on: false });
  useEffect(() => {
    const el = document.getElementById("hero-shelf-shadow");
    const box = shadow.current;
    box.el = el;
    return () => {
      box.el = null;
      box.width = 0;
      if (el) {
        el.style.transform = "";
        el.style.opacity = "";
        el.style.width = "";
      }
    };
  }, []);

  useFrame((state, rawDelta) => {
    const g = group.current;
    const capGroup = cap.current;
    if (!g || !capGroup) return;
    const delta = Math.min(rawDelta, MAX_DELTA);
    time.current += delta;
    const t = time.current;

    const p = drivers.scroll.current;
    const c = heroChoreography(p);
    const W = state.size.width;
    const H = Math.max(1, state.size.height);
    const screen = bottleScreen(p, drivers.holdEnd.current, W, H, variant);

    // Kamera: dolly-out dok se četkica vadi, nazad tokom razlivanja.
    const camera = state.camera as PerspectiveCamera;
    if (Math.abs(camera.fov - c.fov) > 1e-4) {
      camera.fov = c.fov;
      camera.updateProjectionMatrix();
    }

    // Interakcija: pointer parallax i hover skala se gase do 0.20 (poza mora biti deterministička).
    const target = drivers.pointer.current;
    pointer.current.x += (target.x - pointer.current.x) * POINTER_LERP;
    pointer.current.y += (target.y - pointer.current.y) * POINTER_LERP;
    hoverScale.current += ((hovered.current ? HOVER_SCALE : 1) - hoverScale.current) * HOVER_LERP;
    const lift = hoverLift.current;
    lift.v += (HOVER_OMEGA * HOVER_OMEGA * ((hovered.current ? HOVER_LIFT : 0) - lift.x) - 2 * HOVER_ZETA * HOVER_OMEGA * lift.v) * delta;
    lift.x += lift.v * delta;

    const floatY = Math.sin((t * TAU) / FLOAT_PERIOD) * screen.visibleHeight * FLOAT_AMP * c.idle;
    const yawIdle = Math.sin((t * TAU) / YAW_PERIOD) * YAW_DEG * DEG * c.idle;
    const sway = Math.sin((t * TAU) / SWAY_PERIOD) * SWAY_DEG * DEG * c.sway;
    const scale = screen.scale * (1 + (hoverScale.current - 1) * c.interact);
    const xScene = (screen.x / W - 0.5) * screen.visibleWidth;
    const baseScene = (0.5 - screen.baseY / H) * screen.visibleHeight;
    const awayX = -CAP_AWAY_X_RATIO * screen.visibleWidth * c.capAway;
    const awayY = CAP_AWAY_Y_RATIO * screen.visibleHeight * c.capAway;

    const pose: Pose = {
      x: xScene,
      y: baseScene + (TOTAL_HEIGHT / 2) * scale + floatY,
      scale,
      rotX: -pointer.current.y * POINTER_DEG * DEG * c.interact,
      rotY: yawIdle + c.yawDeg * DEG + pointer.current.x * POINTER_DEG * DEG * c.interact,
      rotZ: sway + wobble.current.z * DEG,
      lift: CAP_LIFT_OUT * c.capOut + lift.x * (1 - c.capOut),
      spinDeg: c.capSpinDeg,
      tiltDeg: c.capTiltDeg,
      awayX,
      awayY,
    };
    applyPose(g, capGroup, pose);
    g.updateMatrixWorld(true);

    // Nivo tečnosti: ravan iz matrice ovog frejma, −3 % tela dok je stem napolju, + zapljuskivanje.
    slosh.step(delta, pose.rotZ - prevRotZ.current);
    prevRotZ.current = pose.rotZ;
    updateLiquidPlane(plane, g, slosh.angle, LIQUID_LEVEL_LOCAL_Y - LEVEL_DROP_RATIO * BODY_HEIGHT * c.capOut);

    /*
     * Deterministička poza (zavisi SAMO od p, zamrznuta od početka pada): vrh dlačica iz nje daje
     * x/z otkačene kapi i `uPourOrigin` — reload usred heroja daje isti centar razlivanja.
     */
    const pd = Math.min(p, ACTS.dropFall[0]);
    const cd = pd === p ? c : heroChoreography(pd);
    const sd = pd === p ? screen : bottleScreen(pd, drivers.holdEnd.current, W, H, variant);
    applyPose(scratch.body, scratch.cap, {
      x: (sd.x / W - 0.5) * sd.visibleWidth,
      y: (0.5 - sd.baseY / H) * sd.visibleHeight + (TOTAL_HEIGHT / 2) * sd.scale,
      scale: sd.scale,
      rotX: 0,
      rotY: cd.yawDeg * DEG,
      rotZ: 0,
      lift: CAP_LIFT_OUT * cd.capOut,
      spinDeg: cd.capSpinDeg,
      tiltDeg: cd.capTiltDeg,
      awayX: -CAP_AWAY_X_RATIO * sd.visibleWidth * cd.capAway,
      awayY: CAP_AWAY_Y_RATIO * sd.visibleHeight * cd.capAway,
    });
    scratch.body.updateMatrixWorld(true);
    tipDet.copy(TIP_LOCAL);
    scratch.cap.localToWorld(tipDet);

    // Kap: na vrhu dlačica dok raste, pa pravo dole do ispod kadra. Mesh je UVEK vidljiv (kad je
    // nema, skala je ~0): tako se njen program kompajlira na prvom frejmu, ne usred skrola.
    const d = drop.current;
    if (d) {
      const r = c.dropVisible ? DROP_RADIUS * screen.layoutScale * c.drop : 1e-4;
      if (c.fall > 0) {
        const bottomY = (screen.visibleHeight / 2) * DROP_EXIT_NDC;
        d.position.set(tipDet.x, tipDet.y + (bottomY - tipDet.y) * c.fall - r * 0.9, tipDet.z);
      } else {
        tipReal.copy(TIP_LOCAL);
        capGroup.localToWorld(tipReal);
        d.position.set(tipReal.x, tipReal.y - r * 0.9, tipReal.z);
      }
      d.scale.set(r, r * 1.3, r);
      dropMaterial.current?.color.copy(liquid.value);
    }

    // Ishodište je zamrznuto U EKRANU: projekcija kamerom kakva je bila na 0.32 (fov 34), ne
    // tekućom — dolly nazad (0.42–0.58) inače pomera centar razlivanja dok se front širi.
    let cam: PerspectiveCamera = camera;
    if (pd !== p) {
      cam = frozenCamera.current ?? (frozenCamera.current = new PerspectiveCamera(FOV_REST, camera.aspect, camera.near, camera.far));
      if (cam.fov !== cd.fov || cam.aspect !== camera.aspect) {
        cam.fov = cd.fov;
        cam.aspect = camera.aspect;
        cam.updateProjectionMatrix();
      }
      cam.position.copy(camera.position);
      cam.quaternion.copy(camera.quaternion);
      cam.updateMatrixWorld();
    }
    projected.copy(tipDet).project(cam);
    pourOrigin.current.current = { x: (projected.x + 1) / 2, y: 0 };

    // Svetla: key prati pointer ±15 %, rim sweep jednom po holdu boje (faza 0.70 → 1), samo u idle-u.
    const key = keyLight.current;
    if (key) {
      const range = KEY_LIGHT.length() * KEY_POINTER_SHARE;
      key.position.set(KEY_LIGHT.x + range * pointer.current.x, KEY_LIGHT.y + range * pointer.current.y, KEY_LIGHT.z);
    }
    const rim = rimLight.current;
    if (rim) {
      const s = ramp(RIM_PHASE_FROM, 1, drivers.cyclePhase.current);
      const az = (-RIM_SWEEP_DEG + 2 * RIM_SWEEP_DEG * s) * DEG;
      rim.position.set(RIM_RADIUS * Math.sin(az), RIM_HEIGHT, RIM_RADIUS * Math.cos(az));
      rim.intensity = RIM_INTENSITY * Math.sin(Math.PI * s) * c.idle;
    }

    envIntensity.current = c.sparkle;

    const sh = shadow.current;
    if (sh.el && (c.shadowOpacity > 0 || sh.on)) {
      sh.on = c.shadowOpacity > 0;
      // Širina elementa = širina tela u miru (fov 30) × 1,3; po frejmu samo translate + scaleX.
      const restWidth =
        ((2 * BODY_HALF * screen.layoutScale) / (visibleHeightAt(FOV_REST, HERO_CAMERA.distance) * (W / H))) * W * SHADOW_WIDTH_RATIO;
      if (Math.abs(restWidth - sh.width) > 0.5) {
        sh.width = restWidth;
        sh.el.style.width = `${restWidth.toFixed(1)}px`;
      }
      const scaleX = (screen.width * SHADOW_WIDTH_RATIO) / restWidth;
      sh.el.style.transform = `translate(${(screen.x - restWidth / 2).toFixed(1)}px, 0px) scaleX(${scaleX.toFixed(3)})`;
      sh.el.style.opacity = c.shadowOpacity.toFixed(3);
    }

    if (process.env.NODE_ENV !== "production") {
      tipReal.copy(TIP_LOCAL);
      capGroup.localToWorld(tipReal);
      debugV.set(0, NECK_TOP - TOTAL_HEIGHT / 2, 0);
      g.localToWorld(debugV);
      const neckTopWorldY = debugV.y;
      debugV.set(0, -TOTAL_HEIGHT / 2, 0);
      g.localToWorld(debugV);
      debugV.project(camera);
      const baseScreenY = ((1 - debugV.y) / 2) * H;
      projected.copy(tipReal).project(camera);
      debugBox.current.current = {
        fov: camera.fov,
        capSpinDeg: c.capSpinDeg,
        capLift: pose.lift,
        tipWorldY: tipReal.y,
        neckTopWorldY,
        tipScreenX: ((projected.x + 1) / 2) * W,
        tipScreenY: ((1 - projected.y) / 2) * H,
        baseScreenY,
        shelfBaseY: screen.baseY,
        envIntensity: c.sparkle,
        rimIntensity: rim ? rim.intensity : 0,
        cyclePhase: drivers.cyclePhase.current,
      };
    }
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
      {/* Key svetlo gore-desno (pointer ±15 %); rim svetlo kruži i pali se samo tokom sweep-a.
          Oba su uvek u sceni (broj svetala je deo programa — bez rekompajla usred skrola). */}
      <directionalLight ref={keyLight} position={[KEY_LIGHT.x, KEY_LIGHT.y, KEY_LIGHT.z]} intensity={1.1} />
      <directionalLight ref={rimLight} position={[0, RIM_HEIGHT, RIM_RADIUS]} intensity={0} />
      <group ref={group}>
        <BottleModel
          hex={liquid.value.getHexString() ? `#${liquid.value.getHexString()}` : "#57BFA8"}
          groupRef={model}
          capRef={cap}
          envIntensity={SPARKLE_MIN}
          envIntensityRef={envIntensity}
          liquidPlane={plane}
          liquidColor={liquid.value}
          cheapGlass={cheapGlass}
        />
        {/* Nevidljiva kapsula za hover/klik — jedini objekat koji R3F raycast-uje; pokriva i podignut zatvarač. */}
        <mesh visible={false} position={[0, HOVER_LIFT, 0]} onPointerOver={over} onPointerOut={out} onClick={click}>
          <capsuleGeometry args={[1.7, TOTAL_HEIGHT - 3.4 + 2 * HOVER_LIFT, 4, 12]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <mesh ref={drop}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial ref={dropMaterial} roughness={0.15} metalness={0.05} envMapIntensity={SPARKLE_MIN} />
      </mesh>
    </>
  );
}
