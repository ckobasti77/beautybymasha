"use client";

import { useEffect, type RefObject } from "react";
import { PMREMGenerator, type MeshStandardMaterial } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useThree } from "@react-three/fiber";

/**
 * Okruženje za odsjaje: `RoomEnvironment` provučen kroz PMREM, jednom po platnu.
 * Bez ijednog fajla i bez mreže — drei `<Environment preset>` bi skidao HDR sa spoljnog
 * CDN-a. Okruženje je ono što staklu daje odsjaje: bez njega `transmission` izgleda kao
 * siva plastika.
 *
 * Tekstura se kači direktno na materijale kroz ref, ne kroz `scene.environment` i ne
 * kroz state. Scena je tuđi objekat, a setState iz efekta bi značio jedan bespotreban
 * prolaz kroz render zbog podatka koji React ionako ne posmatra.
 *
 * `intensity` — koliko odsjaja materijali uzimaju (hero traži „nizak intenzitet", da
 * bočica ne blešti preko shadera; zid shopa može jače).
 */
// `MeshPhysicalMaterial` nasleđuje `MeshStandardMaterial`, pa oba staju u isti ref tip.
export function useStudioEnvironment(
  materials: readonly RefObject<MeshStandardMaterial | null>[],
  intensity = 1,
): void {
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
      material.envMapIntensity = intensity;
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
  }, [gl, invalidate, materials, intensity]);
}
