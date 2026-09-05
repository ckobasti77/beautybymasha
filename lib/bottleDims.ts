/**
 * Mere bočice laka u jedinicama modela (1 jedinica = 1 cm, dno u y = 0) — JEDAN izvor za
 * Blender skriptu (`scripts/bottle.py` ponavlja iste brojeve), proceduralnu geometriju
 * (`components/three/bottleGeometry.ts`), koreografiju (`lib/heroChoreography.ts`) i testove.
 *
 * BEZ three importa: čita se i u vitest-u i u početnom JS-u landinga.
 *
 * Četkica (korak 14, spec B0): stem visi sa donje strane zatvarača, dlačice su zarubljena
 * spljoštena kupa čiji vrh stoji na 92 % dubine tečnosti dok je bočica zatvorena. Podizanje
 * zatvarača pri otvaranju se RAČUNA iz ovih mera (vrh dlačica mora da izađe iz vrata + 0.3).
 */

export const TOTAL_HEIGHT = 9.48;
export const BODY_HEIGHT = 6.0;
/** Pola stranice zaobljenog kvadrata tela (3,2 × 3,2). */
export const BODY_HALF = 1.6;
export const NECK_TOP = 6.0;
export const CAP_BOTTOM = 5.88;
export const CAP_TOP = TOTAL_HEIGHT;
/** Oko ove tačke se zatvarač naginje kad je izvađen (sredina zatvarača — tu ga drže prsti). */
export const CAP_PIVOT_Y = (CAP_BOTTOM + CAP_TOP) / 2;

/** Nivo tečnosti — 78 % visine tela (spec 13 → F). */
export const LIQUID_LEVEL_RATIO = 0.78;
export const LIQUID_LEVEL_Y = BODY_HEIGHT * LIQUID_LEVEL_RATIO;
/** Unutrašnje dno: debljina zida 0,12 + razmak 0,02. */
export const INNER_BOTTOM_Y = 0.14;

/** Vrh dlačica na 92 % dubine tečnosti (spec B0). */
export const BRUSH_DEPTH_RATIO = 0.92;
export const BRUSH_TIP_Y = LIQUID_LEVEL_Y - BRUSH_DEPTH_RATIO * (LIQUID_LEVEL_Y - INNER_BOTTOM_Y);
export const HAIR_LENGTH = 1.5;
export const HAIR_TOP_Y = BRUSH_TIP_Y + HAIR_LENGTH;
/** Stem ulazi u zatvarač (spoj je sakriven). */
export const STEM_TOP_Y = 6.2;
export const STEM_RADIUS = 0.14;
/** Dlačice: d 0,5 → 0,18, spljošteno po x 1,35 (ravna četkica za lak). */
export const HAIR_RADIUS_TOP = 0.25;
export const HAIR_RADIUS_TIP = 0.09;
export const HAIR_FLAT_X = 1.35;

/** Koliko iznad vrata vrh dlačica mora da izađe da bi četkica bila „napolju" (spec B2). */
export const BRUSH_CLEARANCE = 0.3;
/** Podizanje zatvarača pri otvaranju — iz geometrije, ne hardkodovano. */
export const CAP_LIFT_OUT = NECK_TOP + BRUSH_CLEARANCE - BRUSH_TIP_Y;

/**
 * Perspektivna kamera hero scene. Na 28 jedinica sa fov 30° vidljiva visina kadra je
 * ~15 jedinica, pa bočica od 9,48 jedinica prirodno zauzima ~62 % visine.
 */
export const HERO_CAMERA = { fov: 30, distance: 28 } as const;
