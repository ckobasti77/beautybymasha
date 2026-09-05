/**
 * Putovanje wordmark-a iz heroja u logo slot navigacije (spec 12 → H), kao čista
 * matematika nad dva pravougaonika. BEZ GSAP Flip-a i BEZ pina: hero je obična sekcija,
 * wordmark ostaje `position: relative` i dobija samo `transform`.
 *
 * Problem koji ovo rešava: nav je `position: fixed`, a wordmark skroluje sa stranom —
 * dok tween traje, strana ga je već odnela `p · heroHeight` px naviše. Zato se pomeraj
 * deli na DVA tweena na istom elementu:
 *  - `y` (i `x`, `scale`): put na EKRANU od rest položaja do slota, sa bilo kojim ease-om
 *    (expo.out — brzo napusti copy koji ide za njim, pa se lagano smesti u slot);
 *  - `yPercent`: LINEARNA kompenzacija skrola, `compensation` px do kraja putovanja,
 *    izražena u % sopstvene (layout) visine elementa jer GSAP tako sabira translate.
 * Za svako `p ≤ endProgress` linearni deo tačno skrati pomeraj strane, pa je položaj na
 * ekranu samo `rest + ease(t) · (slot − rest)` — vidi `wordmarkTopAt`.
 *
 * Sve mere su u viewport pikselima; `from` je wordmark u MIRU (bez transforma) pri
 * napretku 0, `to` je logo u navigaciji (fiksan, pa mu se rect ne menja sa skrolom).
 * Transform-origin je gornji levi ugao (`0 0`).
 */

export type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
};

export type LogoTravel = {
  /** translateX u px — put na ekranu. */
  readonly x: number;
  /** translateY u px — put na ekranu (bez kompenzacije skrola). */
  readonly y: number;
  /** Ujednačena skala (isti SVG viewBox na obe strane). */
  readonly scale: number;
  /** Koliko px strana odnese element naviše do `endProgress` — vraća ga linearni tween. */
  readonly compensation: number;
};

export function logoTravel({
  from,
  to,
  heroHeight,
  endProgress,
}: {
  from: Box;
  to: Box;
  /** Rastojanje skrola od `start` do `end` hero trigera (= visina heroja za top top → bottom top). */
  heroHeight: number;
  /** Napredak na kome wordmark stiže u slot (spec: 0.70). */
  endProgress: number;
}): LogoTravel {
  return {
    x: to.left - from.left,
    y: to.top - from.top,
    scale: from.width > 0 ? to.width / from.width : 1,
    compensation: endProgress * heroHeight,
  };
}

/** Kompenzacija u % layout visine elementa — jedinica koju GSAP `yPercent` očekuje. */
export function compensationPercent(travel: LogoTravel, elementHeight: number): number {
  return elementHeight > 0 ? (travel.compensation / elementHeight) * 100 : 0;
}

export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;

/** expo.out kao u GSAP-u: 1 − 2^(−10t), sa tačnom jedinicom na kraju. */
export const expoOut: Ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Gde je wordmark na ekranu pri napretku `p`: rest položaj ide naviše sa stranom, linearni
 * tween ga vraća do `endProgress`, ease-ovani tween ga vodi ka slotu. Koristi ga test, i
 * može provera u browseru.
 */
export function wordmarkTopAt(
  from: Box,
  travel: LogoTravel,
  heroHeight: number,
  endProgress: number,
  p: number,
  ease: Ease = linear,
): number {
  const t = endProgress > 0 ? Math.min(1, Math.max(0, p / endProgress)) : 1;
  return from.top - p * heroHeight + t * travel.compensation + ease(t) * travel.y;
}

/**
 * Pretvara izmereni rect u „rect u miru pri napretku 0": ako se meri dok je strana
 * skrolovana za `scrollFromStart` px od početka trigera, element je toliko više nego što
 * bi bio na startu.
 */
export function restBox(measured: Box, scrollFromStart: number): Box {
  return { left: measured.left, top: measured.top + scrollFromStart, width: measured.width };
}
