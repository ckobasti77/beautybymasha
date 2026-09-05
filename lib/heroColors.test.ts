import { describe, expect, it } from "vitest";
import {
  COLOR_FADE,
  COLOR_HOLD,
  COLOR_PERIOD,
  HERO_COLOR_SLUGS,
  HeroColorCycle,
  contrastRatio,
  easeSine,
  effectivePourHex,
  inkContrast,
  inkFor,
  mixHex,
  relativeLuminance,
} from "./heroColors";

/** Hex iz data/products.json za HERO_COLOR_SLUGS, redom (proverava ih lib/data.test.ts). */
const HEX = ["#6ECFC0", "#E88BC0", "#C61F35", "#D9C3AC", "#7B2233"];

describe("HeroColorCycle", () => {
  it("drži boju 3.5 s, prelazi 1 s, pa ide dalje u krug", () => {
    const c = new HeroColorCycle(HEX);
    expect(c.blend).toEqual({ from: HEX[0], to: HEX[1], t: 0 });
    c.step(COLOR_HOLD);
    expect(c.blend.t).toBe(0);
    expect(c.hex).toBe(HEX[0]);
    c.step(COLOR_FADE / 2);
    expect(c.blend.t).toBeCloseTo(0.5, 9);
    expect(c.hex).toBe(mixHex(HEX[0], HEX[1], 0.5));
    c.step(COLOR_FADE / 2);
    expect(c.blend).toEqual({ from: HEX[1], to: HEX[2], t: 0 });
    c.step(COLOR_PERIOD * 4);
    expect(c.blend.from).toBe(HEX[0]);
  });

  it("veliki skok vremena (povratak u tab) preskače više perioda bez greške", () => {
    const c = new HeroColorCycle(HEX);
    c.step(COLOR_PERIOD * 7 + 1);
    expect(c.blend.from).toBe(HEX[2]);
    expect(c.blend.t).toBe(0);
  });

  it("capture zamrzava tačno ono što se vidi, release nastavlja od tog mesta", () => {
    const c = new HeroColorCycle(HEX);
    c.step(COLOR_HOLD + 0.25);
    const seen = c.hex;
    expect(seen).not.toBe(HEX[0]);
    expect(c.capture()).toBe(seen);
    expect(c.captured).toBe(seen);
    c.step(10);
    expect(c.hex).toBe(seen); // stoji
    expect(c.capture()).toBe(seen);
    c.release();
    expect(c.captured).toBeNull();
    c.step(COLOR_FADE);
    expect(c.blend.from).toBe(HEX[1]); // nastavio od uhvaćenog mesta, ne ispočetka
  });

  it("startFrom postavlja početnu boju, nepoznat hex se ignoriše", () => {
    const c = new HeroColorCycle(HEX);
    c.startFrom("#d9c3ac");
    expect(c.blend.from).toBe(HEX[3]);
    c.startFrom("#000000");
    expect(c.blend.from).toBe(HEX[3]);
  });

  it("bez boja ne može", () => {
    expect(() => new HeroColorCycle([])).toThrow();
  });
});

describe("boje i ink", () => {
  it("mixHex meša po kanalu i vraća velika slova", () => {
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#6ECFC0", "#E88BC0", 0)).toBe("#6ECFC0");
    expect(mixHex("#6ECFC0", "#E88BC0", 1)).toBe("#E88BC0");
  });

  it("easeSine ima meke krajeve", () => {
    expect(easeSine(0)).toBe(0);
    expect(easeSine(1)).toBeCloseTo(1, 12);
    expect(easeSine(0.5)).toBeCloseTo(0.5, 12);
  });

  it("luminanca i kontrast po WCAG-u", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBe(0);
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 6);
    expect(relativeLuminance("#E88BC0")).toBeCloseTo(0.39, 1);
  });

  it("ink: mint, roze i nude nose taman tekst; red i wine svetao — i svaki prolazi AA", () => {
    const expected = ["dark", "dark", "light", "dark", "light"];
    HEX.forEach((hex, i) => {
      const eff = effectivePourHex(hex);
      expect(inkFor(eff), hex).toBe(expected[i]);
      expect(inkContrast(eff), hex).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("prag po luminanci 0.45 bi roze dao beo tekst ispod AA — zato kontrast", () => {
    const rose = effectivePourHex("#E88BC0");
    expect(relativeLuminance(rose)).toBeLessThan(0.45);
    expect(contrastRatio(relativeLuminance(rose), 1)).toBeLessThan(4.5);
    expect(inkFor(rose)).toBe("dark");
  });

  it("pet slugova, naizmenično ORLY / Entity", () => {
    expect(HERO_COLOR_SLUGS).toHaveLength(5);
    expect(HERO_COLOR_SLUGS.filter((s) => s.startsWith("entity-"))).toHaveLength(2);
  });
});
