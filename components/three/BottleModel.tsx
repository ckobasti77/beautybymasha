"use client";

import { Component, Suspense, use, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  FrontSide,
  Vector3,
  type BufferGeometry,
  type Group,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type Plane,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { TOTAL_HEIGHT, createBottleGeometries } from "./bottleGeometry";
import { loadBottleGlb, preloadBottleGlb } from "./bottleGlb";
import { useStudioEnvironment } from "./studioEnvironment";

/**
 * Sama bočica: tri mreže (`Glass`, `Liquid`, `Cap`), materijali iz docs/3D-ASSETS.md,
 * studio okruženje i životni ciklus geometrije. Jedan izgled, dva mesta — zid shopa
 * (`BottleScene`, drag i spora rotacija) i hero (`HeroBottle`, scroll koreografija) —
 * pa materijali ne mogu da se raziđu.
 *
 * Geometrija (korak 13, spec I): prvo GLB iz Blendera (`public/models/bocica.glb`, napravljen
 * kroz Blender MCP, zapis u `scripts/bottle.py`; Draco dekoder u `public/draco/`, čitač u
 * `bottleGlb.ts`), a dok se učitava ili ako padne — proceduralna iz `bottleGeometry.ts` (iste
 * mere). Materijali su UVEK iz koda; boja tečnosti i clipping ravan idu na mesh `Liquid`.
 *
 * Ko je koristi, vozi transform GRUPE kroz `groupRef` u svom `useFrame`; ovde se ne
 * animira ništa osim boje tečnosti.
 *
 * `opacity` (0..1) je za hero izlazak: kad padne ispod praga grupa se sakrije, pa
 * transmission prolaz stakla ne troši GPU na nevidljivu bočicu.
 *
 * Kako se bledi bez „nestale tečnosti": three crta transmisivno staklo iz render targeta
 * u koji ulaze SAMO neprovidni objekti, a providne (`transparent`) crta posle stakla i
 * odbacuje ih iza njegove prednje površine. Tečnost i zatvarač zato ostaju neprovidni i
 * blede kroz `alphaHash` (stohastičko odbacivanje piksela, glatko uz MSAA); samo staklo
 * bledi običnim `opacity` blendingom — ono je ionako u transmisivnom prolazu.
 *
 * Nivo tečnosti (korak 13, spec F): mesh `Liquid` je PUNA unutrašnjost, a `liquidPlane`
 * (svetska horizontalna ravan, `liquidLevel.ts`) seče sve iznad nivoa. Materijal je
 * `DoubleSide` da presek ima lice, a to lice (zadnje strane šupljeg tela) bi bez pomoći
 * izgledalo kao šuplja činija — zato `onBeforeCompile` zadnjim stranama podmetne normalu
 * ravni: presek se osvetljava kao ravna površina tečnosti.
 */

// Kao `useGLTF.preload`: fetch i dekodiranje kreću čim lenji chunk stigne, ne tek pri montiranju.
preloadBottleGlb();

/** Koliko brzo tečnost pređe u novu nijansu (zid shopa). */
const COLOR_LERP = 0.08;
/** Ispod ovoga bočica je i formalno nevidljiva. */
const VISIBLE_EPS = 0.01;

const CUT_FACE_PATCH = "#include <normal_fragment_begin>\n\tnormal = gl_FrontFacing ? normal : normalize( uCutNormal );";

type Geometries = { glass: BufferGeometry; liquid: BufferGeometry; cap: BufferGeometry };

type BottleProps = {
  /** Boja tečnosti, `#RRGGBB` — cilj lerp-a kad nema `liquidColor`. */
  hex: string;
  groupRef: RefObject<Group | null>;
  /** Ref koji hero piše svakog frejma; bez njega je bočica uvek puna. */
  opacity?: RefObject<number>;
  envIntensity?: number;
  /** Svetska ravan nivoa tečnosti (liquidLevel.ts); roditelj je osvežava svakog frejma. */
  liquidPlane?: Plane;
  /** Živa boja tečnosti (hero ciklus) — kopira se svakog frejma, bez lerp-a. */
  liquidColor?: Color;
};

function BottleMeshes({
  hex,
  groupRef,
  opacity,
  envIntensity = 1,
  liquidPlane,
  liquidColor,
  geometries,
}: BottleProps & { geometries: Geometries }) {
  const glass = useRef<MeshPhysicalMaterial>(null);
  const liquid = useRef<MeshStandardMaterial>(null);
  const cap = useRef<MeshStandardMaterial>(null);
  const camera = useThree((s) => s.camera);

  const lit = useMemo(() => [glass, liquid, cap], []);
  useStudioEnvironment(lit, envIntensity);

  // Cilj boje živi van rendera: na zidu shopa se menja na svaki prelaz mišem, a
  // `useFrame` ga stiže; u heroju živu boju daje `liquidColor`.
  const target = useMemo(() => new Color(hex), [hex]);

  /*
   * Presek tečnosti: normala ravni u prostoru kamere, kao uniform koji shader čita za
   * zadnje strane. Objekat je jedan po komponenti (useMemo), a `onBeforeCompile` je
   * stabilna funkcija — three kešira program po `customProgramCacheKey`.
   */
  const cutNormal = useMemo(() => ({ value: new Vector3(0, 1, 0) }), []);
  const onBeforeCompile = useMemo(
    () => (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uCutNormal = cutNormal;
      shader.fragmentShader = `uniform vec3 uCutNormal;\n${shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        CUT_FACE_PATCH,
      )}`;
    },
    [cutNormal],
  );
  const cacheKey = useMemo(() => () => "bbm-liquid-cut", []);
  const clippingPlanes = useMemo(() => (liquidPlane ? [liquidPlane] : null), [liquidPlane]);

  useFrame(() => {
    const material = liquid.current;
    if (material) {
      if (liquidColor) material.color.copy(liquidColor);
      else if (!material.color.equals(target)) material.color.lerp(target, COLOR_LERP);
    }
    if (liquidPlane) {
      // Površina gleda NAGORE (normala ravni gleda nadole), u prostoru kamere za osvetljenje.
      cutNormal.value.copy(liquidPlane.normal).negate().transformDirection(camera.matrixWorldInverse);
    }

    if (!opacity) return;
    const g = groupRef.current;
    const value = Math.min(1, Math.max(0, opacity.current));
    for (const m of [glass.current, liquid.current, cap.current]) {
      if (m && m.opacity !== value) m.opacity = value;
    }
    if (g) g.visible = value > VISIBLE_EPS;
  });

  const fades = opacity !== undefined;

  return (
    // Geometrija ima dno u y=0 (docs/3D-ASSETS.md); ovde se model spusti da mu
    // sredina padne u koordinatni početak, pa se okreće i naginje oko sopstvenog centra.
    <group ref={groupRef}>
      <group position={[0, -TOTAL_HEIGHT / 2, 0]}>
        <mesh name="Glass" geometry={geometries.glass}>
          <meshPhysicalMaterial
            ref={glass}
            transmission={1}
            roughness={0.05}
            ior={1.45}
            thickness={0.15}
            metalness={0}
            color="#ffffff"
            envMapIntensity={envIntensity}
            clearcoat={0.1}
            clearcoatRoughness={0.2}
            transparent={fades}
          />
        </mesh>

        <mesh name="Liquid" geometry={geometries.liquid}>
          <meshStandardMaterial
            ref={liquid}
            color={hex}
            roughness={0.15}
            metalness={0.05}
            envMapIntensity={envIntensity}
            alphaHash={fades}
            side={liquidPlane ? DoubleSide : FrontSide}
            clippingPlanes={clippingPlanes}
            onBeforeCompile={liquidPlane ? onBeforeCompile : undefined}
            customProgramCacheKey={liquidPlane ? cacheKey : undefined}
          />
        </mesh>

        <mesh name="Cap" geometry={geometries.cap}>
          <meshStandardMaterial
            ref={cap}
            color="#161311"
            roughness={0.4}
            metalness={0.15}
            envMapIntensity={envIntensity}
            alphaHash={fades}
          />
        </mesh>
      </group>
    </group>
  );
}

/** Proceduralna bočica (bottleGeometry.ts) — fallback dok GLB stiže ili ako padne. */
function ProceduralBottle(props: BottleProps) {
  const geometries = useMemo(() => createBottleGeometries(), []);
  useEffect(() => {
    const { glass, liquid, cap } = geometries;
    return () => {
      glass.dispose();
      liquid.dispose();
      cap.dispose();
    };
  }, [geometries]);
  return <BottleMeshes {...props} geometries={geometries} />;
}

/** GLB iz Blendera: samo geometrije po imenu mesha; materijali ostaju iz koda. `use` suspenduje do dekodiranja. */
function GlbBottle(props: BottleProps) {
  const geometries = use(loadBottleGlb());
  return <BottleMeshes {...props} geometries={geometries} />;
}

/** Ako GLB ne može da se učita (404, dekoder), bočica ostaje proceduralna — bez rupe u heroju. */
class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function BottleModel(props: BottleProps) {
  const fallback = <ProceduralBottle {...props} />;
  return (
    <GlbBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbBottle {...props} />
      </Suspense>
    </GlbBoundary>
  );
}
