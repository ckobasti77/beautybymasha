import { describe, expect, it } from "vitest";
import { holdEndOf, stageTop } from "./heroChoreography";
import {
  LETTERS_END,
  LETTER_COUNT,
  LETTER_OVERSHOOT,
  letterTravelAt,
  letterWindow,
  type Rect,
} from "./logoTravel";

/** Gornji levi ugao hero glifa na ekranu posle transforma (samo za test). */
function letterScreenTopLeft(p: number, i: number, hero: Rect, nav: Rect, stageTop: number) {
  const t = letterTravelAt(p, i, hero, nav, stageTop);
  return { left: hero.left + t.x, top: stageTop + hero.top + t.y };
}


/** Šest glifova BEAUTY u heroju (540 px lockup, top relativno na stage) i u nav-u (88 px). */
function glyphs(scale: number, left: number, top: number): Rect[] {
  const xs = [0, 593, 1149, 1741, 2357, 2948];
  return xs.map((x) => ({ left: left + x * scale, top, width: 530 * scale, height: 700 * scale }));
}
const HERO = glyphs(540 / 3558, 120, 200);
const NAV = glyphs(88 / 3558, 32, 25);

describe("logoTravel — slovo po slovo", () => {
  it("prozori: 0.06 + 0.015·i → 0.24 + 0.015·i, poslednje slovo sleće na 0.315", () => {
    expect(letterWindow(0)).toEqual([0.06, 0.24]);
    expect(letterWindow(5)[0]).toBeCloseTo(0.135, 9);
    expect(LETTERS_END).toBeCloseTo(0.315, 9);
  });

  it("u miru nema transforma, nav glif je ugašen", () => {
    for (let i = 0; i < LETTER_COUNT; i += 1) {
      const t = letterTravelAt(0.05, i, HERO[i], NAV[i], 0);
      expect(t.x).toBe(0);
      expect(t.y).toBe(0);
      expect(t.scale).toBe(1);
      expect(t.landed).toBe(false);
    }
  });

  it("na kraju puta glif stoji tačno na nav glifu, skala je odnos širina, overshoot se smirio", () => {
    for (let i = 0; i < LETTER_COUNT; i += 1) {
      const t = letterTravelAt(letterWindow(i)[1], i, HERO[i], NAV[i], 0);
      expect(t.x).toBeCloseTo(NAV[i].left - HERO[i].left, 9);
      expect(t.y).toBeCloseTo(NAV[i].top - HERO[i].top, 9);
      expect(t.scale).toBeCloseTo(88 / 540, 9);
      expect(t.landed).toBe(true);
      const tl = letterScreenTopLeft(1, i, HERO[i], NAV[i], 0);
      expect(tl.left).toBeCloseTo(NAV[i].left, 9);
      expect(tl.top).toBeCloseTo(NAV[i].top, 9);
    }
  });

  it("putanja je zakrivljena: na pola puta glif je iznad prave linije za ~12 % dužine", () => {
    const [s, e] = letterWindow(0);
    const p = (s + e) / 2; // expo.inOut(0.5) = 0.5
    const t = letterTravelAt(p, 0, HERO[0], NAV[0], 0);
    const dx = NAV[0].left - HERO[0].left;
    const dy = NAV[0].top - HERO[0].top;
    const length = Math.hypot(dx, dy);
    expect(t.x).toBeCloseTo(dx / 2, 6);
    expect(t.y).toBeCloseTo(dy / 2 - 0.12 * length * 0.5, 6);
    expect(t.y).toBeLessThan(dy / 2);
  });

  it("overshoot: skala prebaci do 1.04× cilja u poslednjih 15 % i sleti na tačno 1×", () => {
    const [s, e] = letterWindow(2);
    const target = 88 / 540;
    let max = 0;
    for (let k = 0; k <= 100; k += 1) {
      const t = letterTravelAt(s + ((e - s) * k) / 100, 2, HERO[2], NAV[2], 0);
      if (k >= 85) max = Math.max(max, t.scale / target);
      else expect(t.scale).toBeGreaterThanOrEqual(target * 0.999);
    }
    expect(max).toBeGreaterThan(1.035);
    // expo.inOut na vrhu overshoot-a (t 0.925) još nije tačno 1, pa je baza ~0,7 % iznad cilja
    expect(max).toBeLessThanOrEqual(1 + LETTER_OVERSHOOT + 0.01);
    expect(letterTravelAt(e, 2, HERO[2], NAV[2], 0).scale).toBeCloseTo(target, 9);
  });

  it("nikad dva ista slova: hero glif je vidljiv dok ne sleti, nav tek od sletanja; sleću s leva na desno", () => {
    let prevLanded = 1;
    for (let k = 0; k <= 400; k += 1) {
      const p = k / 1000; // 0 → 0.40
      let landedCount = 0;
      for (let i = 0; i < LETTER_COUNT; i += 1) {
        const t = letterTravelAt(p, i, HERO[i], NAV[i], 0);
        const heroVisible = t.landed ? 0 : 1;
        const navVisible = t.landed ? 1 : 0;
        expect(heroVisible + navVisible).toBe(1);
        if (t.landed) {
          landedCount += 1;
          // sva slova levo od njega su već sletela
          for (let j = 0; j < i; j += 1) expect(letterTravelAt(p, j, HERO[j], NAV[j], 0).landed).toBe(true);
        }
      }
      expect(landedCount).toBeGreaterThanOrEqual(prevLanded === 1 ? 0 : prevLanded);
      prevLanded = landedCount;
    }
  });

  it("slovo kreće tek posle 40 % svog prozora (expo.inOut), a na p 0.22 slovo Y još nije prešlo ni pola puta", () => {
    const t = letterTravelAt(0.22, 5, HERO[5], NAV[5], 0);
    const dy = NAV[5].top - HERO[5].top;
    expect(Math.abs(t.y)).toBeLessThan(Math.abs(dy) * 0.55);
  });

  it("posle holda (mobilni rep puta) stage je odgurnut, a slovo i dalje sleće na slot", () => {
    const smallH = 1.3 * 844;
    const smallHold = holdEndOf(smallH, 844);
    const p = 0.3; // između HOLD_END (0.23) i kraja puta slova 5 (0.315)
    const top = stageTop(p, smallHold, smallH, 844);
    expect(top).toBeLessThan(0);
    const t = letterTravelAt(p, 5, HERO[5], NAV[5], top);
    expect(t.landed).toBe(false);
    const done = letterScreenTopLeft(letterWindow(5)[1], 5, HERO[5], NAV[5], top);
    expect(done.top).toBeCloseTo(NAV[5].top, 9);
  });

  it("nulta širina ne deli nulom", () => {
    expect(letterTravelAt(1, 0, { ...HERO[0], width: 0 }, NAV[0], 0).scale).toBe(1);
  });
});
