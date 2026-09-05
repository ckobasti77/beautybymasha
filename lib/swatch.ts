/**
 * Kap laka (spec 11 B): sve što se iz hex-a izvodi bez CSS-a. Bez React-a.
 *
 * Nasumičnost mora da bude ČIST hash hex-a: kartice se crtaju i na serveru, pa bi
 * `Math.random()` dao 70 hidration grešaka. Isti hex → ista kap, svuda i uvek.
 */
import type { Finish } from "./products";

/** Četiri blago nepravilna kruga — kap nikad nije savršen krug. */
export const SWATCH_SHAPES = [
  "48% 52% 50% 50% / 51% 49% 51% 49%",
  "52% 48% 49% 51% / 49% 52% 48% 51%",
  "50% 50% 47% 53% / 52% 50% 50% 48%",
  "49% 51% 52% 48% / 48% 50% 50% 52%",
] as const;

/** Finiši koji nose sloj teksture (SVG filter iz `components/shop/SwatchDefs.tsx`). */
export const TEXTURED_FINISHES: ReadonlySet<Finish> = new Set<Finish>(["shimmer", "glitter", "holo", "metallic"]);

export type SwatchVars = {
  readonly shape: (typeof SWATCH_SHAPES)[number];
  /** Rotacija sloja teksture: 0 ili 180 — pravac svetla ostaje gore-levo. */
  readonly rotate: 0 | 180;
  readonly flip: 1 | -1;
};

export function hashHex(hex: string): number {
  let h = 2166136261;
  for (const ch of hex.toUpperCase()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function swatchVars(hex: string): SwatchVars {
  const h = hashHex(hex);
  return {
    shape: SWATCH_SHAPES[h % SWATCH_SHAPES.length],
    rotate: (h >> 3) & 1 ? 180 : 0,
    flip: (h >> 5) & 1 ? -1 : 1,
  };
}

/** Inline CSS promenljive koje čita `.sw` u globals.css. */
export function swatchStyle(hex: string): Record<`--sw${string}`, string> {
  const v = swatchVars(hex);
  return {
    "--sw": hex,
    "--sw-shape": v.shape,
    "--sw-rot": `${v.rotate}deg`,
    "--sw-flip": String(v.flip),
  };
}
