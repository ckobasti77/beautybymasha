/**
 * Scroll koreografija hero bočice (.nightrun/specs/12-hero-bocica.md → C), kao čista
 * funkcija napretka `p` (0 = hero na vrhu kadra, 1 = hero izašao iz kadra).
 *
 * BEZ React i BEZ three importa — ovo se testira u vitest-u kao obična matematika, a
 * `components/three/HeroBottle.tsx` i hero shader je samo čitaju u `useFrame`.
 *
 * Tri preklopljena čina, svaki po `smoothstep` krivoj (bez oštrih prelaza):
 *  - 0.00–0.35  bočica se NAGINJE ka copy-ju (rotation.z do +55°, rotation.x do +12°)
 *  - 0.25–0.70  shader `uPour` 0 → 1: mint se RAZLIVA po pozadini, gore-desno → dole-levo
 *  - 0.55–1.00  bočica se SMANJUJE (1 → 0.7), drift ka centru kadra, opacity → 0
 *
 * Znak nagiba: u three.js pozitivna rotacija oko z okreće vrh objekta ULEVO (suprotno od
 * kazaljke gledano ka ekranu) — spec kaže „ka levo-dole, ka copy-ju", pa je ugao pozitivan.
 */

export const TILT_Z_DEG = 55;
export const TILT_X_DEG = 12;
/** Skala na kraju izlaska (spec C: 1 → 0.7). */
export const EXIT_SCALE = 0.7;

/** Deo visine heroja koji bočica zauzima na desktopu (spec B: ~62 %). */
export const BOTTLE_HEIGHT_RATIO = 0.62;
/** Bočica stoji u centru desne polovine kadra (spec B). */
export const BOTTLE_X_RATIO = 0.25;

const ACTS = {
  tilt: [0, 0.35],
  pour: [0.25, 0.7],
  exit: [0.55, 1],
} as const;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export type HeroChoreography = {
  /** Nagib ka copy-ju oko z ose, u stepenima (0 → +55). */
  readonly tiltZ: number;
  /** Nagib vrha ka gledaocu oko x ose, u stepenima (0 → +12). */
  readonly tiltX: number;
  /** Uniform `uPour` u shaderu (0 → 1). */
  readonly pour: number;
  /** Množilac skale bočice (1 → 0.7). */
  readonly scale: number;
  /** Koliko je bočica prešla ka centru kadra (0 = desna polovina, 1 = centar). */
  readonly drift: number;
  /** Providnost materijala bočice (1 → 0). */
  readonly opacity: number;
};

export function heroChoreography(progress: number): HeroChoreography {
  const p = Math.min(1, Math.max(0, progress));
  const tilt = smoothstep(ACTS.tilt[0], ACTS.tilt[1], p);
  const pour = smoothstep(ACTS.pour[0], ACTS.pour[1], p);
  const exit = smoothstep(ACTS.exit[0], ACTS.exit[1], p);
  return {
    tiltZ: TILT_Z_DEG * tilt,
    tiltX: TILT_X_DEG * tilt,
    pour,
    scale: 1 - (1 - EXIT_SCALE) * exit,
    drift: exit,
    opacity: 1 - exit,
  };
}

export type BottleLayout = {
  /** Položaj centra bočice po x, u jedinicama scene (desna polovina kadra). */
  readonly x: number;
  /** Skala kojom model ukupne visine `modelHeight` zauzima `BOTTLE_HEIGHT_RATIO` kadra. */
  readonly scale: number;
};

/**
 * Raspored u kadru iz vidljive širine i visine scene na dubini bočice (jedinice scene,
 * ne pikseli): centar desne polovine, ~62 % visine kadra.
 */
export function bottleLayout(visibleWidth: number, visibleHeight: number, modelHeight: number): BottleLayout {
  return {
    x: visibleWidth * BOTTLE_X_RATIO,
    scale: (visibleHeight * BOTTLE_HEIGHT_RATIO) / modelHeight,
  };
}

/**
 * Vidljiva visina kadra perspektivne kamere na rastojanju `distance` (jedinice scene).
 * `fovDeg` je vertikalni fov kao u three.js `PerspectiveCamera`.
 */
export function visibleHeightAt(fovDeg: number, distance: number): number {
  return 2 * distance * Math.tan((fovDeg * Math.PI) / 360);
}
