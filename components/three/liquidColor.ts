import { Color } from "three";
import type { LiquidBlend } from "@/components/hero/heroDrivers";

/**
 * Boja tečnosti kao `THREE.Color`: hex par iz `HeroDrivers.liquid` → lerp u radnom (linearnom)
 * prostoru, sa kešom po hex-u — bez parsiranja stringa po frejmu. Jedan primerak po canvasu,
 * `value` čitaju shader (`uPourColor`), bočica (materijal tečnosti) i kap.
 *
 * `new Color(hex)` prolazi kroz ColorManagement (sRGB → linear), pa je mešanje ovde isto što i
 * u shaderu; sirov hex u uniform bi bio pogrešan prostor (spec D).
 */
export class LiquidColor {
  readonly value = new Color("#57BFA8");
  private readonly cache = new Map<string, Color>();

  private of(hex: string): Color {
    let c = this.cache.get(hex);
    if (!c) {
      c = new Color(hex);
      this.cache.set(hex, c);
    }
    return c;
  }

  update(blend: LiquidBlend): void {
    const from = this.of(blend.from);
    if (blend.t <= 0) this.value.copy(from);
    else this.value.lerpColors(from, this.of(blend.to), Math.min(1, blend.t));
  }
}
