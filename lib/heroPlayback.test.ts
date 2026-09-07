import { describe, expect, it } from "vitest";
import {
  BOTTLE_DROP_SMALL,
  BOTTLE_HEIGHT_RATIO_SMALL,
  BOTTLE_X_RATIO_SMALL,
  bottleLayout,
  bottleScreen,
} from "./bottleScreen";
import { shelfEdgeInStage } from "./heroChoreography";
import { PLAY_MS, REPEAT_SCALE, REPEAT_VISITS, easeInOutCubic, playDuration } from "./heroPlayback";
import { GYRO_AMPLITUDE, GYRO_DEADZONE_DEG, GYRO_RANGE_DEG, tiltAxis } from "./tilt";
import { TOTAL_HEIGHT } from "./bottleDims";

/**
 * Korak 18: čista matematika reprodukcije uvoda, žiroskopa i mobilnog rasporeda bočice.
 * Stanja (`createHeroPlayback`) i nagib (`createTilt`) kače DOM slušače i mere se u pregledaču
 * (docs/STATUS.md, provera 18 F) — ovde stoji samo ono što je funkcija svojih ulaza.
 */

describe("reprodukcija uvoda", () => {
  it("easeInOutCubic je simetričan, kreće iz 0 i staje u 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 9);
    for (const t of [0.1, 0.25, 0.4]) {
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 9);
    }
  });

  it("trajanje: pun uvod, pa 60 % za ?nointro i za povratnika u istoj sesiji", () => {
    expect(playDuration("", 1)).toBe(PLAY_MS);
    expect(playDuration("?utm_source=ig", 2)).toBe(PLAY_MS);
    expect(playDuration("?nointro", 1)).toBe(PLAY_MS * REPEAT_SCALE);
    expect(playDuration("", REPEAT_VISITS)).toBe(PLAY_MS * REPEAT_SCALE);
    expect(playDuration("", REPEAT_VISITS + 5)).toBe(PLAY_MS * REPEAT_SCALE);
  });
});

describe("žiroskop (lib/tilt.ts)", () => {
  it("mrtva zona guta sitno podrhtavanje ruke", () => {
    expect(tiltAxis(0)).toBe(0);
    expect(tiltAxis(GYRO_DEADZONE_DEG)).toBe(0);
    expect(tiltAxis(-GYRO_DEADZONE_DEG)).toBe(0);
  });

  it("izlaz je -1..1 i simetričan; pun otklon je opseg + mrtva zona", () => {
    expect(tiltAxis(20)).toBeCloseTo((20 - GYRO_DEADZONE_DEG) / GYRO_RANGE_DEG, 9);
    expect(tiltAxis(-20)).toBeCloseTo(-tiltAxis(20), 9);
    expect(tiltAxis(GYRO_RANGE_DEG + GYRO_DEADZONE_DEG)).toBeCloseTo(1, 9);
    expect(tiltAxis(90)).toBe(1);
    expect(tiltAxis(-90)).toBe(-1);
  });

  it("amplituda na telefonu je tačno pola desktopske", () => {
    expect(GYRO_AMPLITUDE).toBe(0.5);
    // Merenje u pregledaču (provera 18 F9): gamma +20° → uPointer.x = 0.370.
    expect(tiltAxis(20) * GYRO_AMPLITUDE).toBeCloseTo(0.37, 3);
  });
});

describe("mobilni raspored bočice", () => {
  const W = 390;
  const VH = 844;
  const HOLD = 0.23; // 130 vh zona telefona

  it("centrirana po x i manja nego na desktopu", () => {
    const small = bottleScreen(0, HOLD, W, VH, "small");
    const wide = bottleScreen(0, HOLD, W, VH, "wide");
    expect(small.x / W).toBeCloseTo(0.5, 6);
    expect(wide.x / W).toBeGreaterThan(0.5);
    expect(small.scale).toBeLessThan(wide.scale);
    expect(bottleLayout(100, 50, TOTAL_HEIGHT, "small").x).toBe(50 * 0 + BOTTLE_X_RATIO_SMALL * 100);
  });

  it("baza stoji na 99 % kadra — bočica je na telefonu od početka na ivici police", () => {
    const s = bottleScreen(0, HOLD, W, VH, "small");
    expect(s.baseY / VH).toBeCloseTo(0.5 + BOTTLE_HEIGHT_RATIO_SMALL / 2 + BOTTLE_DROP_SMALL, 6);
    expect(s.baseY / VH).toBeCloseTo(0.99, 6);
  });

  it("polica važi i na telefonu: od 0.70 baza je na ivici .hero-overlap, x na 70 %", () => {
    for (const p of [0.7, 0.85, 1]) {
      expect(bottleScreen(p, HOLD, W, VH, "small").baseY).toBeCloseTo(shelfEdgeInStage(p, HOLD, VH), 6);
    }
    expect(bottleScreen(1, HOLD, W, VH, "small").x / W).toBeCloseTo(0.7, 6);
  });

  it("desktop raspored je netaknut — podrazumevani argument je „wide“", () => {
    const a = bottleScreen(0.4, HOLD, 1440, 900);
    const b = bottleScreen(0.4, HOLD, 1440, 900, "wide");
    expect(a).toEqual(b);
  });
});
