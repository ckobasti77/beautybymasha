/**
 * Jedini izvor selektora i tajminga za site-wide "reč po reč" otkrivanje teksta.
 * Vidi .claude/skills/text-reveal/SKILL.md i docs/MOTION.md — pravila su obavezujuća.
 * Portovano iz _ref/colorcutchris; parametri iz data/design-dna.json → visual_effects.text_effects.
 *
 * Isti selektori se koriste na dva mesta:
 *  1. `hideCss()` — inline <style> u app/layout.tsx; sakriva copy pre prvog paint-a
 *  2. TextRevealGlobal — IntersectionObserver koji ga vraća
 * Zato moraju da ostanu u jednom fajlu: sve što je sakriveno mora imati ko da ga otkrije.
 */

/** Blok elementi koji sami po sebi nose copy. */
export const COPY_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "li",
  "dt",
  "dd",
  "blockquote",
  "figcaption",
] as const;

/** Span je kandidat samo ako nije unutar copy elementa, linka, dugmeta ili labele. */
const SPAN_CONTEXT = [...COPY_TAGS, "a", "button", "label", "span"].join(",");

const CANDIDATES: readonly string[] = [
  ...COPY_TAGS,
  `span:not(:is(${SPAN_CONTEXT}) *)`,
  '[data-reveal="text"]',
];

/** Chrome — mora da bude čitljivo istog trenutka kad se pojavi. */
const SKIP: readonly string[] = [
  "nav",
  "header",
  "form",
  "button",
  "a",
  "label",
  "[aria-live]",
  '[role="dialog"]',
  '[data-reveal="off"]',
];

/**
 * Kandidat koji sadrži drugi blok-kandidat je omotač, ne tekst — njega preskačemo
 * (inače bi <li> sa <h3> unutra dobio i svoj blok fade i reč-po-reč decu).
 */
const NESTED = [...COPY_TAGS, '[data-reveal="text"]'].join(",");

export const TEXT_REVEAL = {
  candidateSelector: CANDIDATES.join(","),
  skipSelector: SKIP.join(","),
  nestedSelector: NESTED,
  /** Koliko duboko u viewport element mora da uđe pre nego što krene (0.15 = 15%). */
  enterRatio: 0.15,
  /** Preko ovoliko reči element bledi kao blok, ne po reč. */
  maxWords: 60,
  /** Trajanje jedne reči (s). */
  duration: 0.6,
  /** Ukupan prozor u kome se reči raspoređuju (s) — DNA: „ukupno trajanje 600ms po elementu". */
  staggerWindow: 0.5,
  /** Početni blur (px) — DNA: blur 6px → 0. */
  blur: 6,
  /** Početno podizanje, u em-ovima sopstvenog fonta — DNA: translateY 0.5em → 0. */
  lift: 0.5,
  ease: "expo.out",
} as const;

export const REVEAL_WORD_CLASS = "reveal-word";

/**
 * CSS koji app/layout.tsx inline-uje u <head>. Vezan je za `html.js` klasu koju
 * postavlja isti inline script (THEME_INIT_SCRIPT) — bez JS-a ništa nije sakriveno.
 */
export function hideCss(): string {
  const skip = TEXT_REVEAL.skipSelector;
  const rules = CANDIDATES.map(
    (sel) =>
      `html.js ${sel}:not(:is(${skip})):not(:is(${skip}) *):not(:has(${NESTED}))`,
  ).join(",");

  return (
    `${rules}{opacity:0}` +
    `.${REVEAL_WORD_CLASS}{display:inline-block;white-space:pre-wrap}`
  );
}
