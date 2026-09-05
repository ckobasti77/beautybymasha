/**
 * Koreografija hero zone v3 (.nightrun/specs/14-hero-koreografija.md), kao čista funkcija napretka
 * `p` JEDNOG ScrollTrigger-a (0 = vrh sekcije na vrhu kadra, 1 = dno sekcije na vrhu kadra).
 *
 * BEZ React i BEZ three importa — testira se u vitest-u kao obična matematika; čitaju je
 * `components/hero/Hero.tsx` (DOM: slova, potpis, frost, copy, senka police, stage, ink),
 * `components/hero/LiquidCanvas.tsx` (shader) i `components/three/HeroBottle.tsx` (bočica,
 * zatvarač, četkica, kap, kamera), svako u svom frejmu.
 *
 * Zona je 170 vh (mobilni 130 vh) sa sticky stage-om od 100 vh: do HOLD_END = (H − vh) / H hero
 * fizički MIRUJE (CSS sticky, ne pin). Segmenti (docs/MOTION.md → Hero v3):
 *
 *  idle       0.00–0.10  lebdenje, yaw, rim sweep se gase; pointer/hover do 0.20 (interact)
 *  kamera     0.04–0.22  fov 30 → 34 (dolly-out, da izvučena četkica stane u kadar); 0.42–0.58 nazad
 *  yaw        0.04–0.22  telo u 3/4 pogled (−25°), ostaje uspravno
 *  otvaranje  0.04–0.22  zatvarač: spin 720°, lift dok dlačice ne izađu iz vrata + 0.3; telo −½ lifta
 *  slova      0.06+0.015i → 0.24+0.015i  (lib/logoTravel.ts)
 *  potpis     0.10–0.20 briše, 0.20–0.24 tačka leti, 0.24–0.36 piše  (lib/logoSignature.ts)
 *  reflow     0.12–0.30 (+0.02 po elementu)  copy se preslaže u prostor wordmarka
 *  cap odlazi 0.22–0.30  zatvarač sa četkicom ulevo 12 % kadra, nagib −25°
 *  kap        0.24–0.32 raste na vrhu dlačica; 0.32–0.42 pada (t²) do ispod kadra
 *  frost      0.30–0.42  clip-path s leva (iz slota)
 *  razlivanje 0.36–0.78  radijalno iz tačke izlaska kapi; sparkle env 0.6 → 0.9 → 0.6
 *  copy izlaz strip 0.55–0.65, lead reči 0.56–0.72, CTA 0.60–0.78, h1 reči 0.62–0.80; hidden 0.85
 *  cap nazad  0.58–0.64 vraća se nad vrat; 0.64–0.74 spušta se i zavrće (360°)
 *  polica     0.62–0.70 baza sleće na ivicu .hero-overlap; 0.62–0.78 scale 1 → 0.55, x 75 % → 70 %
 *  senka      0.70–0.80  kontakt senka na polici
 *  lag        HOLD_END–1 stage zaostaje do +40 % svoje visine
 */

/** Prvi pomak skrola koji „hvata" trenutnu boju tečnosti (spec 13 D). Ispod toga ciklus nastavlja. */
export const CAPTURE_P = 0.01;
/** Stage zaostaje za stranom do 40 % svoje visine (spec 13 G). */
export const STAGE_LAG_RATIO = 0.4;
/** Bez puta (mark ispod 400 px): wordmark i nav logo se zamene na ovom p. */
export const LOGO_SWAP_P = 0.3;
/** Uz prefers-reduced-motion zona je 100 vh, pa je zamena na polovini. */
export const LOGO_SWAP_REDUCED_P = 0.5;

export const SHELF_SCALE = 0.55;

/** Fov kamere u miru — isti broj kao `HERO_CAMERA.fov` u lib/bottleDims.ts (test to čuva); literal
 * da mere bočice ne uđu u početni JS landinga (raspored i polica su u lib/bottleScreen.ts). */
export const FOV_REST = 30;
export const FOV_OPEN = 34;
export const YAW_DEG = -25;
export const CAP_SPIN_OPEN_DEG = 720;
export const CAP_SPIN_CLOSE_DEG = 360;
/**
 * Izvađen zatvarač: nagib −25° o pivotu nosi vrh dlačica ~11 % kadra ulevo (ka copy-ju), pa je
 * translacija samo 2 % — sa 12 % iz speca vrh i stem prelaze preko lead pasusa (mereno na 1440).
 */
export const CAP_AWAY_X_RATIO = 0.02;
export const CAP_AWAY_Y_RATIO = 0;
export const CAP_TILT_DEG = -25;
/** Telo bočice se spušta za ovoliki deo podizanja zatvarača — kompozicija ostaje centrirana. */
export const BODY_DROP_SHARE = 0.5;
/** Nivo tečnosti padne za 3 % visine tela dok je četkica napolju (zapremina stema). */
export const LEVEL_DROP_RATIO = 0.03;
export const SPARKLE_MIN = 0.6;
export const SPARKLE_MAX = 0.9;
/** Reč pri izlasku pada za 18 px. */
export const WORD_EXIT_Y = 18;
/** Od 0.85 copy je `display: none` — iznad je kadra, a provera iz MOTION.md ostaje poštena. */
export const COPY_HIDDEN_P = 0.85;

export const ACTS = {
  idle: [0, 0.1],
  interact: [0.04, 0.2],
  fovOut: [0.04, 0.22],
  fovBack: [0.42, 0.58],
  yaw: [0.04, 0.22],
  capOpen: [0.04, 0.22],
  capAway: [0.22, 0.3],
  dropGrow: [0.24, 0.32],
  dropFall: [0.32, 0.42],
  frost: [0.3, 0.42],
  pour: [0.36, 0.78],
  sparkleUp: [0.4, 0.5],
  sparkleDown: [0.5, 0.78],
  copyExit: [0.55, 0.8],
  capReturn: [0.58, 0.64],
  capClose: [0.64, 0.74],
  shelfLand: [0.62, 0.7],
  shelfScale: [0.62, 0.78],
  shadow: [0.7, 0.8],
} as const;

/** Reflow copy-ja: h1 prvi, pa lead, CTA red, strip — svaki +0.02 kasnije, isto trajanje. */
export const REFLOW = { start: 0.12, swapStart: 0.3, stagger: 0.02, duration: 0.18 } as const;

/** Izlaz copy-ja obrnutim redosledom čitanja; `word` je trajanje jedne reči. */
export const EXIT = {
  strip: [0.55, 0.65],
  lead: [0.56, 0.72],
  cta: [0.6, 0.78],
  title: [0.62, 0.8],
  word: 0.06,
} as const;

/* ------------------------------------------------------------------ */
/*  Ease-ovi (kao u GSAP-u)                                             */
/* ------------------------------------------------------------------ */

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

export function expoInOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 0.5 * Math.pow(2, 20 * t - 10) : 1 - 0.5 * Math.pow(2, -20 * t + 10);
}

export function power2In(t: number): number {
  const x = clamp01(t);
  return x * x;
}

export function power2Out(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

export function power2InOut(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
}

export function power3Out(t: number): number {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x) * (1 - x);
}

export function power3InOut(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - 4 * (1 - x) * (1 - x) * (1 - x);
}

/* ------------------------------------------------------------------ */
/*  Glavna funkcija                                                     */
/* ------------------------------------------------------------------ */

export type HeroChoreography = {
  /** 1 dok bočica lebdi i yaw-uje u praznom hodu, 0 od 0.10. */
  readonly idle: number;
  /** 1 dok pointer parallax i hover skala važe, 0 od 0.20 (poza mora biti deterministička). */
  readonly interact: number;
  /** Vertikalni fov kamere u stepenima (30 → 34 → 30). */
  readonly fov: number;
  /** Yaw tela oko Y (0 → −25°, 3/4 pogled). */
  readonly yawDeg: number;
  /** Amplituda njihanja tela (0..1) — sine ±2° dok je četkica napolju, gasi se na polici. */
  readonly sway: number;
  /** Zatvarač napolju: 0 (zavrnut) → 1 (izvučen) → 0. */
  readonly capOut: number;
  /** Ugao zavrtanja zatvarača oko sopstvene ose, u stepenima (0 → 720 → 360). */
  readonly capSpinDeg: number;
  /** Zatvarač otišao ulevo ka copy koloni (0..1). */
  readonly capAway: number;
  /** Nagib izvađenog zatvarača oko svetske z ose, u stepenima (0 → −25). */
  readonly capTiltDeg: number;
  /** Kap raste na vrhu dlačica: skala 0 → 1 (0.24–0.32). */
  readonly drop: number;
  /** Pad kapi: 0 (na dlačicama) → 1 (ispod donje ivice kadra), 0.32–0.42, ubrzava (t²). */
  readonly fall: number;
  /** Kap postoji (raste ili pada). */
  readonly dropVisible: boolean;
  /** Uniform `uPour` u shaderu (0 → 1): radijalni front iz tačke izlaska kapi. */
  readonly pour: number;
  /** `envMapIntensity` bočice: 0.6 → 0.9 dok front prolazi → 0.6. */
  readonly sparkle: number;
  /** Sletanje na policu: 0 (slobodna) → 1 (baza na ivici .hero-overlap), 0.62–0.70. */
  readonly shelf: number;
  /** Množilac skale bočice na polici (1 → 0.55). */
  readonly shelfScale: number;
  /** Pomeraj ka 70 % širine kadra (0 → 1). */
  readonly shelfX: number;
  /** Kontakt senka na polici (0 → 1). */
  readonly shadowOpacity: number;
  /** `clip-path: inset(0 X% 0 0)` frosta: 100 (ništa) → 0 (cela traka). */
  readonly frostClip: number;
  /** CTA hvataju klik samo pre 0.55. */
  readonly copyInteractive: boolean;
  /** Od 0.85 copy je `display: none`. */
  readonly copyHidden: boolean;
  /** Reduced motion: kontejner copy-ja bledi 0.55–0.85 (nema reči, nema reflow-a). */
  readonly copyFade: number;
};

export function heroChoreography(progress: number): HeroChoreography {
  const p = clamp01(progress);
  const open = power2InOut(ramp(ACTS.capOpen[0], ACTS.capOpen[1], p));
  const close = power2InOut(ramp(ACTS.capClose[0], ACTS.capClose[1], p));
  const capOut = open * (1 - close);
  const away =
    power3Out(ramp(ACTS.capAway[0], ACTS.capAway[1], p)) * (1 - power2InOut(ramp(ACTS.capReturn[0], ACTS.capReturn[1], p)));
  const fallT = ramp(ACTS.dropFall[0], ACTS.dropFall[1], p);
  const grow = smoothstep(ACTS.dropGrow[0], ACTS.dropGrow[1], p);
  const fall = fallT * fallT;
  const shelf = power2InOut(ramp(ACTS.shelfLand[0], ACTS.shelfLand[1], p));
  const shelfT = power2InOut(ramp(ACTS.shelfScale[0], ACTS.shelfScale[1], p));
  const fovOut = power2InOut(ramp(ACTS.fovOut[0], ACTS.fovOut[1], p));
  const fovBack = power2InOut(ramp(ACTS.fovBack[0], ACTS.fovBack[1], p));
  return {
    idle: 1 - smoothstep(ACTS.idle[0], ACTS.idle[1], p),
    interact: 1 - smoothstep(ACTS.interact[0], ACTS.interact[1], p),
    fov: FOV_REST + (FOV_OPEN - FOV_REST) * (fovOut - fovBack),
    yawDeg: YAW_DEG * power2InOut(ramp(ACTS.yaw[0], ACTS.yaw[1], p)) || 0,
    // Njihanje samo dok je četkica napolju i NAD vratom: dok je odmaknuta (kap raste, otkačuje se)
    // telo miruje, inače bi vrh dlačica bežao od determinističkog ishodišta razlivanja.
    sway: capOut * (1 - away) * (1 - shelf),
    capOut,
    capSpinDeg: CAP_SPIN_OPEN_DEG * open - CAP_SPIN_CLOSE_DEG * close,
    capAway: away,
    capTiltDeg: CAP_TILT_DEG * away || 0,
    drop: grow,
    fall,
    dropVisible: grow > 0 && fall < 1,
    pour: smoothstep(ACTS.pour[0], ACTS.pour[1], p),
    sparkle:
      SPARKLE_MIN +
      (SPARKLE_MAX - SPARKLE_MIN) *
        (smoothstep(ACTS.sparkleUp[0], ACTS.sparkleUp[1], p) - smoothstep(ACTS.sparkleDown[0], ACTS.sparkleDown[1], p)),
    shelf,
    shelfScale: 1 - (1 - SHELF_SCALE) * shelfT,
    shelfX: shelfT,
    shadowOpacity: smoothstep(ACTS.shadow[0], ACTS.shadow[1], p),
    frostClip: 100 * (1 - power2Out(ramp(ACTS.frost[0], ACTS.frost[1], p))),
    copyInteractive: p < ACTS.copyExit[0],
    copyHidden: p >= COPY_HIDDEN_P,
    copyFade: 1 - smoothstep(ACTS.copyExit[0], COPY_HIDDEN_P, p),
  };
}

/** Zamena bez puta: 0 pre praga, 1 od praga (mark ispod 400 px, reduced motion). */
export function logoSwap(p: number, at: number): 0 | 1 {
  return p >= at ? 1 : 0;
}

/* ------------------------------------------------------------------ */
/*  Copy: reflow nagore, izlaz reč po reč                               */
/* ------------------------------------------------------------------ */

/**
 * Napredak preslaganja elementa `index` (0 = h1, 1 = lead, 2 = CTA, 3 = strip) u prostor wordmarka:
 * 0 → 1 (power3.inOut). Sa putem slova kreće na 0.12 (posle 0.06 bi h1 udario u slova koja tek
 * kreću — expo.inOut prvih 40 % skoro miruje); bez puta (mark ispod 400 px) tek posle zamene na 0.30.
 */
export function copyReflowAt(p: number, index: number, swapBranch = false): number {
  const start = (swapBranch ? REFLOW.swapStart : REFLOW.start) + REFLOW.stagger * index;
  return power3InOut(ramp(start, start + REFLOW.duration, p));
}

export type ExitState = { readonly opacity: number; readonly y: number };

/**
 * Izlaz jedne reči: reči odlaze od POSLEDNJE ka prvoj (obrnuto od ulaza), svaka traje `EXIT.word`,
 * pada 18 px i bledi (power2.in). `window` je prozor celog elementa.
 */
export function wordExitAt(p: number, index: number, count: number, window: readonly [number, number]): ExitState {
  const span = Math.max(0, window[1] - window[0] - EXIT.word);
  const order = count > 1 ? (count - 1 - index) / (count - 1) : 0;
  const start = window[0] + order * span;
  const t = power2In(ramp(start, start + EXIT.word, p));
  return { opacity: 1 - t, y: WORD_EXIT_Y * t };
}

/** Izlaz bloka (CTA red, strip): isti pokret kao reč, preko celog prozora. */
export function blockExitAt(p: number, window: readonly [number, number]): ExitState {
  const t = power2In(ramp(window[0], window[1], p));
  return { opacity: 1 - t, y: WORD_EXIT_Y * t };
}

/* ------------------------------------------------------------------ */
/*  Sticky zona: hold, zaostajanje stage-a, ivica police                */
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
 * počiva i put slova (lib/logoTravel.ts).
 */
export function stageTop(p: number, holdEnd: number, sectionHeight: number, stageHeight: number): number {
  const q = clamp01(p);
  return -Math.max(0, q - holdEnd) * sectionHeight + stageLag(q, holdEnd, stageHeight);
}

/**
 * Gornja ivica `.hero-overlap` (sledeće sekcije) U KOORDINATAMA STAGE-A, px od vrha stage-a.
 * Na ekranu je ivica na H·(1 − p); stage je na `stageTop(p)`; razlika je vh − lag(p): tokom holda
 * ivica stoji na dnu stage-a, posle se penje tačno onoliko koliko stage zaostaje.
 */
export function shelfEdgeInStage(p: number, holdEnd: number, stageHeight: number): number {
  return stageHeight - stageLag(p, holdEnd, stageHeight);
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
