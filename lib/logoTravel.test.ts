import { describe, expect, it } from "vitest";
import { expoOut, holdEndOf, stageTop } from "./heroChoreography";
import { wordmarkScreenTop, wordmarkTransformAt } from "./logoTravel";

const VH = 900;
const H = 1.7 * VH;
const HOLD = holdEndOf(H, VH);
// wordmark u heroju (u miru): 540 px širok, gore levo ispod nav trake, top RELATIVNO NA STAGE
const REST = { left: 120, top: 200, width: 540 };
// nav slot: 88 px širok, u fiksnoj traci
const SLOT = { left: 32, top: 25, width: 88 };

describe("logoTravel", () => {
  it("u miru nema transforma", () => {
    expect(wordmarkTransformAt(0, REST, SLOT, 0)).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it("na kraju puta wordmark stoji tačno na slotu, skala je odnos širina", () => {
    const t = wordmarkTransformAt(1, REST, SLOT, 0);
    expect(t.x).toBe(SLOT.left - REST.left);
    expect(t.y).toBe(SLOT.top - REST.top);
    expect(t.scale).toBeCloseTo(88 / 540, 9);
    expect(wordmarkScreenTop(1, REST, SLOT, 0)).toBe(SLOT.top);
  });

  it("tokom holda stage miruje, pa je put samo rest → slot sa ease-om", () => {
    for (const p of [0.05, 0.1, 0.2, 0.3]) {
      const top = stageTop(p, HOLD, H, VH);
      expect(top).toBe(0);
      const e = expoOut((p - 0.04) / 0.26);
      expect(wordmarkScreenTop(e, REST, SLOT, top)).toBeCloseTo(REST.top + e * (SLOT.top - REST.top), 9);
    }
  });

  it("posle holda (mobilni rep puta) stage je odgurnut, a wordmark i dalje sleće na slot", () => {
    const smallH = 1.3 * 844;
    const smallHold = holdEndOf(smallH, 844);
    const p = 0.28; // između HOLD_END (0.23) i kraja puta (0.30)
    const top = stageTop(p, smallHold, smallH, 844);
    expect(top).toBeLessThan(0);
    const e = expoOut((p - 0.04) / 0.26);
    // položaj na ekranu ne zavisi od pomeraja stage-a više nego (1 − e) puta
    const screen = wordmarkScreenTop(e, REST, SLOT, top);
    expect(screen).toBeCloseTo((1 - e) * (top + REST.top) + e * SLOT.top, 9);
    expect(wordmarkScreenTop(1, REST, SLOT, top)).toBeCloseTo(SLOT.top, 9);
  });

  it("expo.out izbegava copy: već na 20 % puta wordmark je u zoni nav trake", () => {
    const e = expoOut(0.2 / 0.26);
    const top = wordmarkScreenTop(e, REST, SLOT, 0);
    const scale = wordmarkTransformAt(e, REST, SLOT, 0).scale;
    const bottom = top + 185 * scale;
    expect(bottom).toBeLessThan(110);
  });

  it("nulta širina ne deli nulom", () => {
    expect(wordmarkTransformAt(1, { ...REST, width: 0 }, SLOT, 0).scale).toBe(1);
  });
});
