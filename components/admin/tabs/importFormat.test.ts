import { describe, expect, it } from "vitest";
import {
  buildRow,
  guessMapping,
  importSummary,
  parseBoolean,
  parseBrand,
  parseCategory,
  parseHex,
  parseNumber,
  type ImportFieldKey,
} from "./importFormat";

/**
 * Uvoz iz tabele je jedina stvar u panelu koju vlasnica radi nad celim katalogom
 * odjednom — pogrešno pročitana cena bi tiho promenila 70 proizvoda. Zato se
 * prevod ćelija testira posebno, bez UI-ja.
 */

describe("parseNumber", () => {
  it("čita srpski zapis cene", () => {
    expect(parseNumber("1.850,00")).toBe(1850);
    expect(parseNumber("12.500")).toBe(12500);
    expect(parseNumber("1850")).toBe(1850);
    expect(parseNumber("1 850")).toBe(1850);
  });

  it("prima i broj iz XLSX ćelije", () => {
    expect(parseNumber(1850)).toBe(1850);
    expect(parseNumber(1849.6)).toBe(1850);
  });

  it("prazna ćelija nije nula", () => {
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber(null)).toBeUndefined();
    expect(parseNumber(undefined)).toBeUndefined();
  });

  it("ne gubi cifre kod cena bez hiljada", () => {
    // Tačka ovde NIJE hiljadarski separator — iza nje nema tri cifre.
    expect(parseNumber("990")).toBe(990);
    expect(parseNumber("1.5")).toBe(2);
  });
});

describe("parseBoolean", () => {
  it("razume da/ne", () => {
    expect(parseBoolean("da")).toBe(true);
    expect(parseBoolean("DA")).toBe(true);
    expect(parseBoolean("ne")).toBe(false);
    expect(parseBoolean("1")).toBe(true);
    expect(parseBoolean("0")).toBe(false);
  });

  it("prazno i nepoznato ostavlja neodređeno — ne dira se", () => {
    expect(parseBoolean("")).toBeUndefined();
    expect(parseBoolean("možda")).toBeUndefined();
  });
});

describe("parseBrand i parseCategory", () => {
  it("brend bez obzira na velika slova", () => {
    expect(parseBrand("ORLY")).toBe("orly");
    expect(parseBrand("Entity")).toBe("entity");
    expect(parseBrand("Essie")).toBeUndefined();
  });

  it("kategorija i po ključu i po naslovu iz cenovnika", () => {
    expect(parseCategory("gel-lak")).toBe("gel-lak");
    expect(parseCategory("Lakovi")).toBe("lakovi");
    expect(parseCategory("")).toBeUndefined();
  });
});

describe("parseHex", () => {
  it("dopisuje tarabu i prihvata oba zapisa", () => {
    expect(parseHex("E85A9B")).toBe("#E85A9B");
    expect(parseHex("#e85a9b")).toBe("#E85A9B");
  });

  it("odbija ono što nije boja", () => {
    expect(parseHex("roze")).toBeUndefined();
    expect(parseHex("#FFF")).toBeUndefined();
  });
});

describe("guessMapping", () => {
  it("pogađa njene nazive kolona", () => {
    const mapping = guessMapping(["Šifra", "Naziv proizvoda", "Cena", "Stanje"]);
    expect(mapping.sku).toBe(0);
    expect(mapping.name).toBe(1);
    expect(mapping.priceRsd).toBe(2);
    expect(mapping.stock).toBe(3);
  });

  it("kolona koje nema ostaje prazna", () => {
    const mapping = guessMapping(["SKU", "Price"]);
    expect(mapping.sku).toBe(0);
    expect(mapping.priceRsd).toBe(1);
    expect(mapping.hex).toBeNull();
    expect(mapping.description).toBeNull();
  });

  it("jedna kolona se ne dodeljuje dvaput", () => {
    const mapping = guessMapping(["Naziv"]);
    const used = Object.values(mapping).filter((v) => v !== null);
    expect(new Set(used).size).toBe(used.length);
  });
});

describe("buildRow", () => {
  const mapping: Record<ImportFieldKey, number | null> = {
    sku: 0,
    name: 1,
    priceRsd: 2,
    discountPercent: null,
    stock: 3,
    categoryKey: null,
    brand: null,
    hex: null,
    description: null,
    active: null,
  };

  it("red bez šifre se ne šalje", () => {
    expect(buildRow(["", "Nešto", "1200", "5"], mapping)).toBeNull();
    expect(buildRow(["   ", "Nešto", "1200", "5"], mapping)).toBeNull();
  });

  it("prazna ćelija znači „ne diraj“ — polje se izostavlja", () => {
    const row = buildRow(["GUMDROP", "", "", ""], mapping);
    expect(row).toEqual({ sku: "GUMDROP" });
    expect(row).not.toHaveProperty("priceRsd");
    expect(row).not.toHaveProperty("stock");
  });

  it("nula na stanju se prenosi — to nije prazno", () => {
    const row = buildRow(["GUMDROP", "Gumdrop", "1850", "0"], mapping);
    expect(row).toEqual({ sku: "GUMDROP", name: "Gumdrop", priceRsd: 1850, stock: 0 });
  });
});

describe("importSummary", () => {
  it("piše izveštaj onako kako ga ona čita", () => {
    expect(importSummary({ updated: 38, created: 12, skipped: [1, 2] })).toBe(
      "38 ažurirano · 12 novo · 2 preskočeno",
    );
  });

  it("bez preskočenih nema trećeg dela", () => {
    expect(importSummary({ updated: 5, created: 0, skipped: [] })).toBe("5 ažurirano · 0 novo");
  });
});
