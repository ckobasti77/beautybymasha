/**
 * Gde je bočica u kadru — raspored (spec 12), polica (spec 14 B5) i projekcija, kao čista
 * matematika nad `p` i merama kadra. ZASEBAN modul od `lib/heroChoreography.ts`: ovo čitaju samo
 * three strana (`components/three/HeroBottle.tsx`) i testovi, pa mere bočice (`lib/bottleDims.ts`)
 * ne ulaze u početni JS landinga (Hero.tsx uvozi samo `heroChoreography`).
 *
 * BEZ React i BEZ three importa.
 */

import { BODY_HALF, CAP_LIFT_OUT, HERO_CAMERA, TOTAL_HEIGHT } from "./bottleDims";
import { BODY_DROP_SHARE, FOV_REST, heroChoreography, shelfEdgeInStage } from "./heroChoreography";

/** Deo visine kadra koji bočica zauzima na desktopu (~62 %). */
export const BOTTLE_HEIGHT_RATIO = 0.62;
/** Bočica stoji u centru desne polovine kadra (25 % vidljive širine desno od centra). */
export const BOTTLE_X_RATIO = 0.25;
/** Na polici: 70 % širine kadra = 20 % desno od centra. */
export const SHELF_X_RATIO = 0.2;

/**
 * MOBILNI RASPORED (korak 18 A, povlačenje ADR-005). Na telefonu nema desne polovine kadra —
 * copy je preko cele širine. Bočica je zato manja (~44 % visine), CENTRIRANA po x i spuštena u
 * donju trećinu, ISPOD copy kolone: naslov i dugmad ostaju čitljivi, a bočica se i dalje otvara,
 * pušta kap i sleće na policu istom koreografijom. Polica je i tu 70 % širine (ivica preklopa je
 * ista), pa `shelfX` sada vozi od `x0` do `SHELF_X_RATIO` u oba rasporeda.
 */
export const BOTTLE_HEIGHT_RATIO_SMALL = 0.25;
export const BOTTLE_X_RATIO_SMALL = 0;
/**
 * Koliko se baza bočice spušta ispod centra kadra, kao deo vidljive visine. Na desktopu 0
 * (bočica je vertikalno centrirana), na telefonu 0.365 — baza sedi na 99 % visine kadra, dakle
 * već na ivici `.hero-overlap`: na telefonu bočica od početka stoji na polici, pa sletanje
 * (0.62–0.70) menja samo skalu i x.
 *
 * Zašto 25 %, a ne 44 % iz specifikacije: hero copy na 390×844 ide do y = 605 (i to posle
 * zbijanja iz koraka 18: pt 112→80, gap 40→20, wordmark 78vw→58vw, razmak 24→16 px), pa je
 * slobodan pojas ispod njega 239 px = 28 % kadra — a bočici treba i vazduh iznad zatvarača.
 * Sa 44 % bi zatvarač presekao dugmad; uslov „copy ostaje čitljiv" je jači od broja. Mereno,
 * ne procenjeno — brojevi su u docs/STATUS.md.
 */
export const BOTTLE_DROP_SMALL = 0.365;

/** Raspored bočice u kadru: desktop (desna polovina, 62 %) ili telefon (centar, 44 %, niže). */
export type BottleVariant = "wide" | "small";

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
export function bottleLayout(
  visibleWidth: number,
  visibleHeight: number,
  modelHeight: number,
  variant: BottleVariant = "wide",
): BottleLayout {
  const small = variant === "small";
  return {
    x: visibleWidth * (small ? BOTTLE_X_RATIO_SMALL : BOTTLE_X_RATIO),
    scale: (visibleHeight * (small ? BOTTLE_HEIGHT_RATIO_SMALL : BOTTLE_HEIGHT_RATIO)) / modelHeight,
  };
}

/**
 * Vidljiva visina kadra perspektivne kamere na rastojanju `distance` (jedinice scene).
 * `fovDeg` je vertikalni fov kao u three.js `PerspectiveCamera`.
 */
export function visibleHeightAt(fovDeg: number, distance: number): number {
  return 2 * distance * Math.tan((fovDeg * Math.PI) / 360);
}

export type BottleScreen = {
  /** Centar tela po x, px od leve ivice stage-a. */
  readonly x: number;
  /** Širina tela na ekranu, px. */
  readonly width: number;
  /** Baza bočice, px od vrha stage-a. */
  readonly baseY: number;
  /** Ukupna skala grupe (raspored × polica). */
  readonly scale: number;
  /** Skala rasporeda u miru (fov 30), bez police. */
  readonly layoutScale: number;
  readonly fov: number;
  /** Vidljiva visina/širina scene na dubini bočice za TEKUĆI fov. */
  readonly visibleHeight: number;
  readonly visibleWidth: number;
};

/**
 * Gde je bočica na EKRANU (px stage-a) pri napretku `p` — jedina istina za bočicu (three) i za
 * kontakt senku (DOM), pa se ne mogu razići. Raspored i skala u miru računaju se za fov 30 (tako
 * dolly-out zaista smanjuje bočicu u kadru); tekući fov ulazi samo u projekciju. Telo tokom
 * otvaranja pada za polovinu podizanja zatvarača; od 0.62 baza klizi na ivicu police, a skala se
 * smanjuje O BAZI (bočica stoji na ivici i odlazi s njom).
 */
export function bottleScreen(
  p: number,
  holdEnd: number,
  stageWidth: number,
  stageHeight: number,
  variant: BottleVariant = "wide",
): BottleScreen {
  const c = heroChoreography(p);
  const small = variant === "small";
  const aspect = stageWidth / Math.max(1, stageHeight);
  const restHeight = visibleHeightAt(FOV_REST, HERO_CAMERA.distance);
  const layout = bottleLayout(restHeight * aspect, restHeight, TOTAL_HEIGHT, variant);
  const visibleHeight = visibleHeightAt(c.fov, HERO_CAMERA.distance);
  const visibleWidth = visibleHeight * aspect;
  const scale = layout.scale * c.shelfScale;

  const x0 = small ? BOTTLE_X_RATIO_SMALL : BOTTLE_X_RATIO;
  const xScene = restHeight * aspect * (x0 + (SHELF_X_RATIO - x0) * c.shelfX);
  const bodyDrop = -BODY_DROP_SHARE * CAP_LIFT_OUT * layout.scale * c.capOut;
  const restBaseScene =
    bodyDrop - (TOTAL_HEIGHT / 2) * layout.scale - (small ? BOTTLE_DROP_SMALL * restHeight : 0);
  const restBase = (0.5 - restBaseScene / visibleHeight) * stageHeight;
  const edge = shelfEdgeInStage(p, holdEnd, stageHeight);

  return {
    x: (0.5 + xScene / visibleWidth) * stageWidth,
    width: ((2 * BODY_HALF * scale) / visibleWidth) * stageWidth,
    baseY: restBase + (edge - restBase) * c.shelf,
    scale,
    layoutScale: layout.scale,
    fov: c.fov,
    visibleHeight,
    visibleWidth,
  };
}
