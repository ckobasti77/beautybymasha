/**
 * Potpis „by Masha" koji se PREPISUJE (spec 14 → A2), kao čista matematika nad dužinama glifova.
 *
 * Hero rukopis se BRIŠE 0.10–0.20: glifovi obrnutim redom (poslednji prvi), `stroke-dashoffset`
 * 0 → dužina (vidljivi deo se povlači od kraja ka početku), popuna nestaje u prvih 30 % prozora
 * glifa. Nav rukopis se PIŠE 0.24–0.36 redom kao intro (`LogoSignature.tsx`): dužina → 0, popuna
 * u poslednjih 30 %. Tačka tinte (6 px, boja potpisa) se rodi na repu poslednjeg glifa, jaše na
 * frontu brisanja, 0.20–0.24 leti (kvadratni bezier) do glave nav „b", pa jaše na frontu pisanja i
 * nestaje na 0.36. Jedna olovka: brisanje se ZAVRŠI pre nego što pisanje počne (spec je imao
 * brisanje do 0.26 i pisanje od 0.24 — dva pisca odjednom; ovako tačka koja „pokupi" tintu
 * objašnjava zašto potpis nestaje).
 *
 * Prozor glifa je proporcionalan njegovoj dužini — isti mehanizam kao intro, vozen p-om, ne vremenom.
 */

import { clamp01, power2InOut, ramp } from "./heroChoreography";

export const SIG_ERASE: readonly [number, number] = [0.1, 0.2];
export const SIG_FLY: readonly [number, number] = [0.2, 0.24];
export const SIG_WRITE: readonly [number, number] = [0.24, 0.36];
/** Deo prozora glifa u kome popuna nestaje (brisanje) odnosno nastaje (pisanje). */
export const SIG_FILL_SHARE = 0.3;
/** Tačka se rodi (skala 0 → 1) na početku brisanja i ugasi pred kraj pisanja. */
export const DOT_BIRTH = 0.015;
export const DOT_FADE = 0.01;
/** Kontrolna tačka leta, deo dužine puta, upravno na tetivu. */
export const DOT_FLY_ARC = 0.18;

export type GlyphState = {
  /** `stroke-dashoffset` u jedinicama putanje (0 = cela kontura vidljiva, L = ništa). */
  readonly dashoffset: number;
  readonly fill: number;
  readonly stroke: number;
};

/** Prozor svakog glifa unutar `[start, end]`, proporcionalno dužini; `reverse` ide od poslednjeg. */
export function glyphWindows(
  lengths: readonly number[],
  window: readonly [number, number],
  reverse: boolean,
): readonly (readonly [number, number])[] {
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const span = window[1] - window[0];
  const order = lengths.map((_, i) => i);
  if (reverse) order.reverse();
  const out: [number, number][] = lengths.map(() => [0, 0]);
  let at = window[0];
  for (const i of order) {
    const d = (lengths[i] / total) * span;
    out[i] = [at, at + d];
    at += d;
  }
  return out;
}

/** Stanje glifova u prozoru: brisanje (`erase`, unazad, offset raste) ili pisanje (unapred, offset pada). */
function glyphStates(p: number, lengths: readonly number[], window: readonly [number, number], erase: boolean): readonly GlyphState[] {
  const windows = glyphWindows(lengths, window, erase);
  return lengths.map((length, i) => {
    const w = ramp(windows[i][0], windows[i][1], p);
    return {
      dashoffset: length * (erase ? w : 1 - w),
      fill: erase ? 1 - ramp(0, SIG_FILL_SHARE, w) : ramp(1 - SIG_FILL_SHARE, 1, w),
      stroke: w > 0 && w < 1 ? 1 : 0,
    };
  });
}

/** Stanje hero glifova pri `p` (brisanje). Pre 0.10 sve je nacrtano, posle 0.20 ničega nema. */
export function eraseAt(p: number, lengths: readonly number[]): readonly GlyphState[] {
  return glyphStates(p, lengths, SIG_ERASE, true);
}

/** Stanje nav glifova pri `p` (pisanje). Pre 0.24 ničega nema, posle 0.36 sve je nacrtano. */
export function writeAt(p: number, lengths: readonly number[]): readonly GlyphState[] {
  return glyphStates(p, lengths, SIG_WRITE, false);
}

export type Front = {
  /** Indeks glifa na kome je front. */
  readonly glyph: number;
  /** Dužina duž putanje tog glifa (za `getPointAtLength`). */
  readonly length: number;
};

/** Front brisanja: kraj vidljivog dela. Pre početka — rep poslednjeg glifa; posle — glava prvog. */
export function eraseFrontAt(p: number, lengths: readonly number[]): Front {
  const n = lengths.length;
  if (n === 0) return { glyph: 0, length: 0 };
  const windows = glyphWindows(lengths, SIG_ERASE, true);
  for (let i = n - 1; i >= 0; i -= 1) {
    const w = ramp(windows[i][0], windows[i][1], p);
    if (w < 1) return { glyph: i, length: lengths[i] * (1 - w) };
  }
  return { glyph: 0, length: 0 };
}

/** Front pisanja: kraj nacrtanog dela. Pre početka — glava prvog glifa; posle — rep poslednjeg. */
export function writeFrontAt(p: number, lengths: readonly number[]): Front {
  const n = lengths.length;
  if (n === 0) return { glyph: 0, length: 0 };
  const windows = glyphWindows(lengths, SIG_WRITE, false);
  for (let i = 0; i < n; i += 1) {
    const w = ramp(windows[i][0], windows[i][1], p);
    if (w < 1) return { glyph: i, length: lengths[i] * w };
  }
  return { glyph: n - 1, length: lengths[n - 1] };
}

export type DotPhase = "none" | "erase" | "fly" | "write";

export type DotState = {
  readonly phase: DotPhase;
  /** Napredak leta (0..1, power2.inOut) — samo u fazi `fly`. */
  readonly t: number;
  /** Skala tačke (rođenje 0 → 1). */
  readonly scale: number;
  /** Providnost (gašenje pred 0.36). */
  readonly opacity: number;
};

export function dotAt(p: number): DotState {
  if (p < SIG_ERASE[0] || p >= SIG_WRITE[1]) return { phase: "none", t: 0, scale: 0, opacity: 0 };
  const scale = ramp(SIG_ERASE[0], SIG_ERASE[0] + DOT_BIRTH, p);
  const opacity = 1 - ramp(SIG_WRITE[1] - DOT_FADE, SIG_WRITE[1], p);
  if (p < SIG_FLY[0]) return { phase: "erase", t: 0, scale, opacity };
  if (p < SIG_FLY[1]) return { phase: "fly", t: power2InOut(ramp(SIG_FLY[0], SIG_FLY[1], p)), scale, opacity };
  return { phase: "write", t: 1, scale, opacity };
}

export type Point = { readonly x: number; readonly y: number };

/** Let tačke od repa hero potpisa do glave nav potpisa: kvadratni bezier, ispupčen upravno na tetivu. */
export function flyPoint(t: number, from: Point, to: Point): Point {
  const k = clamp01(t);
  const u = 1 - k;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const cx = from.x + dx / 2 + (-dy / length) * DOT_FLY_ARC * length;
  const cy = from.y + dy / 2 + (dx / length) * DOT_FLY_ARC * length;
  return {
    x: u * u * from.x + 2 * u * k * cx + k * k * to.x,
    y: u * u * from.y + 2 * u * k * cy + k * k * to.y,
  };
}

/** Koliko je potpisa izbrisano / napisano (0..1) — za dev API i provere. */
export function signatureProgress(states: readonly GlyphState[], lengths: readonly number[]): number {
  const total = lengths.reduce((a, b) => a + b, 0) || 1;
  const drawn = states.reduce((sum, s, i) => sum + (lengths[i] - s.dashoffset), 0);
  return clamp01(drawn / total);
}
