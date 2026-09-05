/**
 * Ono što hero gura u WebGL sloj spolja, van React state-a — menja se svakog frejma
 * (pointer) ili na svaki skrol (scrub) i ne sme da izaziva re-render. Bez importa:
 * ovaj fajl dele `Hero.tsx`, `LiquidCanvas.tsx` i `components/three/HeroBottle.tsx`,
 * pa ne sme da zatvori krug uvoza.
 */
export type HeroDrivers = {
  /** Cilj u opsegu -1..1; shader i bočica ga stižu inercijom. */
  readonly pointer: { current: { x: number; y: number } };
  /** Napredak izlaska heroja iz kadra, 0..1 (ScrollTrigger scrub u `Hero.tsx`). */
  readonly scroll: { current: number };
};

/**
 * Perspektivna kamera hero scene. Na 28 jedinica sa fov 30° vidljiva visina kadra je
 * ~15 jedinica, pa bočica od 9,48 jedinica prirodno zauzima ~62 % visine (spec 12 → B).
 */
export const HERO_CAMERA = { fov: 30, distance: 28 } as const;
