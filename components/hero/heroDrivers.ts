/**
 * Ono što hero gura u WebGL sloj i u DOM kap spolja, van React state-a — menja se svakog frejma
 * (pointer, boja) ili na svaki skrol (scrub) i ne sme da izaziva re-render.
 *
 * BEZ React/three importa: ovaj fajl dele `Hero.tsx`, `LiquidCanvas.tsx` i
 * `components/three/HeroBottle.tsx`, pa ne sme da zatvori krug uvoza. I nosi SAMO brojeve i hex
 * stringove: `THREE.Color` ovde bi povukao `three` u početni JS landinga (`Hero.tsx` nije lenji
 * chunk) — boju u `Color` pretvara canvas (`components/three/liquidColor.ts`), sa kešom po hex-u.
 * Jedini uvoz su čiste konstante mera (`lib/bottleDims.ts`).
 */

export { HERO_CAMERA } from "@/lib/bottleDims";

/** Hex par iz ciklusa boja (lib/heroColors.ts) i mešavina između njih. */
export type LiquidBlend = { from: string; to: string; t: number };

export type HeroDrivers = {
  /** Cilj u opsegu -1..1; shader i bočica ga stižu inercijom. */
  readonly pointer: { current: { x: number; y: number } };
  /** Napredak hero zone, SIROV (bez lerp-a), 0..1 — jedan ScrollTrigger u `Hero.tsx`. */
  readonly scroll: { current: number };
  /** HOLD_END izmeren u `Hero.tsx` (bočica ga treba za ivicu police). */
  readonly holdEnd: { current: number };
  /** Boja tečnosti koja se trenutno vidi (ciklus ili uhvaćena — tada ciklus stoji). */
  readonly liquid: { current: LiquidBlend };
  /** Faza ciklusa boja, 0..1 unutar jednog perioda (hold + crossfade) — rim sweep bočice. */
  readonly cyclePhase: { current: number };
  /** Uhvaćena boja (`#RRGGBB`) ili null dok ciklus teče — ulaz za razlivanje i ink. */
  readonly captured: { current: string | null };
  /**
   * Tačka (uv, y na gore) iz koje kreće razlivanje: bočica je računa iz vrha dlačica u svom frejmu,
   * DOM kap (bez bočice) iz svog položaja pri merenju.
   */
  readonly pourOrigin: { current: { x: number; y: number } };
  /** Samo dev (`window.__bbmHero.bottle`): bočica upisuje svoje brojeve za proveru D. */
  readonly debug: { current: Record<string, number> };
};
