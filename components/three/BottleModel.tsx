"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, type Group, type MeshPhysicalMaterial, type MeshStandardMaterial } from "three";
import { TOTAL_HEIGHT, createBottleGeometries } from "./bottleGeometry";
import { useStudioEnvironment } from "./studioEnvironment";

/**
 * Sama bočica: tri mreže (`Glass`, `Liquid`, `Cap`), materijali iz docs/3D-ASSETS.md,
 * studio okruženje i životni ciklus geometrije. Jedan izgled, dva mesta — zid shopa
 * (`BottleScene`, drag i spora rotacija) i hero (`HeroBottle`, scroll koreografija) —
 * pa materijali ne mogu da se raziđu.
 *
 * Ko je koristi, vozi transform GRUPE kroz `groupRef` u svom `useFrame`; ovde se ne
 * animira ništa osim prelaza boje tečnosti.
 *
 * `opacity` (0..1) je za hero izlazak: kad padne ispod praga grupa se sakrije, pa
 * transmission prolaz stakla ne troši GPU na nevidljivu bočicu.
 *
 * Kako se bledi bez „nestale tečnosti": three crta transmisivno staklo iz render targeta
 * u koji ulaze SAMO neprovidni objekti, a providne (`transparent`) crta posle stakla i
 * odbacuje ih iza njegove prednje površine. Tečnost i zatvarač zato ostaju neprovidni i
 * blede kroz `alphaHash` (stohastičko odbacivanje piksela, glatko uz MSAA); samo staklo
 * bledi običnim `opacity` blendingom — ono je ionako u transmisivnom prolazu.
 */

/** Koliko brzo tečnost pređe u novu nijansu. */
const COLOR_LERP = 0.08;
/** Ispod ovoga bočica je i formalno nevidljiva. */
const VISIBLE_EPS = 0.01;

export function BottleModel({
  hex,
  groupRef,
  opacity,
  envIntensity = 1,
}: {
  /** Boja tečnosti, `#RRGGBB`. */
  hex: string;
  groupRef: RefObject<Group | null>;
  /** Ref koji hero piše svakog frejma; bez njega je bočica uvek puna. */
  opacity?: RefObject<number>;
  envIntensity?: number;
}) {
  const glass = useRef<MeshPhysicalMaterial>(null);
  const liquid = useRef<MeshStandardMaterial>(null);
  const cap = useRef<MeshStandardMaterial>(null);

  const lit = useMemo(() => [glass, liquid, cap], []);
  useStudioEnvironment(lit, envIntensity);

  const geometries = useMemo(() => createBottleGeometries(), []);
  useEffect(() => {
    const { glass: glassGeometry, liquid: liquidGeometry, cap: capGeometry } = geometries;
    return () => {
      glassGeometry.dispose();
      liquidGeometry.dispose();
      capGeometry.dispose();
    };
  }, [geometries]);

  // Cilj boje živi van rendera: na zidu shopa se menja na svaki prelaz mišem, a
  // `useFrame` ga stiže; u heroju je stalan (brend mint).
  const target = useMemo(() => new Color(hex), [hex]);

  useFrame(() => {
    const material = liquid.current;
    if (material && !material.color.equals(target)) {
      material.color.lerp(target, COLOR_LERP);
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
