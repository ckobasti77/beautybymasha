// @vitest-environment edge-runtime
/// <reference types="vite/client" />
/**
 * Backend testovi za shop, naloge i loyalty (convex-test, u memoriji).
 *
 * Ovde se dokazuje ono što se inače vidi tek kad neko otvori DevTools i pošalje
 * svoju cenu: server nikad ne veruje klijentu. Klijent bira proizvod i količinu,
 * sve ostalo — cena, popust, poštarina, loyalty — dolazi iz baze.
 */
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { ADMIN_MESSAGES } from "./lib/admin";
import { computeLoyaltyEligibility } from "./lib/loyalty";
import { site } from "../lib/site";
import { discountedUnitPrice } from "../lib/shop";

const modules = import.meta.glob("./**/*.ts");

const KEY = "test-admin-key";

async function setup() {
  process.env.ADMIN_KEY = KEY;
  const t = convexTest(schema, modules);
  await t.mutation(api.admin.seedShop, { key: KEY });
  return t;
}

/** Kupac koji prolazi validaciju — ime, telefon, imejl, adresa. */
const KUPAC = {
  name: "Jelena Petrović",
  phone: "064 111 2233",
  email: "jelena@primer.rs",
  address: "Jurija Gagarina 14",
  city: "Novi Beograd",
  postalCode: "11070",
};

/** Prvi proizvod iz seed-a, sa poznatom cenom. */
const LAK = "vintage";

describe("seedShop", () => {
  it("upiše 4 kategorije i 70 proizvoda i ne duplira ih pri ponovnom pozivu", async () => {
    const t = await setup();
    const opet = await t.mutation(api.admin.seedShop, { key: KEY });
    expect(opet).toEqual({ categories: 0, products: 0 });

    const products = await t.query(api.products.list, {});
    expect(products).toHaveLength(70);
    expect(await t.query(api.products.categories, {})).toHaveLength(4);
  });

  it("bez ključa ne prolazi", async () => {
    process.env.ADMIN_KEY = KEY;
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.admin.seedShop, { key: "pogrešan" })).rejects.toThrow(ADMIN_MESSAGES.badKey);
  });
});

describe("cena se računa na serveru", () => {
  let t: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    t = await setup();
  });

  it("klijent ne može da pošalje svoju cenu — u argumentima je nema", async () => {
    const lak = await t.query(api.products.bySlug, { slug: LAK });
    expect(lak).not.toBeNull();

    // Ovo je „napad": klijent šalje 1 RSD uz stavku. Validator argumenata ga
    // odbija jer `create` prima isključivo { slug, qty }.
    await expect(
      t.mutation(api.orders.create, {
        // @ts-expect-error — namerno pogrešan oblik, provera da server ne prima cenu
        items: [{ slug: LAK, qty: 1, priceRsd: 1, unitPriceRsd: 1 }],
        customer: KUPAC,
        paymentMethod: "pouzecem",
      }),
    ).rejects.toThrow();

    // A ispravan poziv naplaćuje pravu cenu iz baze.
    const order = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect(order.subtotalRsd).toBe(lak!.priceRsd);
    expect(order.subtotalRsd).toBeGreaterThan(1);
  });

  it("popust proizvoda: 20% na 2000 = 1600", async () => {
    expect(discountedUnitPrice(2000, 20)).toBe(1600);

    const lak = await t.query(api.products.bySlug, { slug: LAK });
    await t.mutation(api.products.update, { key: KEY, id: lak!._id, priceRsd: 2000, discountPercent: 20 });

    const order = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect(order.subtotalRsd).toBe(1600);
  });

  it("poštarina je besplatna preko praga, inače fiksna", async () => {
    const lak = await t.query(api.products.bySlug, { slug: LAK });
    await t.mutation(api.products.update, { key: KEY, id: lak!._id, priceRsd: 1000, stock: 100 });

    const mala = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect(mala.shippingRsd).toBe(site.shipping.flatRsd);
    expect(mala.totalRsd).toBe(1000 + site.shipping.flatRsd);

    const velika = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 10 }],
      customer: { ...KUPAC, phone: "064 111 2244" },
      paymentMethod: "pouzecem",
    });
    expect(velika.subtotalRsd).toBe(10_000);
    expect(velika.shippingRsd).toBe(0);
  });
});

describe("stanje na lageru", () => {
  it("porudžbina umanjuje stanje, a porudžbina preko stanja pada", async () => {
    const t = await setup();
    const lak = await t.query(api.products.bySlug, { slug: LAK });
    await t.mutation(api.products.update, { key: KEY, id: lak!._id, stock: 3 });

    await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 2 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect((await t.query(api.products.bySlug, { slug: LAK }))!.stock).toBe(1);

    await expect(
      t.mutation(api.orders.create, {
        items: [{ slug: LAK, qty: 2 }],
        customer: { ...KUPAC, phone: "064 111 2255" },
        paymentMethod: "pouzecem",
      }),
    ).rejects.toThrow(/stanju/i);

    // Neuspela porudžbina nije dirala stanje.
    expect((await t.query(api.products.bySlug, { slug: LAK }))!.stock).toBe(1);
  });

  it("otkazivanje vraća robu na stanje", async () => {
    const t = await setup();
    const lak = await t.query(api.products.bySlug, { slug: LAK });
    await t.mutation(api.products.update, { key: KEY, id: lak!._id, stock: 5 });

    const order = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 2 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect((await t.query(api.products.bySlug, { slug: LAK }))!.stock).toBe(3);

    await t.mutation(api.orders.setStatus, { key: KEY, id: order.orderId, status: "otkazana" });
    expect((await t.query(api.products.bySlug, { slug: LAK }))!.stock).toBe(5);
  });
});

describe("bulkUpsert", () => {
  it("3 postojeća + 2 nova = { updated: 3, created: 2 } i ništa se ne briše", async () => {
    const t = await setup();
    const svi = await t.query(api.products.list, {});
    const postojeci = svi.slice(0, 3);

    const report = await t.mutation(api.products.bulkUpsert, {
      key: KEY,
      rows: [
        ...postojeci.map((p) => ({ sku: p.sku, priceRsd: p.priceRsd + 100 })),
        { sku: "NOV-001", name: "Novi lak jedan", priceRsd: 1500, hex: "#AABBCC" },
        { sku: "NOV-002", name: "Novi lak dva", priceRsd: 1600, hex: "#112233" },
      ],
    });

    expect(report).toEqual({ updated: 3, created: 2, skipped: [] });
    expect(await t.query(api.products.list, {})).toHaveLength(72);

    const izmenjen = await t.query(api.products.bySlug, { slug: postojeci[0].slug });
    expect(izmenjen!.priceRsd).toBe(postojeci[0].priceRsd + 100);
  });

  it("neispravan red upada u skipped, ostatak tabele prolazi", async () => {
    const t = await setup();
    const report = await t.mutation(api.products.bulkUpsert, {
      key: KEY,
      rows: [
        { sku: "NOV-003", name: "Ispravan", priceRsd: 1200, hex: "#FFFFFF" },
        { sku: "NOV-004", name: "Bez cene" },
        { sku: "NOV-005", name: "Nula dinara", priceRsd: 0 },
      ],
    });
    expect(report.created).toBe(1);
    expect(report.updated).toBe(0);
    expect(report.skipped.map((s) => s.sku)).toEqual(["NOV-004", "NOV-005"]);
  });
});

describe("loyalty", () => {
  /**
   * Convex Auth prijava traži pravi HTTP tok, pa se ovde član pravi direktno u
   * bazi (isto stanje koje `afterUserCreatedOrUpdated` ostavlja) i identitet se
   * glumi kroz `t.withIdentity`. Predmet testa su pravila popusta, ne prijava.
   */
  async function napraviClana(t: Awaited<ReturnType<typeof setup>>, email: string) {
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        email,
        role: "customer" as const,
        loyaltyNumber: `BM${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`,
        createdAt: Date.now(),
      }),
    );
    return { userId, as: t.withIdentity({ subject: userId, issuer: "test" }) };
  }

  it("pravilo se drži na jednom mestu i vraća isti odgovor za iste ulaze", () => {
    const nov = computeLoyaltyEligibility({ registeredAt: 1000, redemptionsAt: [], paidVisitsAt: [] });
    expect(nov).toMatchObject({ eligible: true, reason: "prva-poseta", discountPercent: 10 });

    const potrosen = computeLoyaltyEligibility({ registeredAt: 1000, redemptionsAt: [2000], paidVisitsAt: [] });
    expect(potrosen).toMatchObject({ eligible: false, reason: "iskoriscen" });

    const posleNove = computeLoyaltyEligibility({
      registeredAt: 1000,
      redemptionsAt: [2000],
      paidVisitsAt: [3000],
    });
    expect(posleNove).toMatchObject({ eligible: true, reason: "posle-posete" });
  });

  it("10% se primeni jednom, upiše redemption, i drugi put više ne važi", async () => {
    const t = await setup();
    const { userId, as } = await napraviClana(t, "clan@primer.rs");

    const lak = await t.query(api.products.bySlug, { slug: LAK });
    await t.mutation(api.products.update, { key: KEY, id: lak!._id, priceRsd: 2000, discountPercent: 0, stock: 50 });

    const prva = await as.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect(prva.subtotalRsd).toBe(2000);
    expect(prva.loyaltyDiscountRsd).toBe(200);
    expect(prva.totalRsd).toBe(2000 - 200 + site.shipping.flatRsd);

    const redemptions = await t.run(async (ctx) =>
      ctx.db
        .query("loyaltyRedemptions")
        .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
        .collect(),
    );
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0]).toMatchObject({ kind: "web", discountRsd: 200, amountRsd: 2000 });

    const druga = await as.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect(druga.loyaltyDiscountRsd).toBe(0);
    expect(druga.totalRsd).toBe(2000 + site.shipping.flatRsd);
  });

  it("gost bez naloga ne dobija loyalty popust", async () => {
    const t = await setup();
    const lak = await t.query(api.products.bySlug, { slug: LAK });
    await t.mutation(api.products.update, { key: KEY, id: lak!._id, priceRsd: 2000, discountPercent: 0 });

    const order = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });
    expect(order.loyaltyDiscountRsd).toBe(0);
  });

  it("radnica troši popust u salonu i drugi put ne može", async () => {
    const t = await setup();
    const { userId } = await napraviClana(t, "salon@primer.rs");

    const prvi = await t.mutation(api.loyalty.redeem, {
      key: KEY,
      userId: userId as Id<"users">,
      kind: "salon",
      amountRsd: 3000,
    });
    expect(prvi.discountRsd).toBe(300);
    expect(prvi.payableRsd).toBe(2700);

    await expect(
      t.mutation(api.loyalty.redeem, { key: KEY, userId: userId as Id<"users">, kind: "salon", amountRsd: 3000 }),
    ).rejects.toThrow(/popust/i);
  });

  it("findMember pronalazi člana po broju kartice", async () => {
    const t = await setup();
    const { userId } = await napraviClana(t, "trazena@primer.rs");
    const card = await t.run(async (ctx) => (await ctx.db.get(userId as Id<"users">))!.loyaltyNumber!);

    const found = await t.query(api.loyalty.findMember, { key: KEY, query: card });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ userId, loyaltyNumber: card, eligible: true });

    const poMejlu = await t.query(api.loyalty.findMember, { key: KEY, query: "trazena@" });
    expect(poMejlu.map((m) => m.userId)).toContain(userId);
  });

  it("QR nosi samo broj kartice, ništa lično", async () => {
    const t = await setup();
    const { userId, as } = await napraviClana(t, "qr@primer.rs");
    const card = await t.run(async (ctx) => (await ctx.db.get(userId as Id<"users">))!.loyaltyNumber!);

    const kartica = await as.query(api.loyalty.myCard, {});
    expect(kartica.qrValue).toBe(card);
    expect(kartica.qrValue).toMatch(/^BM\d{6}$/);
    expect(JSON.stringify(kartica.qrValue)).not.toContain("qr@primer.rs");
  });
});

describe("pristup tuđim porudžbinama", () => {
  it("byNumber traži i broj i telefon; pogrešan telefon ne otkriva ništa", async () => {
    const t = await setup();
    const order = await t.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });

    const svoja = await t.query(api.orders.byNumber, {
      orderNumber: order.orderNumber,
      phone: KUPAC.phone,
    });
    expect(svoja?.orderNumber).toBe(order.orderNumber);

    const tudja = await t.query(api.orders.byNumber, {
      orderNumber: order.orderNumber,
      phone: "064 999 8877",
    });
    expect(tudja).toBeNull();
  });

  it("„moje porudžbine“ vraćaju samo svoje", async () => {
    const t = await setup();
    const a = await t.run(async (ctx) => ctx.db.insert("users", { email: "a@primer.rs", role: "customer" as const }));
    const b = await t.run(async (ctx) => ctx.db.insert("users", { email: "b@primer.rs", role: "customer" as const }));

    const kaoA = t.withIdentity({ subject: a, issuer: "test" });
    const kaoB = t.withIdentity({ subject: b, issuer: "test" });

    const aOrder = await kaoA.mutation(api.orders.create, {
      items: [{ slug: LAK, qty: 1 }],
      customer: KUPAC,
      paymentMethod: "pouzecem",
    });

    expect((await kaoA.query(api.orders.mine, {})).map((o) => o.orderNumber)).toEqual([aOrder.orderNumber]);
    expect(await kaoB.query(api.orders.mine, {})).toEqual([]);
  });

  it("bez prijave nema „mojih porudžbina“", async () => {
    const t = await setup();
    await expect(t.query(api.orders.mine, {})).rejects.toThrow(ADMIN_MESSAGES.notSignedIn);
  });
});

describe("broj porudžbine", () => {
  it("raste u nizu i jedinstven je", async () => {
    const t = await setup();
    const brojevi: string[] = [];
    for (let i = 0; i < 3; i++) {
      const o = await t.mutation(api.orders.create, {
        items: [{ slug: LAK, qty: 1 }],
        customer: { ...KUPAC, phone: `06411122${String(i).padStart(2, "0")}` },
        paymentMethod: "pouzecem",
      });
      brojevi.push(o.orderNumber);
    }
    expect(new Set(brojevi).size).toBe(3);
    expect(brojevi[0]).toMatch(/^BM-\d{4}-\d{4}$/);
    expect(brojevi[2].slice(-4)).toBe("0003");
  });
});

describe("IPS", () => {
  it("dok podaci primaoca nisu potvrđeni, IPS plaćanje se ne nudi", async () => {
    const t = await setup();
    // data/site.json ima [POTVRDITI] umesto računa — ovaj test pada onog dana
    // kad se pravi račun upiše, i tada se prepisuje u proveru sadržaja naloga.
    await expect(
      t.mutation(api.orders.create, {
        items: [{ slug: LAK, qty: 1 }],
        customer: KUPAC,
        paymentMethod: "ips",
      }),
    ).rejects.toThrow(/IPS/);
  });
});

describe("kontakt forma", () => {
  it("prima poruku, odbija prekratku i ograničava slanje", async () => {
    const t = await setup();
    await t.mutation(api.inquiries.create, {
      name: "Marko Marković",
      email: "marko@primer.rs",
      message: "Da li radite depilaciju u nedelju?",
    });

    await expect(
      t.mutation(api.inquiries.create, { name: "Marko Marković", email: "marko@primer.rs", message: "ok" }),
    ).rejects.toThrow(/2000/);

    for (let i = 0; i < 2; i++) {
      await t.mutation(api.inquiries.create, {
        name: "Marko Marković",
        email: "marko@primer.rs",
        message: `Još jedno pitanje broj ${i}`,
      });
    }
    await expect(
      t.mutation(api.inquiries.create, {
        name: "Marko Marković",
        email: "marko@primer.rs",
        message: "I još jedno pitanje",
      }),
    ).rejects.toThrow(/Previše/);

    expect(await t.query(api.inquiries.list, { key: KEY })).toHaveLength(3);
  });
});
