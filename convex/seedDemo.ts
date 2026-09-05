/**
 * Demo podaci — da panel i sajt nikad ne budu prazni na prezentaciji.
 *
 *   npm run seed          upiše katalog + demo saobraćaj
 *   npm run seed:clear    obriše SAMO demo saobraćaj (katalog ostaje)
 *
 * Dva pravila koja ovo drže na okupu:
 *
 * 1. **Sve je relativno prema „danas".** Termini se računaju od ponedeljka
 *    tekuće nedelje (`startOfWeek`), porudžbine i loyalty istorija od trenutnog
 *    vremena. Nijedan datum nije zakucan, pa seed jednako izgleda i za mesec dana.
 *
 * 2. **Demo se prepoznaje po kontaktu, ne po zastavici u shemi.** Svaki demo
 *    termin i svaka demo porudžbina imaju telefon iz opsega `0641230xxx`, a svaki
 *    demo nalog i svaka demo poruka imejl na `demo.beautybymasha.rs`. To su
 *    opsezi koji se ne mogu sudariti sa pravim gostom, čitaju se kroz indekse
 *    `by_phone`, i zato `clear` ume da obriše tačno ono što je seed napravio —
 *    a nijedan pravi podatak.
 *
 * `run` je zato idempotentan: prvo obriše prethodni demo, pa upiše nov. Koliko
 * god puta da se pozove, baza izgleda isto.
 */
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { getShopConfig } from "./lib/availability";
import { seedCore, seedShopCore } from "./lib/seed";
import { nextOrderNumber } from "./orders";
import { serviceByKey, serviceGroupByKey } from "../lib/services";
import { cartTotals, lineTotal, type CartLineInput } from "../lib/shop";
import type { LocationKey } from "../lib/site";
import { addDays, belgradeNow, startOfWeek, toMin } from "../lib/slots";

/** Rezervisan opseg brojeva — nijedan pravi gost ga nema. */
const DEMO_PHONE_PREFIX = "0641230";
/** Rezervisan domen — imejl koji ne postoji i ne može da stigne pravom čoveku. */
const DEMO_EMAIL_DOMAIN = "demo.beautybymasha.rs";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function demoPhone(n: number): string {
  return `${DEMO_PHONE_PREFIX}${String(n).padStart(3, "0")}`;
}

function isDemoEmail(email: string | undefined): boolean {
  return typeof email === "string" && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

/* =====================================================================
 * Termini kroz tekuću nedelju
 * ===================================================================== */

type DemoBooking = {
  /** Pomak od ponedeljka tekuće nedelje: 0 = ponedeljak … 6 = nedelja. */
  readonly day: number;
  readonly at: string;
  readonly locationKey: LocationKey;
  readonly serviceKey: string;
  readonly name: string;
  readonly phone: number;
  readonly status: "nov" | "potvrdjen";
  readonly note?: string;
};

/**
 * Mimoza ne radi ponedeljkom, pa u `day: 0` nema nijednog njenog termina — isto
 * pravilo koje stoji u `data/site.json` i u JSON-LD radnom vremenu.
 *
 * Utorak u Ljubičici namerno ima tri manikira u isto vreme: kapacitet noktiju je
 * 3, pa kalendar mora da ih prikaže kao tri uske trake jednu do druge, a ne
 * jednu preko druge.
 */
const DEMO_BOOKINGS: readonly DemoBooking[] = [
  // Ponedeljak — radi samo Ljubičica.
  { day: 0, at: "09:30", locationKey: "ljubicica", serviceKey: "manikir-trajni-lak", name: "Jelena Marković", phone: 1, status: "potvrdjen" },
  { day: 0, at: "11:00", locationKey: "ljubicica", serviceKey: "vosak-z-cele-noge", name: "Ana Petrović", phone: 2, status: "potvrdjen" },
  { day: 0, at: "17:00", locationKey: "ljubicica", serviceKey: "masaza-parcijalna-30", name: "Milica Jovanović", phone: 3, status: "potvrdjen" },

  // Utorak — tri manikira u 10:00 u Ljubičici, Mimoza se otvara.
  { day: 1, at: "10:00", locationKey: "ljubicica", serviceKey: "manikir", name: "Sara Ilić", phone: 4, status: "potvrdjen" },
  { day: 1, at: "10:00", locationKey: "ljubicica", serviceKey: "manikir-trajni-lak", name: "Teodora Nikolić", phone: 5, status: "potvrdjen" },
  { day: 1, at: "10:00", locationKey: "ljubicica", serviceKey: "spa-orly-manikir", name: "Katarina Đorđević", phone: 6, status: "nov" },
  { day: 1, at: "13:00", locationKey: "mimoza", serviceKey: "manikir-trajni-lak", name: "Ivana Stanković", phone: 7, status: "potvrdjen" },

  // Sreda
  { day: 2, at: "12:00", locationKey: "mimoza", serviceKey: "vosak-z-pazuh", name: "Marija Pavlović", phone: 8, status: "potvrdjen", note: "Dolazi sa sestrom, ako ima mesta i za nju." },
  { day: 2, at: "18:30", locationKey: "ljubicica", serviceKey: "pedikir", name: "Nevena Ristić", phone: 9, status: "nov" },

  // Četvrtak
  { day: 3, at: "10:30", locationKey: "mimoza", serviceKey: "masaza-relax-60", name: "Dragana Simić", phone: 10, status: "potvrdjen" },
  { day: 3, at: "16:00", locationKey: "ljubicica", serviceKey: "manikir", name: "Tijana Lukić", phone: 11, status: "nov" },

  // Petak
  { day: 4, at: "11:30", locationKey: "ljubicica", serviceKey: "manikir-trajni-lak", name: "Jovana Mitrović", phone: 12, status: "potvrdjen" },
  { day: 4, at: "19:00", locationKey: "mimoza", serviceKey: "vosak-z-cele-noge", name: "Aleksandra Todorović", phone: 13, status: "nov" },

  // Subota
  { day: 5, at: "10:00", locationKey: "ljubicica", serviceKey: "pedikir-trajni", name: "Danijela Kostić", phone: 14, status: "potvrdjen" },
];

/* =====================================================================
 * Loyalty članovi
 * ===================================================================== */

const DEMO_MEMBERS = [
  {
    name: "Jelena Marković",
    email: `jelena.markovic@${DEMO_EMAIL_DOMAIN}`,
    loyaltyNumber: "BM900001",
    phone: 1,
    redemptions: [
      { daysAgo: 96, kind: "salon" as const, amountRsd: 3400 },
      { daysAgo: 41, kind: "web" as const, amountRsd: 5180 },
    ],
  },
  {
    name: "Ana Petrović",
    email: `ana.petrovic@${DEMO_EMAIL_DOMAIN}`,
    loyaltyNumber: "BM900002",
    phone: 2,
    redemptions: [{ daysAgo: 12, kind: "salon" as const, amountRsd: 4200 }],
  },
  {
    name: "Milica Jovanović",
    email: `milica.jovanovic@${DEMO_EMAIL_DOMAIN}`,
    loyaltyNumber: "BM900003",
    phone: 3,
    redemptions: [],
  },
] as const;

/* =====================================================================
 * Porudžbine
 * ===================================================================== */

type OrderStatus = "nova" | "u_obradi" | "poslata" | "zavrsena" | "otkazana";

type DemoOrder = {
  /** Pre koliko sati je poručena — od toga se računa i istorija statusa. */
  readonly hoursAgo: number;
  readonly status: OrderStatus;
  readonly paymentMethod: "pouzecem" | "ips";
  readonly paymentStatus: "nije_potrebno" | "ceka_uplatu" | "placeno";
  /** Loyalty član na čiji nalog ide porudžbina (indeks u DEMO_MEMBERS). */
  readonly memberIndex?: number;
  readonly customer: {
    readonly name: string;
    readonly phone: number;
    readonly email: string;
    readonly address: string;
    readonly city: string;
    readonly postalCode: string;
    readonly note?: string;
  };
  readonly lines: readonly { readonly slug: string; readonly qty: number }[];
  readonly history: readonly { readonly status: OrderStatus; readonly hoursAgo: number; readonly note?: string }[];
};

const DEMO_ORDERS: readonly DemoOrder[] = [
  {
    hoursAgo: 3,
    status: "nova",
    paymentMethod: "pouzecem",
    paymentStatus: "nije_potrebno",
    customer: {
      name: "Sara Ilić",
      phone: 4,
      email: `sara.ilic@${DEMO_EMAIL_DOMAIN}`,
      address: "Jurija Gagarina 145",
      city: "Beograd",
      postalCode: "11070",
    },
    lines: [{ slug: "vintage", qty: 1 }, { slug: "gumdrop", qty: 2 }],
    history: [{ status: "nova", hoursAgo: 3 }],
  },
  {
    hoursAgo: 26,
    status: "u_obradi",
    paymentMethod: "ips",
    paymentStatus: "ceka_uplatu",
    customer: {
      name: "Marija Pavlović",
      phone: 8,
      email: `marija.pavlovic@${DEMO_EMAIL_DOMAIN}`,
      address: "Bulevar Mihajla Pupina 10",
      city: "Beograd",
      postalCode: "11070",
      note: "Molim vas pozovite pre dostave.",
    },
    lines: [{ slug: "kiss-the-bride", qty: 1 }, { slug: "cupcake", qty: 1 }, { slug: "confetti", qty: 1 }],
    history: [
      { status: "nova", hoursAgo: 26 },
      { status: "u_obradi", hoursAgo: 20 },
    ],
  },
  {
    // Jedina sa loyalty popustom — Jelena je član i popust joj je pao na webu.
    hoursAgo: 74,
    status: "poslata",
    paymentMethod: "pouzecem",
    paymentStatus: "nije_potrebno",
    memberIndex: 0,
    customer: {
      name: "Jelena Marković",
      phone: 1,
      email: `jelena.markovic@${DEMO_EMAIL_DOMAIN}`,
      address: "Vojvođanska 5",
      city: "Beograd",
      postalCode: "11080",
    },
    lines: [{ slug: "vintage", qty: 2 }, { slug: "cupcake", qty: 1 }],
    history: [
      { status: "nova", hoursAgo: 74 },
      { status: "u_obradi", hoursAgo: 70 },
      { status: "poslata", hoursAgo: 48, note: "Poslato Post Expressom." },
    ],
  },
  {
    hoursAgo: 170,
    status: "zavrsena",
    paymentMethod: "ips",
    paymentStatus: "placeno",
    customer: {
      name: "Dragana Simić",
      phone: 10,
      email: `dragana.simic@${DEMO_EMAIL_DOMAIN}`,
      address: "Nehruova 92",
      city: "Beograd",
      postalCode: "11070",
    },
    lines: [{ slug: "gumdrop", qty: 1 }, { slug: "confetti", qty: 2 }],
    history: [
      { status: "nova", hoursAgo: 170 },
      { status: "u_obradi", hoursAgo: 166 },
      { status: "poslata", hoursAgo: 150 },
      { status: "zavrsena", hoursAgo: 120 },
    ],
  },
  {
    hoursAgo: 100,
    status: "otkazana",
    paymentMethod: "pouzecem",
    paymentStatus: "nije_potrebno",
    customer: {
      name: "Nevena Ristić",
      phone: 9,
      email: `nevena.ristic@${DEMO_EMAIL_DOMAIN}`,
      address: "Gandijeva 76a",
      city: "Beograd",
      postalCode: "11070",
    },
    lines: [{ slug: "kiss-the-bride", qty: 1 }],
    history: [
      { status: "nova", hoursAgo: 100 },
      { status: "otkazana", hoursAgo: 92, note: "Kupac se predomislio." },
    ],
  },
];

/* =====================================================================
 * Poruke sa kontakt forme
 * ===================================================================== */

const DEMO_INQUIRIES = [
  {
    name: "Tijana Lukić",
    email: `tijana.lukic@${DEMO_EMAIL_DOMAIN}`,
    message:
      "Dobar dan, da li radite trajni lak i na nogama i koliko to traje? Htela bih u subotu ujutru ako ima mesta.",
    status: "nova" as const,
    hoursAgo: 5,
  },
  {
    name: "Milan Đukić",
    email: `milan.djukic@${DEMO_EMAIL_DOMAIN}`,
    message: "Zanima me poklon vaučer za depilaciju — da li može da se kupi u lokalu i koliko dugo važi?",
    status: "odgovorena" as const,
    hoursAgo: 52,
  },
];

/* =====================================================================
 * Brisanje
 * ===================================================================== */

type ClearResult = {
  bookings: number;
  orders: number;
  users: number;
  redemptions: number;
  inquiries: number;
};

async function clearDemo(ctx: MutationCtx): Promise<ClearResult> {
  const result: ClearResult = { bookings: 0, orders: 0, users: 0, redemptions: 0, inquiries: 0 };
  // „~" je iznad svake cifre u ASCII poretku, pa opseg hvata ceo prefiks.
  const upper = `${DEMO_PHONE_PREFIX}~`;

  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_phone", (q) => q.gte("phone", DEMO_PHONE_PREFIX).lt("phone", upper))
    .collect();
  for (const b of bookings) {
    await ctx.db.delete(b._id);
    result.bookings++;
  }

  const orders = await ctx.db
    .query("orders")
    .withIndex("by_phone", (q) => q.gte("customer.phone", DEMO_PHONE_PREFIX).lt("customer.phone", upper))
    .collect();
  for (const o of orders) {
    await ctx.db.delete(o._id);
    result.orders++;
  }

  const inquiries = await ctx.db.query("inquiries").collect();
  for (const i of inquiries) {
    if (!isDemoEmail(i.email)) continue;
    await ctx.db.delete(i._id);
    result.inquiries++;
  }

  // Nalozi na demo domenu — i njihova loyalty istorija, da ne ostane siroče.
  const users = await ctx.db.query("users").collect();
  for (const u of users) {
    if (!isDemoEmail(u.email)) continue;
    const redemptions = await ctx.db
      .query("loyaltyRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", u._id))
      .collect();
    for (const r of redemptions) {
      await ctx.db.delete(r._id);
      result.redemptions++;
    }
    await ctx.db.delete(u._id);
    result.users++;
  }

  return result;
}

/* =====================================================================
 * Upis
 * ===================================================================== */

export const run = internalMutation({
  args: {},
  returns: v.object({
    core: v.object({
      locations: v.number(),
      capacities: v.number(),
      schedules: v.number(),
      services: v.number(),
      settings: v.boolean(),
    }),
    shop: v.object({ categories: v.number(), products: v.number() }),
    bookings: v.number(),
    orders: v.number(),
    members: v.number(),
    redemptions: v.number(),
    inquiries: v.number(),
    week: v.string(),
  }),
  handler: async (ctx) => {
    const core = await seedCore(ctx);
    const shop = await seedShopCore(ctx);

    // Idempotencija: prethodni demo prvo ode, pa se upiše nov po današnjem datumu.
    await clearDemo(ctx);

    const now = Date.now();
    const monday = startOfWeek(belgradeNow(now).date);

    /* --- Loyalty članovi ------------------------------------------------ */
    const memberIds: Id<"users">[] = [];
    let redemptions = 0;
    for (const m of DEMO_MEMBERS) {
      const userId = await ctx.db.insert("users", {
        name: m.name,
        email: m.email,
        phone: demoPhone(m.phone),
        role: "customer",
        loyaltyNumber: m.loyaltyNumber,
        createdAt: now - 180 * DAY_MS,
      });
      memberIds.push(userId);
      for (const r of m.redemptions) {
        await ctx.db.insert("loyaltyRedemptions", {
          userId,
          kind: r.kind,
          amountRsd: r.amountRsd,
          discountRsd: Math.round((r.amountRsd * 10) / 100),
          redeemedAt: now - r.daysAgo * DAY_MS,
        });
        redemptions++;
      }
    }

    /* --- Termini -------------------------------------------------------- */
    let bookings = 0;
    for (const b of DEMO_BOOKINGS) {
      const service = serviceByKey(b.serviceKey);
      if (!service) throw new Error(`seedDemo: nepoznata usluga "${b.serviceKey}"`);
      const resourceKey = serviceGroupByKey(service.group).resource;
      const startMin = toMin(b.at);
      await ctx.db.insert("bookings", {
        name: b.name,
        phone: demoPhone(b.phone),
        serviceKey: service.key,
        serviceTitle: service.title,
        durationMin: service.durationMin,
        locationKey: b.locationKey,
        resourceKey,
        date: addDays(monday, b.day),
        startMin,
        endMin: startMin + service.durationMin,
        note: b.note,
        status: b.status,
        createdAt: now - (bookings + 1) * 3 * HOUR_MS,
        decidedAt: b.status === "potvrdjen" ? now - (bookings + 1) * 2 * HOUR_MS : undefined,
        source: "web",
      });
      bookings++;
    }

    /* --- Porudžbine ----------------------------------------------------- */
    const shopConfig = await getShopConfig(ctx);
    let orders = 0;
    for (const o of DEMO_ORDERS) {
      const items: Doc<"orders">["items"] = [];
      const lines: CartLineInput[] = [];
      for (const line of o.lines) {
        const product = await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", line.slug))
          .first();
        if (!product) throw new Error(`seedDemo: nema proizvoda "${line.slug}" u bazi`);
        lines.push({ priceRsd: product.priceRsd, discountPercent: product.discountPercent, qty: line.qty });
        items.push({
          productId: product._id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          unitPriceRsd: product.priceRsd,
          discountPercent: product.discountPercent,
          qty: line.qty,
          // Ista aritmetika koju koristi pravi checkout — nijedna cena se ne kuca ručno.
          lineTotal: lineTotal(product.priceRsd, product.discountPercent, line.qty),
        });
      }

      const totals = cartTotals(lines, o.memberIndex !== undefined, shopConfig);

      const createdAt = now - o.hoursAgo * HOUR_MS;
      const orderNumber = await nextOrderNumber(ctx, createdAt);
      await ctx.db.insert("orders", {
        orderNumber,
        items,
        customer: {
          name: o.customer.name,
          phone: demoPhone(o.customer.phone),
          email: o.customer.email,
          address: o.customer.address,
          city: o.customer.city,
          postalCode: o.customer.postalCode,
          note: o.customer.note,
        },
        customerId: o.memberIndex === undefined ? undefined : memberIds[o.memberIndex],
        subtotalRsd: totals.subtotalRsd,
        loyaltyDiscountRsd: totals.loyaltyDiscountRsd,
        shippingRsd: totals.shippingRsd,
        totalRsd: totals.totalRsd,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt,
        updatedAt: now - o.history[o.history.length - 1].hoursAgo * HOUR_MS,
        statusHistory: o.history.map((h) => ({
          status: h.status,
          at: now - h.hoursAgo * HOUR_MS,
          note: h.note,
        })),
      });
      orders++;
    }

    /* --- Poruke --------------------------------------------------------- */
    let inquiries = 0;
    for (const i of DEMO_INQUIRIES) {
      await ctx.db.insert("inquiries", {
        name: i.name,
        email: i.email,
        message: i.message,
        status: i.status,
        createdAt: now - i.hoursAgo * HOUR_MS,
      });
      inquiries++;
    }

    return {
      core,
      shop,
      bookings,
      orders,
      members: memberIds.length,
      redemptions,
      inquiries,
      week: `${monday} … ${addDays(monday, 6)}`,
    };
  },
});

/**
 * Briše demo saobraćaj i ništa drugo. Katalog usluga i proizvoda, radno vreme i
 * podešavanja ostaju — to nije demo nego njen sadržaj.
 */
export const clear = internalMutation({
  args: {},
  returns: v.object({
    bookings: v.number(),
    orders: v.number(),
    users: v.number(),
    redemptions: v.number(),
    inquiries: v.number(),
  }),
  handler: async (ctx) => await clearDemo(ctx),
});
