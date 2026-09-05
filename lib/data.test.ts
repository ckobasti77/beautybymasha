import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatDuration, formatNumber, formatRsd } from "./format";
import { photos, photoSrc } from "./photos";
import { HERO_COLOR_SLUGS } from "./heroColors";
import { hexesForSlugs, products, productsByBrand, productsByCategory, productBySlug, swatchProducts } from "./products";
import { bookableServices, serviceByKey, serviceGroups, services, servicesByGroup, unpricedServices } from "./services";
import { LOCATION_KEYS, RESOURCE_KEYS, locationByKey, locations, site } from "./site";

describe("format", () => {
  it("cene: tačka kao hiljadarski separator", () => {
    expect(formatRsd(2300)).toBe("2.300 RSD");
    expect(formatRsd(500)).toBe("500 RSD");
    expect(formatRsd(28000)).toBe("28.000 RSD");
    expect(formatNumber(1234567)).toBe("1.234.567");
  });
  it("trajanja", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(105)).toBe("1 h 45 min");
    expect(formatDuration(120)).toBe("2 h");
  });
});

describe("site.json", () => {
  it("dva lokala, oba sa 7 dana i kapacitetom po resursu", () => {
    expect(locations.map((l) => l.key)).toEqual([...LOCATION_KEYS]);
    for (const l of locations) {
      expect(l.workWeek).toHaveLength(7);
      for (const r of RESOURCE_KEYS) expect(l.capacity[r]).toBeGreaterThanOrEqual(0);
    }
  });
  it("Mimoza ponedeljkom ne radi, Ljubičica radi", () => {
    expect(locationByKey("mimoza").workWeek[1]).toEqual([]);
    expect(locationByKey("ljubicica").workWeek[1].length).toBeGreaterThan(0);
  });
  it("telefon je isti za oba lokala", () => {
    for (const l of locations) expect(l.phone.href).toBe(site.phone.href);
  });
});

describe("services.json", () => {
  it("144 stavki, 9 grupa", () => {
    expect(services).toHaveLength(144);
    expect(serviceGroups).toHaveLength(9);
  });
  it("svaka usluga pripada postojećoj grupi", () => {
    const keys = new Set(serviceGroups.map((g) => g.key));
    for (const s of services) expect(keys.has(s.group)).toBe(true);
  });
  it("bookable usluge imaju cenu, stavke bez cene nisu bookable", () => {
    for (const s of bookableServices) expect(typeof s.priceRsd).toBe("number");
    for (const s of unpricedServices) expect(s.bookable).toBe(false);
    expect(unpricedServices).toHaveLength(4);
  });
  it("cene su verbatim: manikir 2.300, pedikir 3.500", () => {
    expect(serviceByKey("manikir")?.priceRsd).toBe(2300);
    expect(serviceByKey("pedikir")?.priceRsd).toBe(3500);
    expect(servicesByGroup("masaza").length).toBeGreaterThan(0);
  });
});

describe("products.json", () => {
  it("ORLY lakovi + Entity gel lak čine zid swatch-eva", () => {
    expect(productsByCategory("lakovi")).toHaveLength(30);
    expect(productsByBrand("entity").every((p) => p.category === "gel-lak" && p.swatchOnly)).toBe(true);
    expect(swatchProducts.length).toBe(
      productsByCategory("lakovi").length + productsByCategory("gel-lak").length,
    );
  });
  it("slike postoje u public/ (samo localAvif se koristi u kodu); bez slike = swatchOnly", () => {
    for (const p of products) {
      if (p.localAvif === null) {
        expect(p.swatchOnly, p.slug).toBe(true);
        continue;
      }
      expect(existsSync(path.join(process.cwd(), "public", p.localAvif)), p.slug).toBe(true);
    }
  });
  it("hex je #RRGGBB velikim slovima", () => {
    for (const p of products) expect(p.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(productBySlug("vintage")?.family).toBe("mint");
  });
  it("pet boja hero ciklusa postoji u katalogu (spec 13 → D), nepoznat slug obara", () => {
    expect(hexesForSlugs(HERO_COLOR_SLUGS)).toEqual(["#6ECFC0", "#E88BC0", "#C61F35", "#D9C3AC", "#7B2233"]);
    for (const slug of HERO_COLOR_SLUGS) expect(productBySlug(slug)?.bestseller ?? true, slug).toBe(true);
    expect(() => hexesForSlugs(["ne-postoji"])).toThrow();
  });
});

describe("photos.json", () => {
  it("svaka fotografija ima alt i sve rezove u public/", () => {
    expect(photos.length).toBeGreaterThan(0);
    for (const ph of photos) {
      expect(ph.alt.length).toBeGreaterThan(0);
      for (const w of ph.widths) {
        for (const v of ["card", "photo"] as const) {
          expect(existsSync(path.join(process.cwd(), "public", photoSrc(ph, v, w))), `${ph.id} ${v} ${w}`).toBe(true);
        }
      }
    }
  });
});
