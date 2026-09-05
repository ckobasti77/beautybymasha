import { describe, expect, it } from "vitest";
import {
  BOTTLE_HEIGHT_RATIO,
  EXIT_SCALE,
  TILT_X_DEG,
  TILT_Z_DEG,
  bottleLayout,
  heroChoreography,
  smoothstep,
  visibleHeightAt,
} from "./heroChoreography";

describe("heroChoreography", () => {
  it("na vrhu heroja ništa nije počelo", () => {
    const c = heroChoreography(0);
    expect(c.tiltZ).toBe(0);
    expect(c.tiltX).toBe(0);
    expect(c.pour).toBe(0);
    expect(c.scale).toBe(1);
    expect(c.drift).toBe(0);
    expect(c.opacity).toBe(1);
  });

  it("na 35 % nagib je pun, razlivanje tek počelo, izlazak nije", () => {
    const c = heroChoreography(0.35);
    expect(c.tiltZ).toBeCloseTo(TILT_Z_DEG, 6);
    expect(c.tiltX).toBeCloseTo(TILT_X_DEG, 6);
    expect(c.pour).toBeGreaterThan(0);
    expect(c.pour).toBeLessThan(0.5);
    expect(c.scale).toBe(1);
    expect(c.opacity).toBe(1);
  });

  it("na 70 % je pozadina puna minta, bočica već odlazi", () => {
    const c = heroChoreography(0.7);
    expect(c.pour).toBeCloseTo(1, 6);
    expect(c.scale).toBeLessThan(1);
    expect(c.scale).toBeGreaterThan(EXIT_SCALE);
    expect(c.opacity).toBeLessThan(1);
    expect(c.opacity).toBeGreaterThan(0);
  });

  it("na kraju je bočica smanjena na 0.7, u centru i nevidljiva", () => {
    const c = heroChoreography(1);
    expect(c.scale).toBeCloseTo(EXIT_SCALE, 6);
    expect(c.drift).toBeCloseTo(1, 6);
    expect(c.opacity).toBeCloseTo(0, 6);
    expect(c.pour).toBeCloseTo(1, 6);
  });

  it("stega: vrednosti van 0..1 se ponašaju kao krajevi", () => {
    expect(heroChoreography(-0.5)).toEqual(heroChoreography(0));
    expect(heroChoreography(1.5)).toEqual(heroChoreography(1));
  });

  it("svaki čin je monoton po napretku (bez trzaja unazad)", () => {
    let prev = heroChoreography(0);
    for (let i = 1; i <= 100; i += 1) {
      const c = heroChoreography(i / 100);
      expect(c.tiltZ).toBeGreaterThanOrEqual(prev.tiltZ);
      expect(c.pour).toBeGreaterThanOrEqual(prev.pour);
      expect(c.scale).toBeLessThanOrEqual(prev.scale);
      expect(c.opacity).toBeLessThanOrEqual(prev.opacity);
      expect(c.drift).toBeGreaterThanOrEqual(prev.drift);
      prev = c;
    }
  });

  it("smoothstep ima meke krajeve", () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
    // izvod u 0 i 1 je nula: mali korak od kraja daje skoro ništa
    expect(smoothstep(0, 1, 0.01)).toBeLessThan(0.001);
    expect(1 - smoothstep(0, 1, 0.99)).toBeLessThan(0.001);
  });
});

describe("bottleLayout", () => {
  const MODEL = 9.48;

  it("bočica staje u desnu polovinu i zauzima 62 % visine", () => {
    const vh = visibleHeightAt(30, 28);
    const vw = vh * (1440 / 900);
    const l = bottleLayout(vw, vh, MODEL);
    expect(l.x).toBeCloseTo(vw / 4, 6);
    expect(l.scale * MODEL).toBeCloseTo(vh * BOTTLE_HEIGHT_RATIO, 6);
  });

  it("širi monitor gura bočicu dalje udesno, ali joj ne menja visinu", () => {
    const vh = visibleHeightAt(30, 28);
    const a = bottleLayout(vh * (1440 / 900), vh, MODEL);
    const b = bottleLayout(vh * (1920 / 1080), vh, MODEL);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.scale).toBeCloseTo(a.scale, 9);
  });

  it("visibleHeightAt: fov 30 na 28 jedinica daje ~15 jedinica kadra", () => {
    expect(visibleHeightAt(30, 28)).toBeCloseTo(15.0, 1);
  });
});
