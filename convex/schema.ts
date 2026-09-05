import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { type Infer, v } from "convex/values";
import type { LocationKey, PaymentMethod, ResourceKey } from "../lib/site";
import type { ServiceGroupKey } from "../lib/services";
import type { Brand, ColorFamily, Finish, ProductCategoryKey } from "../lib/products";

/**
 * Model: lokacija × resurs × kapacitet.
 *
 * Lokacija = jedan od dva lokala u Belvilleu (različito radno vreme).
 * Resurs = grupa mesta koja rade paralelno („nokti", „kozmetika", „masaza").
 * Kapacitet = koliko ljudi istovremeno radi taj resurs u tom lokalu.
 *
 * Zato termin u masaži ne dodiruje termin u noktima, a tri manikira u 10:00
 * prolaze kad je kapacitet noktiju 3.
 */
export const locationKeyValidator = v.union(v.literal("ljubicica"), v.literal("mimoza"));

export const resourceKeyValidator = v.union(v.literal("nokti"), v.literal("kozmetika"), v.literal("masaza"));

export const serviceGroupKeyValidator = v.union(
  v.literal("nega-ruku"),
  v.literal("nega-nogu"),
  v.literal("depilacija-vosak-z"),
  v.literal("depilacija-vosak-m"),
  v.literal("depilacija-pasta-z"),
  v.literal("depilacija-pasta-m"),
  v.literal("masaza"),
  v.literal("trepavice-obrve"),
  v.literal("ostalo"),
);

export const productCategoryKeyValidator = v.union(
  v.literal("lakovi"),
  v.literal("baze-nadlakovi"),
  v.literal("nega"),
  v.literal("gel-lak"),
);

export const brandValidator = v.union(v.literal("orly"), v.literal("entity"));

export const finishValidator = v.union(
  v.literal("creme"),
  v.literal("shimmer"),
  v.literal("glitter"),
  v.literal("holo"),
  v.literal("metallic"),
  v.literal("duochrome"),
  v.literal("sheer"),
  v.literal("base"),
  v.literal("top"),
  v.literal("treatment"),
);

export const colorFamilyValidator = v.union(
  v.literal("mint"),
  v.literal("roze"),
  v.literal("nude"),
  v.literal("crvena"),
  v.literal("ljubicasta"),
  v.literal("braon"),
  v.literal("zelena"),
  v.literal("crna"),
  v.literal("srebrna"),
  v.literal("multi"),
  v.literal("bezbojna"),
);

export const paymentMethodValidator = v.union(v.literal("pouzecem"), v.literal("ips"));

/**
 * Validatori iznad moraju da se poklapaju sa tipovima iz lib/site.ts,
 * lib/services.ts i lib/products.ts. Ako se lista tamo promeni, ovi tipovi
 * obore `tsc`.
 */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;
export type LocationKeysMatch = Expect<Same<LocationKey, Infer<typeof locationKeyValidator>>>;
export type ResourceKeysMatch = Expect<Same<ResourceKey, Infer<typeof resourceKeyValidator>>>;
export type ServiceGroupKeysMatch = Expect<Same<ServiceGroupKey, Infer<typeof serviceGroupKeyValidator>>>;
export type ProductCategoryKeysMatch = Expect<
  Same<ProductCategoryKey, Infer<typeof productCategoryKeyValidator>>
>;
export type BrandsMatch = Expect<Same<Brand, Infer<typeof brandValidator>>>;
export type FinishesMatch = Expect<Same<Finish, Infer<typeof finishValidator>>>;
export type ColorFamiliesMatch = Expect<Same<ColorFamily, Infer<typeof colorFamilyValidator>>>;
export type PaymentMethodsMatch = Expect<Same<PaymentMethod, Infer<typeof paymentMethodValidator>>>;

export const statusValidator = v.union(
  v.literal("nov"),
  v.literal("potvrdjen"),
  v.literal("otkazan"),
  v.literal("odbijen"),
);
export const sourceValidator = v.union(v.literal("web"), v.literal("admin"));

export const roleValidator = v.union(v.literal("admin"), v.literal("staff"), v.literal("customer"));

export const orderStatusValidator = v.union(
  v.literal("nova"),
  v.literal("u_obradi"),
  v.literal("poslata"),
  v.literal("zavrsena"),
  v.literal("otkazana"),
);

/** `nije_potrebno` je pouzeće — nema šta da se čeka pre slanja. */
export const paymentStatusValidator = v.union(
  v.literal("nije_potrebno"),
  v.literal("ceka_uplatu"),
  v.literal("placeno"),
);

export const inquiryStatusValidator = v.union(
  v.literal("nova"),
  v.literal("procitana"),
  v.literal("odgovorena"),
);

export const redemptionKindValidator = v.union(v.literal("web"), v.literal("salon"));
export const overrideKindValidator = v.union(v.literal("off"), v.literal("custom"));

export const rangeValidator = v.object({ startMin: v.number(), endMin: v.number() });

export default defineSchema({
  /* ===================================================================
   * Nalozi (Convex Auth) — ADR-003
   * =================================================================== */

  // authSessions, authAccounts, authRefreshTokens, authVerificationCodes,
  // authVerifiers, authRateLimits — @convex-dev/auth ih drži sam.
  // `users` odmah ispod namerno gazi verziju iz `authTables`.
  ...authTables,

  /**
   * Isti nalog za kupca i za vlasnicu — razlika je `role` (ADR-003).
   *
   * Prvih sedam polja su tačno ono što @convex-dev/auth upisuje; indeksi
   * `email` i `phone` moraju da zadrže baš ta imena jer ih biblioteka traži.
   * `role`, `loyaltyNumber` i `createdAt` su opcioni zato što auth prvo ubaci
   * dokument, a `callbacks.afterUserCreatedOrUpdated` ih dopiše odmah zatim.
   */
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(roleValidator),
    /** Broj članske kartice „BM" + 6 cifara. Jedini sadržaj QR koda (ADR-004). */
    loyaltyNumber: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_loyaltyNumber", ["loyaltyNumber"])
    .index("by_role", ["role"]),

  /**
   * Istorija iskorišćenih loyalty popusta — i sa sajta i iz salona.
   * Bez nje se ne zna da li član sme ponovo (vidi `computeLoyaltyEligibility`).
   */
  loyaltyRedemptions: defineTable({
    userId: v.id("users"),
    kind: redemptionKindValidator,
    orderId: v.optional(v.id("orders")),
    bookingId: v.optional(v.id("bookings")),
    /** Osnovica na koju je popust primenjen. */
    amountRsd: v.number(),
    discountRsd: v.number(),
    redeemedAt: v.number(),
    /** Radnica koja je skenirala karticu u salonu; prazno kad je popust pao sam na webu. */
    redeemedBy: v.optional(v.id("users")),
  })
    .index("by_user", ["userId"])
    .index("by_redeemedAt", ["redeemedAt"]),

  /* ===================================================================
   * Shop — ADR-002
   * =================================================================== */

  productCategories: defineTable({
    key: productCategoryKeyValidator,
    title: v.string(),
    order: v.number(),
  }).index("by_key", ["key"]),

  /**
   * Katalog webshopa. `sku` je ključ za CSV/XLSX uvoz (`products.bulkUpsert`) —
   * po njemu se uparuje ono što vlasnica pošalje sa onim što već stoji u bazi.
   *
   * Slika ima dva izvora: `imagePath` je AVIF iz `public/` (ono što je skinuto
   * skriptom), `storageImageIds` su fotografije koje ona sama uploaduje kroz
   * admin. Uploadovane imaju prednost pri prikazu.
   */
  products: defineTable({
    slug: v.string(),
    sku: v.string(),
    name: v.string(),
    brand: brandValidator,
    categoryKey: productCategoryKeyValidator,
    /** Cena bez popusta, u celim dinarima. */
    priceRsd: v.number(),
    /** 0–90. Popust na sam proizvod, nezavisan od loyalty popusta. */
    discountPercent: v.number(),
    /** Swatch boja `#RRGGBB`. */
    hex: v.string(),
    finish: finishValidator,
    family: colorFamilyValidator,
    description: v.string(),
    /** Bez fotografije — kartica prikazuje samo swatch krug. */
    swatchOnly: v.boolean(),
    /** Lokalna AVIF putanja u `public/`, ili `null`. */
    imagePath: v.union(v.string(), v.null()),
    storageImageIds: v.array(v.id("_storage")),
    stock: v.number(),
    bestseller: v.boolean(),
    /** Sklonjen sa sajta, ali ostaje u bazi zbog istorije porudžbina. */
    active: v.boolean(),
    order: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["categoryKey"])
    .index("by_brand", ["brand"])
    .index("by_sku", ["sku"]),

  /**
   * Porudžbina je SNIMAK, ne pokazivač: naziv, cena i popust se upisuju u
   * `items` u trenutku kupovine. Kad se katalog kasnije promeni, račun iz
   * prošlog meseca i dalje pokazuje ono što je tada plaćeno.
   *
   * Sve cene ovde računa server iz baze (`convex/orders.ts`) — klijentske
   * cene se ignorišu.
   */
  orders: defineTable({
    /** Čitljiv broj koji kupac diktira telefonom, npr. „BM-2609-0042". */
    orderNumber: v.string(),
    items: v.array(
      v.object({
        productId: v.optional(v.id("products")),
        slug: v.string(),
        name: v.string(),
        brand: brandValidator,
        unitPriceRsd: v.number(),
        discountPercent: v.number(),
        qty: v.number(),
        lineTotal: v.number(),
      }),
    ),
    customer: v.object({
      name: v.string(),
      phone: v.string(),
      email: v.string(),
      address: v.string(),
      city: v.string(),
      postalCode: v.string(),
      note: v.optional(v.string()),
    }),
    /** Ulogovan kupac; prazno za goste. */
    customerId: v.optional(v.id("users")),
    subtotalRsd: v.number(),
    loyaltyDiscountRsd: v.number(),
    shippingRsd: v.number(),
    totalRsd: v.number(),
    paymentMethod: paymentMethodValidator,
    paymentStatus: paymentStatusValidator,
    /** Svrha uplate i poziv na broj za IPS nalog; prazno kod pouzeća. */
    paymentPurpose: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    status: orderStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
    statusHistory: v.array(
      v.object({ status: orderStatusValidator, at: v.number(), note: v.optional(v.string()) }),
    ),
  })
    .index("by_orderNumber", ["orderNumber"])
    .index("by_status", ["status"])
    .index("by_customer", ["customerId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_phone", ["customer.phone"]),

  /** Kontakt forma sa sajta. */
  inquiries: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    status: inquiryStatusValidator,
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  /* ===================================================================
   * Zakazivanje — korak 02
   * =================================================================== */

  locations: defineTable({
    key: locationKeyValidator,
    name: v.string(),
    active: v.boolean(),
    order: v.number(),
  }).index("by_key", ["key"]),

  /** Koliko ljudi istovremeno radi jedan resurs u jednom lokalu. */
  capacities: defineTable({
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    count: v.number(),
  }).index("by_location", ["locationKey"]),

  /** Nedeljno radno vreme lokala. Više redova za isti dan = podeljena smena. */
  schedules: defineTable({
    locationKey: locationKeyValidator,
    /** 0 = nedelja … 6 = subota */
    weekday: v.number(),
    startMin: v.number(),
    endMin: v.number(),
  }).index("by_location_weekday", ["locationKey", "weekday"]),

  /** Izuzetak za datum: neradni dan ili posebno radno vreme. Ima prednost nad `schedules`. */
  scheduleOverrides: defineTable({
    locationKey: locationKeyValidator,
    /** YYYY-MM-DD */
    date: v.string(),
    kind: overrideKindValidator,
    startMin: v.optional(v.number()),
    endMin: v.optional(v.number()),
    note: v.optional(v.string()),
  })
    .index("by_location_date", ["locationKey", "date"])
    .index("by_date", ["date"]),

  /** Pauze / blokirano vreme jednog resursa u jednom lokalu. Gase termin bez obzira na kapacitet. */
  blocks: defineTable({
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    date: v.string(),
    startMin: v.number(),
    endMin: v.number(),
    reason: v.optional(v.string()),
  }).index("by_location_date", ["locationKey", "date"]),

  /**
   * Ceo katalog usluga živi u bazi, ne u kodu: 144 stavke koje vlasnica sama
   * dodaje i menja kroz admin. `priceRsd: null` = stavka bez cene ([POTVRDITI]).
   * Cene su verbatim iz cenovnika; trajanja su procena i menjaju se u adminu.
   */
  services: defineTable({
    key: v.string(),
    groupKey: serviceGroupKeyValidator,
    title: v.string(),
    durationMin: v.number(),
    priceRsd: v.union(v.number(), v.null()),
    /** Može li gost sam da zakaže (dodaci i paketi ne mogu). */
    bookable: v.boolean(),
    /** Dodatak uz glavnu uslugu (french, nail art…). */
    addon: v.boolean(),
    /** Sklonjena sa sajta; admin je i dalje može ručno upisati. */
    hidden: v.boolean(),
    order: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_group", ["groupKey"]),

  bookings: defineTable({
    name: v.string(),
    /** Normalizovan broj (bez razmaka/crtica); prazan string za ručne termine bez telefona. */
    phone: v.string(),
    email: v.optional(v.string()),
    serviceKey: v.string(),
    /** Naslov usluge u trenutku zahteva — istorija ostaje čitljiva i kad se katalog promeni. */
    serviceTitle: v.string(),
    durationMin: v.number(),
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    /** YYYY-MM-DD */
    date: v.string(),
    startMin: v.number(),
    endMin: v.number(),
    note: v.optional(v.string()),
    status: statusValidator,
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
    source: sourceValidator,
    /** Loyalty član koji je zakazao; prazno za goste. Popunjava ga prompt 3 (Convex Auth). */
    customerId: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_phone", ["phone"])
    .index("by_location_date", ["locationKey", "date"])
    .index("by_date", ["date"])
    .index("by_createdAt", ["createdAt"])
    // Ovaj indeks nosi proveru kapaciteta: sva zauzeća jednog resursa,
    // u jednom lokalu, jednog dana — u jednom čitanju.
    .index("by_location_resource_date", ["locationKey", "resourceKey", "date"]),

  /** Jedan dokument. */
  settings: defineTable({
    slotStepMin: v.number(),
    leadTimeMin: v.number(),
    horizonDays: v.number(),
    holdHours: v.number(),
    /** Postavlja se kad vlasnica prvi put sačuva radno vreme (skriva baner „Podesi radno vreme"). */
    hoursConfirmed: v.optional(v.boolean()),
  }),
});
