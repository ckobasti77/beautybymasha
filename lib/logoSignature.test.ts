import { describe, expect, it } from "vitest";
import {
  SIG_ERASE,
  SIG_FLY,
  SIG_WRITE,
  dotAt,
  eraseAt,
  eraseFrontAt,
  flyPoint,
  glyphWindows,
  signatureProgress,
  writeAt,
  writeFrontAt,
} from "./logoSignature";

// „by Masha": 7 glifova, dužine približno kao u lib/brand/logo-paths.ts (M je najduži)
const L = [900, 700, 2600, 800, 600, 900, 800];

describe("logoSignature — brisanje i pisanje", () => {
  it("prozori su proporcionalni dužini, unazad za brisanje, unapred za pisanje", () => {
    const erase = glyphWindows(L, SIG_ERASE, true);
    expect(erase[6][0]).toBe(SIG_ERASE[0]);
    expect(erase[0][1]).toBeCloseTo(SIG_ERASE[1], 9);
    expect(erase[2][1] - erase[2][0]).toBeCloseTo(((SIG_ERASE[1] - SIG_ERASE[0]) * 2600) / 7300, 9);
    const write = glyphWindows(L, SIG_WRITE, false);
    expect(write[0][0]).toBe(SIG_WRITE[0]);
    expect(write[6][1]).toBeCloseTo(SIG_WRITE[1], 9);
  });

  it("pre 0.10 hero potpis je ceo; na 0.18 delimično izbrisan (poslednji glifovi prvi); na 0.20 nema ga", () => {
    for (const g of eraseAt(0.05, L)) {
      expect(g.dashoffset).toBe(0);
      expect(g.fill).toBe(1);
      expect(g.stroke).toBe(0);
    }
    const mid = eraseAt(0.18, L);
    expect(signatureProgress(mid, L)).toBeGreaterThan(0);
    expect(signatureProgress(mid, L)).toBeLessThan(1);
    expect(mid[6].dashoffset).toBe(L[6]); // poslednje „a" već izbrisano
    expect(mid[0].dashoffset).toBe(0); // „b" još stoji
    eraseAt(SIG_ERASE[1], L).forEach((g, i) => {
      expect(g.dashoffset).toBeCloseTo(L[i], 6);
      expect(g.fill).toBe(0);
    });
  });

  it("popuna nestaje u prvih 30 % prozora glifa, dok kontura još stoji", () => {
    const [start, end] = glyphWindows(L, SIG_ERASE, true)[6];
    const early = eraseAt(start + (end - start) * 0.15, L)[6];
    expect(early.fill).toBeCloseTo(0.5, 6);
    expect(early.stroke).toBe(1);
    expect(early.dashoffset).toBeCloseTo(L[6] * 0.15, 6);
    expect(eraseAt(start + (end - start) * 0.5, L)[6].fill).toBe(0);
  });

  it("nav potpis: prazan pre 0.24, na 0.30 delimično napisan s početka, ceo od 0.36", () => {
    writeAt(0.23, L).forEach((g, i) => {
      expect(g.dashoffset).toBeCloseTo(L[i], 6);
      expect(g.fill).toBe(0);
    });
    const mid = writeAt(0.3, L);
    expect(mid[0].dashoffset).toBe(0);
    expect(mid[0].fill).toBe(1);
    expect(mid[6].dashoffset).toBe(L[6]);
    expect(signatureProgress(mid, L)).toBeGreaterThan(0.3);
    expect(signatureProgress(mid, L)).toBeLessThan(0.7);
    for (const g of writeAt(SIG_WRITE[1], L)) {
      expect(g.dashoffset).toBe(0);
      expect(g.fill).toBe(1);
      expect(g.stroke).toBe(0);
    }
  });

  it("ukupno nacrtano monotono opada pri brisanju i raste pri pisanju", () => {
    let prev = 1;
    for (let k = 0; k <= 100; k += 1) {
      const v = signatureProgress(eraseAt(0.1 + k * 0.001, L), L);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
    prev = 0;
    for (let k = 0; k <= 120; k += 1) {
      const v = signatureProgress(writeAt(0.24 + k * 0.001, L), L);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it("front brisanja ide od repa poslednjeg glifa do glave prvog; front pisanja obrnuto", () => {
    expect(eraseFrontAt(0.05, L)).toEqual({ glyph: 6, length: L[6] });
    const mid = eraseFrontAt(0.15, L);
    expect(mid.length).toBeGreaterThanOrEqual(0);
    expect(mid.length).toBeLessThanOrEqual(L[mid.glyph]);
    expect(eraseFrontAt(0.2, L)).toEqual({ glyph: 0, length: 0 });
    expect(writeFrontAt(0.2, L)).toEqual({ glyph: 0, length: 0 });
    expect(writeFrontAt(0.36, L)).toEqual({ glyph: 6, length: L[6] });
    // front je uvek na kraju nacrtanog dela: dužina = L − dashoffset tekućeg glifa
    for (const p of [0.12, 0.16, 0.19]) {
      const f = eraseFrontAt(p, L);
      expect(f.length).toBeCloseTo(L[f.glyph] - eraseAt(p, L)[f.glyph].dashoffset, 6);
    }
    for (const p of [0.26, 0.3, 0.34]) {
      const f = writeFrontAt(p, L);
      expect(f.length).toBeCloseTo(L[f.glyph] - writeAt(p, L)[f.glyph].dashoffset, 6);
    }
  });

  it("tačka: rodi se na 0.10, leti 0.20–0.24, piše do 0.36, na 0.36 je nema", () => {
    expect(dotAt(0.09).phase).toBe("none");
    expect(dotAt(0.1).scale).toBe(0);
    expect(dotAt(0.12).scale).toBe(1);
    expect(dotAt(0.15).phase).toBe("erase");
    expect(dotAt(0.2).phase).toBe("fly");
    expect(dotAt(0.2).t).toBe(0);
    expect(dotAt(0.22).t).toBeCloseTo(0.5, 6);
    expect(dotAt(SIG_FLY[1]).phase).toBe("write");
    expect(dotAt(0.3).opacity).toBe(1);
    expect(dotAt(0.355).opacity).toBeCloseTo(0.5, 6);
    expect(dotAt(SIG_WRITE[1]).phase).toBe("none");
    expect(dotAt(0.5).phase).toBe("none");
  });

  it("let: kreće iz repa, sleće u glavu, na pola puta odstupa od tetive (kriva, ne prava)", () => {
    const from = { x: 130, y: 380 };
    const to = { x: 40, y: 45 };
    expect(flyPoint(0, from, to)).toEqual(from);
    expect(flyPoint(1, from, to)).toEqual(to);
    const mid = flyPoint(0.5, from, to);
    const chordMid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    expect(Math.hypot(mid.x - chordMid.x, mid.y - chordMid.y)).toBeGreaterThan(10);
  });
});
