import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  addToCart,
  cartCount,
  parseCart,
  removeFromCart,
  setCartQty,
  type CartItem,
} from "./cart";
import { MAX_QTY_PER_LINE } from "./shop";

/**
 * Korpa je jedini deo naplate koji živi kod korisnika, u `localStorage`. Tamo
 * sme da uđe bilo šta — ručno izmenjen ključ, ostatak stare verzije, JSON iz
 * druge aplikacije. Ovi testovi drže obećanje da ništa od toga ne sruši sajt i
 * da u korpu ne može da se ubaci ni cena ni negativna količina.
 */

describe("parseCart", () => {
  it("prazno i pokvareno daju praznu korpu, ne grešku", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("")).toEqual([]);
    expect(parseCart("{nije json")).toEqual([]);
    expect(parseCart('{"slug":"vintage"}')).toEqual([]);
    expect(parseCart("[1,2,3]")).toEqual([]);
  });

  it("propušta samo ispravne slug-ove", () => {
    const raw = JSON.stringify([
      { slug: "vintage", qty: 2 },
      { slug: "VELIKA SLOVA", qty: 1 },
      { slug: "../../etc/passwd", qty: 1 },
      { slug: "bez-kolicine" },
      { qty: 3 },
    ]);
    expect(parseCart(raw)).toEqual([{ slug: "vintage", qty: 2 }]);
  });

  it("količina se svodi na ceo broj u opsegu 1…20", () => {
    const raw = JSON.stringify([
      { slug: "a", qty: 0 },
      { slug: "b", qty: -5 },
      { slug: "c", qty: 999 },
      { slug: "d", qty: 2.7 },
    ]);
    expect(parseCart(raw)).toEqual([
      { slug: "a", qty: 1 },
      { slug: "b", qty: 1 },
      { slug: "c", qty: MAX_QTY_PER_LINE },
      { slug: "d", qty: 2 },
    ]);
  });

  it("cena poslata iz localStorage se ne čuva — u korpi su samo slug i količina", () => {
    const raw = JSON.stringify([{ slug: "vintage", qty: 1, priceRsd: 1, lineTotal: 1 }]);
    expect(parseCart(raw)).toEqual([{ slug: "vintage", qty: 1 }]);
  });

  it("isti slug dvaput ulazi jednom", () => {
    const raw = JSON.stringify([
      { slug: "vintage", qty: 1 },
      { slug: "vintage", qty: 5 },
    ]);
    expect(parseCart(raw)).toEqual([{ slug: "vintage", qty: 1 }]);
  });

  it("preko gornje granice redova se seče", () => {
    const raw = JSON.stringify(
      Array.from({ length: MAX_CART_LINES + 10 }, (_, i) => ({ slug: `lak-${i}`, qty: 1 })),
    );
    expect(parseCart(raw)).toHaveLength(MAX_CART_LINES);
  });
});

describe("izmene korpe", () => {
  const korpa: CartItem[] = [
    { slug: "vintage", qty: 1 },
    { slug: "gumdrop", qty: 2 },
  ];

  it("dodavanje postojećeg sabira količine, do gornje granice", () => {
    expect(addToCart(korpa, "vintage", 3)).toContainEqual({ slug: "vintage", qty: 4 });
    expect(addToCart(korpa, "vintage", 999)).toContainEqual({ slug: "vintage", qty: MAX_QTY_PER_LINE });
  });

  it("dodavanje novog produžava spisak, ali ne preko granice redova", () => {
    expect(addToCart(korpa, "kiss-the-bride")).toHaveLength(3);

    const puna = Array.from({ length: MAX_CART_LINES }, (_, i) => ({ slug: `lak-${i}`, qty: 1 }));
    expect(addToCart(puna, "jos-jedan")).toHaveLength(MAX_CART_LINES);
  });

  it("količina 0 izbacuje stavku umesto da ostavi prazan red", () => {
    expect(setCartQty(korpa, "vintage", 0)).toEqual([{ slug: "gumdrop", qty: 2 }]);
  });

  it("negativna količina takođe izbacuje stavku", () => {
    expect(setCartQty(korpa, "vintage", -3)).toEqual([{ slug: "gumdrop", qty: 2 }]);
  });

  it("postavljanje preko gornje granice po liniji se svodi na maksimum", () => {
    expect(setCartQty(korpa, "vintage", 999)).toContainEqual({ slug: "vintage", qty: MAX_QTY_PER_LINE });
  });

  it("brza dugmad ne prelaze granicu po liniji koliko god puta se dodaje", () => {
    let items: CartItem[] = [];
    for (let i = 0; i < MAX_QTY_PER_LINE + 5; i++) items = addToCart(items, "vintage", 1);
    expect(items).toEqual([{ slug: "vintage", qty: MAX_QTY_PER_LINE }]);
  });

  it("izbacivanje nepostojeće stavke ne dira korpu", () => {
    expect(removeFromCart(korpa, "ne-postoji")).toEqual(korpa);
  });

  it("broj u navigaciji je zbir komada, ne broj redova", () => {
    expect(cartCount(korpa)).toBe(3);
    expect(cartCount([])).toBe(0);
  });

  it("nijedna izmena ne menja polaznu korpu na mestu", () => {
    const kopija = structuredClone(korpa);
    addToCart(korpa, "vintage", 2);
    setCartQty(korpa, "gumdrop", 9);
    removeFromCart(korpa, "vintage");
    expect(korpa).toEqual(kopija);
  });
});
