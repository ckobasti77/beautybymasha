import { describe, expect, it } from "vitest";
import { plural } from "./format";
import {
  MOST_WANTED_KEYS,
  PRICE_CHIPS,
  addonsOf,
  canBook,
  chipOfGroup,
  contextLabel,
  groupOfCategory,
  mostWanted,
  rowCountOfChip,
  rowsOf,
} from "./priceList";
import { computeView } from "./priceListView";
import { matchRanges, searchServices } from "./serviceSearch";
import {
  bookingHash,
  clearBookingHash,
  parseBookingHash,
  parsePriceHash,
  priceHash,
} from "./sectionIntent";
import { SWATCH_SHAPES, swatchStyle, swatchVars } from "./swatch";
import { serviceGroups, services } from "./services";

describe("plural", () => {
  it("srpska množina, 11–14 su uvek many", () => {
    const u = (n: number) => `${n} ${plural(n, "usluga", "usluge", "usluga")}`;
    expect(u(1)).toBe("1 usluga");
    expect(u(2)).toBe("2 usluge");
    expect(u(5)).toBe("5 usluga");
    expect(u(11)).toBe("11 usluga");
    expect(u(21)).toBe("21 usluga");
    expect(u(22)).toBe("22 usluge");
    expect(u(144)).toBe("144 usluge");
  });
});

describe("priceList", () => {
  it("šest čipova pokriva svih 9 grupa tačno jednom", () => {
    const covered = PRICE_CHIPS.flatMap((c) => c.groups);
    expect(new Set(covered).size).toBe(covered.length);
    expect(covered.length).toBe(serviceGroups.length);
    for (const g of serviceGroups) expect(chipOfGroup(g.key).groups).toContain(g.key);
  });
  it('„najčešće": šest usluga, sve se zakazuju', () => {
    expect(MOST_WANTED_KEYS).toHaveLength(6);
    expect(mostWanted.map((s) => s.key)).toEqual([...MOST_WANTED_KEYS]);
    for (const s of mostWanted) expect(canBook(s)).toBe(true);
    expect(contextLabel(mostWanted[2])).toBe("Depilacija · vosak, žensko");
    expect(contextLabel(mostWanted[0])).toBe("Nega ruku");
  });
  it("redovi + dodaci = sve stavke grupe", () => {
    for (const g of serviceGroups) {
      const all = services.filter((s) => s.group === g.key);
      expect(rowsOf(g.key).length + addonsOf(g.key).length).toBe(all.length);
    }
    expect(addonsOf("nega-ruku").every((s) => s.addon === true)).toBe(true);
    expect(rowsOf("nega-ruku").some((s) => s.addon === true)).toBe(false);
    expect(rowCountOfChip(chipOfGroup("depilacija-pasta-m"))).toBe(
      rowsOf("depilacija-vosak-z").length +
        rowsOf("depilacija-vosak-m").length +
        rowsOf("depilacija-pasta-z").length +
        rowsOf("depilacija-pasta-m").length,
    );
  });
  it('krug „Nokti" vodi na Nega ruku', () => {
    expect(groupOfCategory("nokti")).toBe("nega-ruku");
    expect(groupOfCategory("masaza")).toBe("masaza");
  });
});

describe("serviceSearch", () => {
  const keys = (q: string) => searchServices(q).map((s) => s.key);
  it('„gel" nalazi trajni lak i ORLY gel', () => {
    const found = keys("gel");
    expect(found).toContain("manikir-trajni-lak");
    expect(found).toContain("korekcija-orly-m");
    expect(found).toContain("pedikir-trajni");
    expect(found).not.toContain("masaza-relax-60");
  });
  it('„obrve" nalazi kanu, lift i korekciju obrva', () => {
    const found = keys("obrve");
    expect(found).toContain("kana-obrve");
    expect(found).toContain("brow-lift-botox");
    expect(found).toContain("vosak-z-obrve");
  });
  it("dijakritika ne pravi razliku", () => {
    expect(keys("šećer")).toEqual(keys("secer"));
    expect(keys("secer").every((k) => k.startsWith("pasta-"))).toBe(true);
    expect(keys("secer").length).toBeGreaterThan(5);
  });
  it("više reči je presek", () => {
    const found = keys("masaza relax");
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((k) => k.startsWith("masaza-relax"))).toBe(true);
  });
  it("prazan upit vraća sve, nepostojeći ništa", () => {
    expect(keys("")).toHaveLength(services.length);
    expect(keys("   ")).toHaveLength(services.length);
    expect(keys("xyzq")).toHaveLength(0);
  });
  it("bojenje pogotka: samo pravi tekst naslova, spojeni opsezi", () => {
    expect(matchRanges("Manikir + trajni lak", "manikir")).toEqual([[0, 7]]);
    expect(matchRanges("Manikir + trajni lak", "gel")).toEqual([]);
    expect(matchRanges("Depilacija secernom pastom", "šećer")).toEqual([[11, 16]]);
    expect(matchRanges("Lash lift + brow lift", "lift")).toEqual([
      [5, 9],
      [17, 21],
    ]);
    expect(matchRanges("Trajni lak na nogama", "trajni lak")).toEqual([[0, 10]]);
  });
});

describe("priceListView", () => {
  it('pregled: „najčešće" + prvih 5 redova prve grupe svakog čipa', () => {
    const v = computeView({ chip: null, sub: null, query: "" });
    expect(v.mode).toBe("preview");
    expect(v.showMostWanted).toBe(true);
    expect(v.visibleGroups.size).toBe(PRICE_CHIPS.length);
    expect(v.visibleGroups.has("depilacija-vosak-z")).toBe(true);
    expect(v.visibleGroups.has("depilacija-pasta-m")).toBe(false);
    expect(rowsOf("nega-ruku").filter((s) => v.visibleRows.has(s.key))).toHaveLength(5);
    expect(v.previewMore.has("nega-ruku")).toBe(true);
    expect(v.previewMore.has("trepavice-obrve")).toBe(false);
    expect(v.visibleAddons.size).toBe(0);
  });
  it("čip: sve grupe čipa, redovi i dodaci; pod-čip sužava", () => {
    const v = computeView({ chip: "nega-ruku", sub: null, query: "" });
    expect(v.mode).toBe("chip");
    expect(v.rowCount).toBe(rowsOf("nega-ruku").length);
    expect(v.addonCount).toBe(addonsOf("nega-ruku").length);
    expect(v.showMostWanted).toBe(false);
    const d = computeView({ chip: "depilacija", sub: null, query: "" });
    expect(d.visibleGroups.size).toBe(4);
    const p = computeView({ chip: "depilacija", sub: "depilacija-pasta-m", query: "" });
    expect([...p.visibleGroups]).toEqual(["depilacija-pasta-m"]);
  });
  it("pretraga ide preko svih grupa i hvata dodatke", () => {
    const v = computeView({ chip: "masaza", sub: null, query: "french" });
    expect(v.mode).toBe("search");
    expect(v.rowCount).toBe(0);
    expect(v.visibleAddons.has("french-ruke")).toBe(true);
    expect(v.visibleAddons.has("french-noge")).toBe(true);
    expect(v.visibleGroups.has("nega-nogu")).toBe(true);
    const gel = computeView({ chip: null, sub: null, query: "gel" });
    expect(gel.visibleRows.has("manikir-trajni-lak")).toBe(true);
    const none = computeView({ chip: null, sub: null, query: "xyzq" });
    expect(none.rowCount + none.addonCount).toBe(0);
  });
});

describe("sectionIntent", () => {
  it("hash čarobnjaka: tamo i nazad", () => {
    expect(bookingHash("manikir")).toBe("#zakazivanje?usluga=manikir");
    expect(parseBookingHash(bookingHash("manikir"))).toBe("manikir");
    expect(parseBookingHash("#zakazivanje")).toBeNull();
    expect(parseBookingHash("#zakazivanje?x=1")).toBeNull();
    expect(parseBookingHash("#cenovnik?usluga=manikir")).toBeNull();
    expect(parseBookingHash("")).toBeNull();
    expect(parseBookingHash("zakazivanje?usluga=pedikir")).toBe("pedikir");
  });
  it("hash cenovnika prihvata samo prave grupe", () => {
    expect(priceHash("masaza")).toBe("#cenovnik-masaza");
    expect(parsePriceHash("#cenovnik-masaza")).toBe("masaza");
    expect(parsePriceHash("#cenovnik-depilacija-pasta-m")).toBe("depilacija-pasta-m");
    expect(parsePriceHash("#cenovnik")).toBeNull();
    expect(parsePriceHash("#cenovnik-nepostojeca")).toBeNull();
  });
  it("na serveru nema prozora — helperi su tihi", () => {
    expect(() => clearBookingHash()).not.toThrow();
  });
});

describe("swatch", () => {
  it("isti hex → ista kap; oblik iz skupa preseta", () => {
    for (const hex of ["#6ECFC0", "#14100F", "#F7F3EC", "#C42C34"]) {
      const a = swatchVars(hex);
      expect(swatchVars(hex.toLowerCase())).toEqual(a);
      expect(SWATCH_SHAPES).toContain(a.shape);
      expect([0, 180]).toContain(a.rotate);
      expect([1, -1]).toContain(a.flip);
    }
    expect(swatchStyle("#6ECFC0")["--sw"]).toBe("#6ECFC0");
    expect(swatchStyle("#6ECFC0")["--sw-rot"]).toMatch(/^(0|180)deg$/);
  });
  it("različiti hex-ovi ne padaju svi u isti oblik", () => {
    const shapes = new Set(
      ["#6ECFC0", "#14100F", "#F7F3EC", "#C42C34", "#2E7F8C", "#E88BC0", "#9A5B44", "#DCD4E8"].map(
        (h) => swatchVars(h).shape,
      ),
    );
    expect(shapes.size).toBeGreaterThan(1);
  });
});
