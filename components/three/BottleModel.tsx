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
import { CAP_PIVOT_Y, TOTAL_HEIGHT } from "@/lib/bottleDims";
import { createBottleGeometries, createBrushGeometries } from "./bottleGeometry";
import { loadBottleGlb, preloadBottleGlb } from "./bottleGlb";
import { useStudioEnvironment } from "./studioEnvironment";

/**
 * Sama bočica: pet mreža (`Glass`, `Liquid`, `Cap`, `BrushStem`, `BrushHair`), materijali iz
 * docs/3D-ASSETS.md, studio okruženje i životni ciklus geometrije. Jedan izgled, dva mesta — zid
 * shopa (`BottleScene`, drag i spora rotacija) i hero (`HeroBottle`, scroll koreografija) — pa
 * materijali ne mogu da se raziđu.
 *
 * Geometrija (korak 13, spec I): prvo GLB iz Blendera (`public/models/bocica.glb`, napravljen
 * kroz Blender MCP, zapis u `scripts/bottle.py`; Draco dekoder u `public/draco/`, čitač u
 * `bottleGlb.ts`), a dok se učitava ili ako padne — proceduralna iz `bottleGeometry.ts` (iste
 * mere). Materijali su UVEK iz koda; boja tečnosti i clipping ravan idu na mesh `Liquid`.
 *
 * ZATVARAČ (korak 14): `Cap` + četkica su u grupi sa pivotom u SREDINI zatvarača (`capRef`), pa
 * ga hero odvrće oko ose bočice, diže i naginje oko tačke gde ga drže prsti; u shopu grupa miruje.
 * Dlačice i stem su u boji tečnosti (umočeni su u lak), dlačice sa tankim clearcoat sjajem.
 *
 * Ko je koristi, vozi transform GRUPE kroz `groupRef` u svom `useFrame`; ovde se ne
 * animira ništa osim boje tečnosti i (kroz `envIntensityRef`) živog `envMapIntensity`.
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

const CUT_FACE_PATCH = "#include <normal_fragment_begin>\n\tnormal = gl_FrontFacing ? normal : normalize( uCutNormal );";

type Geometries = {
  glass: BufferGeometry;
  liquid: BufferGeometry;
  cap: BufferGeometry;
  stem: BufferGeometry;
  hair: BufferGeometry;
};

type BottleProps = {
  /** Boja tečnosti, `#RRGGBB` — cilj lerp-a kad nema `liquidColor`. */
  hex: string;
  groupRef: RefObject<Group | null>;
  /** Grupa zatvarača sa četkicom, pivot u sredini zatvarača (hero je odvrće i naginje). */
  capRef?: RefObject<Group | null>;
  envIntensity?: number;
  /** Živ `envMapIntensity` (hero: bočica zablista dok front razlivanja prolazi) — čita se po frejmu. */
  envIntensityRef?: RefObject<number>;
  /** Svetska ravan nivoa tečnosti (liquidLevel.ts); roditelj je osvežava svakog frejma. */
  liquidPlane?: Plane;
  /** Živa boja tečnosti (hero ciklus) — kopira se svakog frejma, bez lerp-a. */
  liquidColor?: Color;
};

function BottleMeshes({
  hex,
  groupRef,
  capRef,
  envIntensity = 1,
  envIntensityRef,
  liquidPlane,
  liquidColor,
  geometries,
}: BottleProps & { geometries: Geometries }) {
  const glass = useRef<MeshPhysicalMaterial>(null);
  const liquid = useRef<MeshStandardMaterial>(null);
  const cap = useRef<MeshStandardMaterial>(null);
  const stem = useRef<MeshStandardMaterial>(null);
  const hair = useRef<MeshPhysicalMaterial>(null);
  const localCap = useRef<Group>(null);
  const camera = useThree((s) => s.camera);

  const lit = useMemo(() => [glass, liquid, cap, stem, hair], []);
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
    const tinted = [liquid.current, stem.current, hair.current];
    if (liquidColor) {
      for (const m of tinted) m?.color.copy(liquidColor);
    } else {
      for (const m of tinted) {
        if (m && !m.color.equals(target)) m.color.lerp(target, COLOR_LERP);
      }
    }
    if (liquidPlane) {
      // Površina gleda NAGORE (normala ravni gleda nadole), u prostoru kamere za osvetljenje.
      cutNormal.value.copy(liquidPlane.normal).negate().transformDirection(camera.matrixWorldInverse);
    }
    if (envIntensityRef) {
      const value = envIntensityRef.current;
      for (const ref of lit) {
        const m = ref.current;
        if (m && m.envMapIntensity !== value) m.envMapIntensity = value;
      }
    }
  });

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
          />
        </mesh>

        <mesh name="Liquid" geometry={geometries.liquid}>
          <meshStandardMaterial
            ref={liquid}
            color={hex}
            roughness={0.15}
            metalness={0.05}
            envMapIntensity={envIntensity}
            side={liquidPlane ? DoubleSide : FrontSide}
            clippingPlanes={clippingPlanes}
            onBeforeCompile={liquidPlane ? onBeforeCompile : undefined}
            customProgramCacheKey={liquidPlane ? cacheKey : undefined}
          />
        </mesh>

        {/* Zatvarač + četkica: pivot u sredini zatvarača, mreže vraćene u koordinate modela. */}
        <group ref={capRef ?? localCap} position={[0, CAP_PIVOT_Y, 0]}>
          <group position={[0, -CAP_PIVOT_Y, 0]}>
            <mesh name="Cap" geometry={geometries.cap}>
              <meshStandardMaterial ref={cap} color="#161311" roughness={0.4} metalness={0.15} envMapIntensity={envIntensity} />
            </mesh>
            <mesh name="BrushStem" geometry={geometries.stem}>
              <meshStandardMaterial ref={stem} color={hex} roughness={0.3} metalness={0.05} envMapIntensity={envIntensity} />
            </mesh>
            <mesh name="BrushHair" geometry={geometries.hair}>
              <meshPhysicalMaterial
                ref={hair}
                color={hex}
                roughness={0.25}
                metalness={0}
                clearcoat={0.5}
                clearcoatRoughness={0.25}
                envMapIntensity={envIntensity}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Proceduralna bočica (bottleGeometry.ts) — fallback dok GLB stiže ili ako padne. */
function ProceduralBottle(props: BottleProps) {
  const geometries = useMemo(() => createBottleGeometries(), []);
  useEffect(() => {
    return () => {
      for (const g of Object.values(geometries)) g.dispose();
    };
  }, [geometries]);
  return <BottleMeshes {...props} geometries={geometries} />;
}

/**
 * GLB iz Blendera: samo geometrije po imenu mesha; materijali ostaju iz koda. `use` suspenduje do
 * dekodiranja. Ako GLB (stariji) nema četkicu, ona je proceduralna — koreografija otvaranja radi isto.
 */
function GlbBottle(props: BottleProps) {
  const loaded = use(loadBottleGlb());
  const geometries = useMemo<Geometries>(() => {
    if (loaded.stem && loaded.hair) return { ...loaded, stem: loaded.stem, hair: loaded.hair };
    return { ...loaded, ...createBrushGeometries() };
  }, [loaded]);
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
