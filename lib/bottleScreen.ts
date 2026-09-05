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
export function bottleScreen(p: number, holdEnd: number, stageWidth: number, stageHeight: number): BottleScreen {
  const c = heroChoreography(p);
  const aspect = stageWidth / Math.max(1, stageHeight);
  const restHeight = visibleHeightAt(FOV_REST, HERO_CAMERA.distance);
  const layout = bottleLayout(restHeight * aspect, restHeight, TOTAL_HEIGHT);
  const visibleHeight = visibleHeightAt(c.fov, HERO_CAMERA.distance);
  const visibleWidth = visibleHeight * aspect;
  const scale = layout.scale * c.shelfScale;

  const xScene = restHeight * aspect * (BOTTLE_X_RATIO + (SHELF_X_RATIO - BOTTLE_X_RATIO) * c.shelfX);
  const bodyDrop = -BODY_DROP_SHARE * CAP_LIFT_OUT * layout.scale * c.capOut;
  const restBaseScene = bodyDrop - (TOTAL_HEIGHT / 2) * layout.scale;
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
