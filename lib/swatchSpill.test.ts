import { describe, expect, it } from "vitest";
import { SPILL_COUNT, SPILL_LAYOUT, spillPicks } from "./swatchSpill";

describe("spillPicks", () => {
  it("bira tačno 12 nijansi, bez duplikata", () => {
    const picks = spillPicks();
    expect(picks).toHaveLength(SPILL_COUNT);
    expect(new Set(picks.map((p) => p.slug)).size).toBe(SPILL_COUNT);
  });

  it("meša oba brenda i počinje bestselerima", () => {
    const picks = spillPicks();
    const brands = new Set(picks.map((p) => p.brand));
    expect(brands.has("orly")).toBe(true);
    expect(brands.has("entity")).toBe(true);
    expect(picks[0].bestseller).toBe(true);
  });

  it("samo prave boje — lakovi i gel lak, ne baze i nega", () => {
    for (const p of spillPicks()) {
      expect(["lakovi", "gel-lak"]).toContain(p.category);
    }
  });

  it("deterministično: dva poziva daju isti redosled (SSR = klijent)", () => {
    expect(spillPicks().map((p) => p.slug)).toEqual(spillPicks().map((p) => p.slug));
  });

  it("naizmenično po brendu dok oba imaju nijansi", () => {
    const picks = spillPicks(4);
    expect(picks.map((p) => p.brand)).toEqual(["orly", "entity", "orly", "entity"]);
  });
});

describe("SPILL_LAYOUT", () => {
  it("ima mesto za svaku kap i sve je unutar kutije", () => {
    expect(SPILL_LAYOUT).toHaveLength(SPILL_COUNT);
    for (const s of SPILL_LAYOUT) {
      expect(s.x - s.size / 2).toBeGreaterThanOrEqual(0);
      expect(s.x + s.size / 2).toBeLessThanOrEqual(100);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(100);
    }
  });

  it("kapi se ne preklapaju ni na 16:9 ni na 2:1 kutiji", () => {
    for (const aspect of [16 / 9, 2]) {
      // jedinice: % širine; y se skalira odnosom stranica
      for (let i = 0; i < SPILL_LAYOUT.length; i += 1) {
        for (let j = i + 1; j < SPILL_LAYOUT.length; j += 1) {
          const a = SPILL_LAYOUT[i];
          const b = SPILL_LAYOUT[j];
          const dx = a.x - b.x;
          const dy = (a.y - b.y) / aspect;
          const dist = Math.hypot(dx, dy);
          expect(dist).toBeGreaterThan((a.size + b.size) / 2);
        }
      }
    }
  });
});
