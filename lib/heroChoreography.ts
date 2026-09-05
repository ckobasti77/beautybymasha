/**
 * Koreografija hero zone (.nightrun/specs/13-hero-zona.md → C), kao čista funkcija napretka
 * `p` JEDNOG ScrollTrigger-a (0 = vrh sekcije na vrhu kadra, 1 = dno sekcije na vrhu kadra).
 *
 * BEZ React i BEZ three importa — testira se u vitest-u kao obična matematika; čitaju je
 * `components/hero/Hero.tsx` (DOM: wordmark, copy, stage, ink), `components/hero/LiquidCanvas.tsx`
 * (shader) i `components/three/HeroBottle.tsx` (bočica, kap), svako u svom frejmu.
 *
 * Zona je 170 vh (mobilni 130 vh) sa sticky stage-om od 100 vh: do HOLD_END = (H − vh) / H hero
 * fizički MIRUJE (CSS sticky, ne pin), a segmenti ispod su deo `p` (tabela speca C):
 *
 *  idle      0.00–0.10  lebdenje i yaw se gase
 *  logo      0.04–0.30  wordmark → nav slot (expo.out); crossfade sa nav logom 0.30–0.36
 *  tilt      0.06–0.30  nagib ka copy-ju (+55° z, +12° x)
 *  drop      0.18–0.30  kap raste na vratu; 0.30–0.40 pada do dna kadra
 *  pour      0.36–0.78  radijalno razlivanje uhvaćene boje iz tačke gde je kap izašla
 *  copy      0.55–0.85  copy odlazi (opacity → 0, y → −40 px); CTA prestaju da hvataju klik od 0.55
 *  exit      0.60–1.00  bočica se smanjuje (→ 0.7), drift ka centru, nestaje
 *  lag       HOLD_END–1 stage zaostaje do +40 % svoje visine — sledeća sekcija ga pokriva
 *
 * Znak nagiba: pozitivna rotacija oko z okreće vrh objekta ULEVO (ka copy-ju).
 */

export const TILT_Z_DEG = 55;
export const TILT_X_DEG = 12;
/** Skala na kraju izlaska (1 → 0.7). */
export const EXIT_SCALE = 0.7;

/** Deo visine kadra koji bočica zauzima na desktopu (~62 %). */
export const BOTTLE_HEIGHT_RATIO = 0.62;
/** Bočica stoji u centru desne polovine kadra. */
export const BOTTLE_X_RATIO = 0.25;

/** Prvi pomak skrola koji „hvata" trenutnu boju tečnosti (spec D). Ispod toga ciklus nastavlja. */
export const CAPTURE_P = 0.01;
/** Koliko copy ode naviše dok izlazi, u px. */
export const COPY_LIFT_PX = 40;
/** Stage zaostaje za stranom do 40 % svoje visine (spec G). */
export const STAGE_LAG_RATIO = 0.4;
/** Bez puta (mark ispod 400 px): wordmark i nav logo se zamene na ovom p. */
export const LOGO_SWAP_P = 0.3;
/** Uz prefers-reduced-motion zona je 100 vh, pa je zamena na polovini. */
export const LOGO_SWAP_REDUCED_P = 0.5;

export const ACTS = {
  idle: [0, 0.1],
  logo: [0.04, 0.3],
  crossfade: [0.3, 0.36],
  tilt: [0.06, 0.3],
  dropGrow: [0.18, 0.3],
  dropFall: [0.3, 0.4],
  pour: [0.36, 0.78],
  copy: [0.55, 0.85],
  exit: [0.6, 1],
} as const;

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Linearno 0 → 1 između dve ivice, stegnuto. */
export function ramp(edge0: number, edge1: number, x: number): number {
  return clamp01((x - edge0) / (edge1 - edge0));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = ramp(edge0, edge1, x);
  return t * t * (3 - 2 * t);
}

/** expo.out kao u GSAP-u: 1 − 2^(−10t), sa tačnom jedinicom na kraju. */
export function expoOut(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export type HeroChoreography = {
  /** 1 dok bočica lebdi i yaw-uje u praznom hodu, 0 od 0.10 (kap mora da raste na mirnom vratu). */
  readonly idle: number;
  /** Nagib ka copy-ju oko z ose, u stepenima (0 → +55). */
  readonly tiltZ: number;
  /** Nagib vrha ka gledaocu oko x ose, u stepenima (0 → +12). */
  readonly tiltX: number;
  /** Kap na vratu: skala 0 → 1 (0.18–0.30). */
  readonly drop: number;
  /** Pad kapi: 0 (na vratu) → 1 (ispod donje ivice kadra), 0.30–0.40. */
  readonly fall: number;
  /** Kap postoji (raste ili pada). */
  readonly dropVisible: boolean;
  /** Uniform `uPour` u shaderu (0 → 1): radijalni front iz tačke izlaska kapi. */
  readonly pour: number;
  /** Množilac skale bočice (1 → 0.7). */
  readonly scale: number;
  /** Koliko je bočica prešla ka centru kadra (0 = desna polovina, 1 = centar). */
  readonly drift: number;
  /** Providnost materijala bočice (1 → 0). */
  readonly opacity: number;
  /** Napredak puta wordmark-a ka slotu, već sa expo.out ease-om (0 → 1). */
  readonly logo: number;
  /** Crossfade 0.30–0.36: wordmark 1 → 0, nav logo 0 → 1 (zbir je uvek 1). */
  readonly wordmarkOpacity: number;
  readonly navLogoOpacity: number;
  /** Copy kontejner: opacity 1 → 0 i y 0 → −40 px (0.55–0.85). */
  readonly copyOpacity: number;
  readonly copyY: number;
  /** CTA hvataju klik samo pre 0.55. */
  readonly copyInteractive: boolean;
  /** Od 0.85 copy je `display: none` — iznad je kadra, a provera iz MOTION.md ostaje poštena. */
  readonly copyHidden: boolean;
};

export function heroChoreography(progress: number): HeroChoreography {
  const p = clamp01(progress);
  const tilt = smoothstep(ACTS.tilt[0], ACTS.tilt[1], p);
  const grow = smoothstep(ACTS.dropGrow[0], ACTS.dropGrow[1], p);
  const fallT = ramp(ACTS.dropFall[0], ACTS.dropFall[1], p);
  // Pad ubrzava (t²) — kap koja se otkačila ne pada linearno.
  const fall = fallT * fallT;
  const pour = smoothstep(ACTS.pour[0], ACTS.pour[1], p);
  const exit = smoothstep(ACTS.exit[0], ACTS.exit[1], p);
  const cross = ramp(ACTS.crossfade[0], ACTS.crossfade[1], p);
  const copy = smoothstep(ACTS.copy[0], ACTS.copy[1], p);
  return {
    idle: 1 - smoothstep(ACTS.idle[0], ACTS.idle[1], p),
    tiltZ: TILT_Z_DEG * tilt,
    tiltX: TILT_X_DEG * tilt,
    drop: grow,
    fall,
    dropVisible: grow > 0 && fall < 1,
    pour,
    scale: 1 - (1 - EXIT_SCALE) * exit,
    drift: exit,
    opacity: 1 - exit,
    logo: expoOut(ramp(ACTS.logo[0], ACTS.logo[1], p)),
    wordmarkOpacity: 1 - cross,
    navLogoOpacity: cross,
    copyOpacity: 1 - copy,
    copyY: -COPY_LIFT_PX * copy || 0,
    copyInteractive: p < ACTS.copy[0],
    copyHidden: p >= ACTS.copy[1],
  };
}

/** Zamena bez puta: 0 pre praga, 1 od praga (mark ispod 400 px, reduced motion). */
export function logoSwap(p: number, at: number): 0 | 1 {
  return p >= at ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/*  Sticky zona: hold, zaostajanje stage-a                              */
/* ------------------------------------------------------------------ */

/**
 * Do kog napretka hero miruje: (H − vh) / H iz IZMERENIH visina sekcije i stage-a
 * (170 vh / 100 vh → 0.41; 130 vh → 0.23; reduced motion 100 vh → 0 = bez holda).
 */
export function holdEndOf(sectionHeight: number, stageHeight: number): number {
  if (!(sectionHeight > 0)) return 0;
  return clamp01((sectionHeight - stageHeight) / sectionHeight);
}

/** Za koliko px stage zaostaje za stranom (translateY), 0 → 40 % visine stage-a preko HOLD_END..1. */
export function stageLag(p: number, holdEnd: number, stageHeight: number): number {
  if (holdEnd >= 1) return 0;
  return STAGE_LAG_RATIO * stageHeight * smoothstep(holdEnd, 1, clamp01(p));
}

/**
 * Gde je gornja ivica stage-a na EKRANU pri napretku `p`: sticky ga drži na 0 do holdEnd, posle
 * ga sekcija gura naviše brzinom strane, a lag ga vraća deo puta nazad. Čista funkcija — na njoj
 * počiva i put wordmark-a (lib/logoTravel.ts).
 */
export function stageTop(p: number, holdEnd: number, sectionHeight: number, stageHeight: number): number {
  const q = clamp01(p);
  return -Math.max(0, q - holdEnd) * sectionHeight + stageLag(q, holdEnd, stageHeight);
}

/* ------------------------------------------------------------------ */
/*  Radijalno razlivanje — isti izraz kao u liquidShader.ts            */
/* ------------------------------------------------------------------ */

export type Uv = { readonly x: number; readonly y: number };

/** Front kreće 0.3 „iza" ishodišta: na uPour = 0 ni iskrivljena ivica ne ulazi u kadar. */
export const POUR_START = 0.3;
/** Na uPour = 1 front je i za ovoliko IZA najdaljeg ugla, pa meka ivica i warp ne ostave rupu. */
export const POUR_OVERSHOOT = 0.35;
export const POUR_EDGE_SOFT = 0.14;
export const POUR_EDGE_HARD = 0.03;

/** Najveće rastojanje od ishodišta do nekog ugla kadra, u uv prostoru ispravljenom za aspect. */
export function pourMaxRadius(origin: Uv, aspect: number): number {
  let max = 0;
  for (const cx of [0, 1]) {
    for (const cy of [0, 1]) {
      const dx = (cx - origin.x) * aspect;
      const dy = cy - origin.y;
      max = Math.max(max, Math.hypot(dx, dy));
    }
  }
  return max;
}

export function pourFront(pour: number, maxRadius: number): number {
  return pour * (maxRadius + POUR_START + POUR_OVERSHOOT) - POUR_START;
}

/** Koliko je tačka `uv` prekrivena razlivenom bojom (0 → 1), bez warp člana iz shadera. */
export function pourCoverage(uv: Uv, origin: Uv, aspect: number, pour: number): number {
  const d = Math.hypot((uv.x - origin.x) * aspect, uv.y - origin.y);
  const front = pourFront(pour, pourMaxRadius(origin, aspect));
  return 1 - smoothstep(front - POUR_EDGE_SOFT, front + POUR_EDGE_HARD, d);
}

/* ------------------------------------------------------------------ */
/*  Raspored bočice u kadru                                             */
/* ------------------------------------------------------------------ */

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
