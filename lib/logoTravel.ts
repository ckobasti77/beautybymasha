/**
 * Put slova BEAUTY iz heroja u logo slot navigacije (spec 14 → A1), kao čista matematika nad dva
 * pravougaonika PO SLOVU. BEZ GSAP Flip-a i BEZ pina: svaki glif `<path>` u sticky stage-u dobija
 * sopstveni `transform` (translate + scale o svom gornjem levom uglu), a nav glif se pali u istom
 * frejmu kad hero glif sleti — nav wordmark se SASTAVLJA s leva na desno.
 *
 * Korak 13 je vozio ceo wordmark kao jedan pravougaonik; od koraka 14 slovo i ima svoj prozor
 * (0.06 + 0.015·i → 0.24 + 0.015·i, expo.inOut), blago zakrivljenu putanju (kvadratni bezier,
 * kontrolna tačka podignuta za 12 % dužine puta) i sletanje sa overshoot-om skale 1.04 → 1 u
 * poslednjih 15 % trajanja.
 *
 * Mere su u viewport pikselima. `hero` je glif u miru sa `top` RELATIVNO NA STAGE (tako izmeren
 * ne zavisi od toga koliko je stage već odgurnut); `nav` je isti glif u traci navigacije u miru
 * (traka na vrhu kadra). `stageTop` je gornja ivica stage-a na ekranu (lib/heroChoreography.ts).
 */

import { clamp01, expoInOut, ramp } from "./heroChoreography";

export type Rect = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export const LETTER_COUNT = 6;
export const LETTER_START = 0.06;
export const LETTER_STAGGER = 0.015;
export const LETTER_DURATION = 0.18;
/** Kontrolna tačka bezier-a podignuta za ovoliki deo dužine puta. */
export const LETTER_ARC = 0.12;
/** Overshoot skale pri sletanju (1.04 → 1) u poslednjih 15 % trajanja. */
export const LETTER_OVERSHOOT = 0.04;
export const LETTER_LANDING = 0.15;

/** Prozor napretka `p` u kome slovo `i` putuje. */
export function letterWindow(i: number): readonly [number, number] {
  const start = LETTER_START + LETTER_STAGGER * i;
  return [start, start + LETTER_DURATION];
}

/** Kraj puta poslednjeg slova — od tada je nav wordmark ceo. */
export const LETTERS_END = letterWindow(LETTER_COUNT - 1)[1];

export type LetterTransform = {
  /** translateX u px (ekran). */
  readonly x: number;
  /** translateY u px (ekran). */
  readonly y: number;
  /** Skala o gornjem levom uglu glifa. */
  readonly scale: number;
  /** Sirov napredak u prozoru slova (0..1). */
  readonly t: number;
  /** Slovo je sletelo — hero glif se gasi, nav glif se pali. */
  readonly landed: boolean;
};

/**
 * Transform hero glifa `i` pri napretku `p`. Za `t = 1` glif stoji tačno na nav glifu bez obzira
 * na to gde je stage — zato posle holda ostaje „zalepljen" dok ga zamena ne sakrije.
 */
export function letterTravelAt(p: number, i: number, hero: Rect, nav: Rect, stageTop: number): LetterTransform {
  const [start, end] = letterWindow(i);
  const t = ramp(start, end, p);
  const k = expoInOut(t);
  const dx = nav.left - hero.left;
  const dy = nav.top - (stageTop + hero.top);
  const length = Math.hypot(dx, dy);
  // Kvadratni bezier P0 = 0, C = sredina − ARC·dužina po y (nagore), P1 = (dx, dy).
  const u = 1 - k;
  const cx = dx / 2;
  const cy = dy / 2 - LETTER_ARC * length;
  const x = 2 * u * k * cx + k * k * dx;
  const y = 2 * u * k * cy + k * k * dy;
  const ratio = hero.width > 0 ? nav.width / hero.width : 1;
  const landing = clamp01((t - (1 - LETTER_LANDING)) / LETTER_LANDING);
  const pop = 1 + LETTER_OVERSHOOT * Math.sin(Math.PI * landing);
  return {
    x: x || 0,
    y: y || 0,
    scale: (1 + k * (ratio - 1)) * pop,
    t,
    landed: t >= 1,
  };
}
