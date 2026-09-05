/**
 * Putovanje wordmark-a iz heroja u logo slot navigacije (spec 13 → C), kao čista matematika
 * nad dva pravougaonika. BEZ GSAP Flip-a i BEZ pina: wordmark ostaje `position: relative` u
 * sticky stage-u i dobija samo `transform` (translate + scale, origin gore levo).
 *
 * Korak 12 je imao dva tweena (put + `yPercent` kompenzacija skrola) jer je wordmark putovao sa
 * stranom. Od koraka 13 wordmark sedi u STICKY stage-u: tokom holda ne pomera se sa stranom
 * uopšte, a posle holda je pomeraj stage-a čista funkcija napretka (`stageTop` iz
 * lib/heroChoreography.ts). Zato je put samo: gde je wordmark na ekranu bez transforma
 * (`stageTop + rest.top`) → gde je slot (fiksan) — pomnoženo ease-ovanim napretkom `e`.
 *
 * Mere su u viewport pikselima. `rest` je wordmark u miru, sa `top` RELATIVNO NA STAGE (tako
 * izmeren ne zavisi od toga koliko je stage već odgurnut); `slot` je logo u navigaciji u miru
 * (traka na vrhu kadra — ako je traka baš sakrivena, meri se relativno na nju).
 */

export type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
};

export type LogoTransform = {
  /** translateX u px. */
  readonly x: number;
  /** translateY u px. */
  readonly y: number;
  /** Ujednačena skala (isti SVG viewBox na obe strane). */
  readonly scale: number;
};

/**
 * Transform wordmark-a pri ease-ovanom napretku `e` (0 = u miru, 1 = tačno na slotu), kad je
 * gornja ivica stage-a na `stageTop` px ekrana. Za `e = 1` wordmark stoji na slotu bez obzira
 * na to gde je stage — zato posle holda ostaje „zalepljen" dok ga crossfade ne sakrije.
 */
export function wordmarkTransformAt(e: number, rest: Box, slot: Box, stageTop: number): LogoTransform {
  const t = Math.min(1, Math.max(0, e));
  const baseTop = stageTop + rest.top;
  return {
    x: t * (slot.left - rest.left) || 0,
    y: t * (slot.top - baseTop) || 0,
    scale: 1 + t * ((rest.width > 0 ? slot.width / rest.width : 1) - 1),
  };
}

/** Gornja ivica wordmark-a na ekranu posle transforma — za test i proveru u browseru. */
export function wordmarkScreenTop(e: number, rest: Box, slot: Box, stageTop: number): number {
  return stageTop + rest.top + wordmarkTransformAt(e, rest, slot, stageTop).y;
}
