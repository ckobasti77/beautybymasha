/**
 * Boje laka u heroju (.nightrun/specs/13-hero-zona.md → D, E): ciklus pet bestselera, hvatanje
 * boje na prvi skrol, boja razlivanja i izbor inka po kontrastu.
 *
 * BEZ React, BEZ three i BEZ `data/products.json` — motor u `components/hero/Hero.tsx` ovo vozi
 * kroz gsap.ticker za sve tri grane (3D bočica, shader bez bočice, CSS kap), a three strana samo
 * čita hex par i lerp-uje `THREE.Color` sa svoje strane. Hex vrednosti dolaze sa SERVERA
 * (`app/page.tsx` → `lib/products.ts`), da katalog ne uđe u klijentski JS.
 */
import { palette } from "./palette";

/** Pet bestselera, naizmenično ORLY / Entity, različite porodice (spec D). `[POTVRDITI]` — naš predlog. */
export const HERO_COLOR_SLUGS = [
  "vintage",
  "kaleidoscope-eyes",
  "entity-red-rum-rouge",
  "entity-modern-minimalist",
  "crawfords-wine",
] as const;

/** Koliko jedna boja stoji pre prelaza, u sekundama. */
export const COLOR_HOLD = 3.5;
/** Trajanje crossfade-a između dve boje, u sekundama. */
export const COLOR_FADE = 1.0;
export const COLOR_PERIOD = COLOR_HOLD + COLOR_FADE;
/** Uhvaćena boja preživi reload — ciklus inače kreće od prve boje na svako učitavanje. */
export const HERO_COLOR_STORAGE_KEY = "bbm-hero-color";
/** Razlivena boja zadržava 25 % minta da brend ne nestane (spec E). */
export const POUR_MINT_SHARE = 0.25;

export type ColorBlend = {
  readonly from: string;
  readonly to: string;
  /** 0 = `from`, 1 = `to`; već sa sine ease-om. */
  readonly t: number;
};

/** Sine in-out, kao GSAP `sine.inOut`. */
export function easeSine(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

function channels(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Linearna mešavina po kanalu u sRGB-u — za CSS kap i za odluku o inku (shader meša u linearnom, blizu je). */
export function mixHex(a: string, b: string, t: number): string {
  const x = Math.min(1, Math.max(0, t));
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return toHex(ar + (br - ar) * x, ag + (bg - ag) * x, ab + (bb - ab) * x);
}

/** WCAG relativna luminanca `#RRGGBB`. */
export function relativeLuminance(hex: string): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = channels(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG odnos kontrasta dve luminance (≥ 4.5 je AA za običan tekst). */
export function contrastRatio(l1: number, l2: number): number {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Boja koju shader / CSS kap zaista razliju: uhvaćena boja sa 25 % minta. */
export function effectivePourHex(captured: string): string {
  return mixHex(captured, palette.mint, POUR_MINT_SHARE);
}

export type Ink = "dark" | "light";

const INK_LUMINANCE = relativeLuminance(palette.ink);
const PAPER_LUMINANCE = relativeLuminance(palette.paper);

/**
 * Koji tekst ide preko razlivene boje: `--ink` ili `--paper`, šta god ima VEĆI kontrast. Prag po
 * luminanci (spec: 0.45) bi za roze `#E88BC0` (L = 0.39) dao beo tekst sa 2,4:1 — zato kontrast,
 * ne luminanca. Hero je svetao i u tamnoj temi, pa su tokeni literalni, ne `--fg`/`--bg`.
 */
export function inkFor(effectiveHex: string): Ink {
  const l = relativeLuminance(effectiveHex);
  return contrastRatio(l, INK_LUMINANCE) >= contrastRatio(l, PAPER_LUMINANCE) ? "dark" : "light";
}

/** Kontrast izabranog inka nad bojom — za test i za proveru J.7. */
export function inkContrast(effectiveHex: string): number {
  const l = relativeLuminance(effectiveHex);
  return contrastRatio(l, inkFor(effectiveHex) === "dark" ? INK_LUMINANCE : PAPER_LUMINANCE);
}

/**
 * Ciklus boja: hold 3.5 s → crossfade 1 s → sledeća, u krug. `capture()` zamrzne ciklus na
 * TRENUTNOJ boji (i usred prelaza — uhvaćena je tačno ono što se vidi), `release()` ga pušta
 * dalje od tog istog mesta. Vreme dolazi spolja (`step(dt)`), pa ga pozivalac zaustavlja kad je
 * tab sakriven ili je uključen prefers-reduced-motion.
 */
export class HeroColorCycle {
  private index = 0;
  private elapsed = 0;
  private frozen: string | null = null;

  constructor(readonly colors: readonly string[]) {
    if (colors.length === 0) throw new Error("HeroColorCycle: bar jedna boja");
  }

  /** Počni od zadate boje (zapamćena iz sessionStorage); nepoznata boja se ignoriše. */
  startFrom(hex: string): void {
    const i = this.colors.findIndex((c) => c.toUpperCase() === hex.toUpperCase());
    if (i === -1) return;
    this.index = i;
    this.elapsed = 0;
  }

  step(dt: number): void {
    if (this.frozen !== null || !(dt > 0)) return;
    this.elapsed += dt;
    while (this.elapsed >= COLOR_PERIOD) {
      this.elapsed -= COLOR_PERIOD;
      this.index = (this.index + 1) % this.colors.length;
    }
  }

  get blend(): ColorBlend {
    const n = this.colors.length;
    const from = this.colors[this.index];
    const to = this.colors[(this.index + 1) % n];
    const t = this.elapsed <= COLOR_HOLD ? 0 : easeSine((this.elapsed - COLOR_HOLD) / COLOR_FADE);
    return { from, to, t };
  }

  /** Boja koja se trenutno vidi. */
  get hex(): string {
    const { from, to, t } = this.blend;
    return t === 0 ? from : mixHex(from, to, t);
  }

  get captured(): string | null {
    return this.frozen;
  }

  /** Zamrzni na trenutnoj boji i vrati je. Ponovni poziv vraća istu boju. */
  capture(): string {
    if (this.frozen === null) this.frozen = this.hex;
    return this.frozen;
  }

  release(): void {
    this.frozen = null;
  }
}
