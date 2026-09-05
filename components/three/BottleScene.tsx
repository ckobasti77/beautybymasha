"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  PMREMGenerator,
  type Group,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TOTAL_HEIGHT, createBottleGeometries } from "./bottleGeometry";

/**
 * WebGL sloj bočice. Montira se SAMO kad `BottleShowcase` utvrdi da smemo
 * (WebGL2, desktop širina, bez `prefers-reduced-motion`) — vidi `lib/webgl.ts`.
 * Zato ovde nema nijedne provere sposobnosti: odluka je već doneta.
 *
 * Bez postprocessinga i bez senki (docs/3D-ASSETS.md): jedno usmereno svetlo i
 * okruženje iz `RoomEnvironment`, izračunato jednom u PMREM. Okruženje je ono
 * što staklu daje odsjaje — bez njega `transmission` izgleda kao siva plastika.
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
/** Koliko brzo tečnost pređe u novu nijansu. */
const COLOR_LERP = 0.08;
/** Posle pauze (`demand`, drugi tab) prvi `delta` ume da bude ogroman. */
const MAX_DELTA = 1 / 30;

/**
 * Okruženje za odsjaje: `RoomEnvironment` provučen kroz PMREM, jednom.
 *
 * Tekstura se kači direktno na materijale kroz ref, ne kroz `scene.environment`
 * i ne kroz state. Scena je tuđi objekat, a setState iz efekta bi značio jedan
 * bespotreban prolaz kroz render zbog podatka koji React ionako ne posmatra.
 */
// `MeshPhysicalMaterial` nasleđuje `MeshStandardMaterial`, pa oba staju u isti ref tip.
function useStudioEnvironment(materials: readonly RefObject<MeshStandardMaterial | null>[]): void {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    // Generator i soba su potrošni; ostaje samo tekstura koju su napravili.
    pmrem.dispose();
    room.dispose();

    const applied = materials.map((ref) => ref.current);
    for (const material of applied) {
      if (!material) continue;
      material.envMap = target.texture;
      material.needsUpdate = true;
    }
    // Ako platno stoji na `demand`, novi odsjaji bez ovoga ne bi bili nacrtani.
    invalidate();

    return () => {
      for (const material of applied) {
        if (!material) continue;
        material.envMap = null;
        material.needsUpdate = true;
      }
      target.dispose();
    };
  }, [gl, invalidate, materials]);
}

function Bottle({ hex, drivers }: { hex: string; drivers: BottleDrivers }) {
  const group = useRef<Group>(null);
  const glass = useRef<MeshPhysicalMaterial>(null);
  const liquid = useRef<MeshStandardMaterial>(null);
  const cap = useRef<MeshStandardMaterial>(null);

  const lit = useMemo(() => [glass, liquid, cap], []);
  useStudioEnvironment(lit);

  const geometries = useMemo(() => createBottleGeometries(), []);
  useEffect(() => {
    const { glass, liquid: liquidGeometry, cap } = geometries;
    return () => {
      glass.dispose();
      liquidGeometry.dispose();
      cap.dispose();
    };
  }, [geometries]);

  // Cilj boje živi van rendera iz istog razloga kao uniformi u hero shaderu:
  // menja se na svaki prelaz mišem preko zida swatch-eva, a `useFrame` ga stiže.
  const target = useMemo(() => new Color(hex), [hex]);

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

    const material = liquid.current;
    if (material && !material.color.equals(target)) {
      material.color.lerp(target, COLOR_LERP);
    }
  });

  return (
    // Geometrija ima dno u y=0 (docs/3D-ASSETS.md); ovde se model spusti da mu
    // sredina padne u koordinatni početak, pa kamera gleda u nulu.
    <group ref={group} position={[0, -TOTAL_HEIGHT / 2, 0]}>
      <mesh name="Glass" geometry={geometries.glass}>
        <meshPhysicalMaterial
          transmission={1}
          roughness={0.05}
          ior={1.45}
          thickness={0.15}
          metalness={0}
          color="#ffffff"
          ref={glass}
          envMapIntensity={1}
          clearcoat={0.1}
          clearcoatRoughness={0.2}
        />
      </mesh>

      <mesh name="Liquid" geometry={geometries.liquid}>
        <meshStandardMaterial ref={liquid} color={hex} roughness={0.15} metalness={0.05} />
      </mesh>

      <mesh name="Cap" geometry={geometries.cap}>
        <meshStandardMaterial ref={cap} color="#161311" roughness={0.4} metalness={0.15} />
      </mesh>
    </group>
  );
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
