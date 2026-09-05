import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { orderStatusValidator, paymentMethodValidator } from "./schema";
import { assertAdmin, assertSignedIn, currentUser, type Ctx } from "./lib/admin";
import { loyaltyStatusFor } from "./loyalty";
import { MESSAGES, validateEmail, validateName, validateNote, validatePhone, normalizePhone } from "./lib/validate";
import { isValidQty, MAX_QTY_PER_LINE, cartTotals, discountedUnitPrice } from "../lib/shop";
import { buildIpsPaymentDetails, isIpsConfigured } from "../lib/ips";
import { productShortName } from "../lib/ips-purpose";
import { belgradeNow } from "../lib/slots";

/**
 * Porudžbine webshopa.
 *
 * PRAVILO KOJE SE NE KRŠI: cenu računa server, iz baze. Klijent bira samo
 * `slug` i `qty`. Kad bi poslao i cenu, ona bi bila ignorisana — zato je ovde
 * i nema u argumentima. Isto važi za poštarinu i loyalty popust.
 */

export const ORDER_MESSAGES = {
  empty: "Korpa je prazna.",
  tooManyLines: "Korpa ima previše različitih proizvoda.",
  qty: `Količina po stavci mora biti ceo broj između 1 i ${MAX_QTY_PER_LINE}.`,
  unknownProduct: "Proizvod više nije u ponudi.",
  outOfStock: "Nema dovoljno na stanju.",
  address: "Upiši adresu za dostavu.",
  city: "Upiši grad.",
  postalCode: "Upiši poštanski broj (5 cifara).",
  emailRequired: "Upiši imejl — na njega stiže potvrda porudžbine.",
  notFound: "Porudžbina nije pronađena.",
  paymentUnavailable: "IPS plaćanje trenutno nije dostupno — izaberi pouzeće.",
  transition: "Promena statusa nije dozvoljena.",
} as const;

const MAX_LINES = 40;
const ORDER_RATE_LIMIT_MAX = 5;
const ORDER_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/* =====================================================================
 * Broj porudžbine
 * ===================================================================== */

/**
 * „BM-YYMM-NNNN" — brend, godina i mesec, pa redni broj u tom mesecu.
 * Čitljivo preko telefona i sortira se samo od sebe.
 *
 * Redni broj se čita sa indeksa `by_orderNumber`: poslednji broj sa istim
 * prefiksom + 1. Read i write padaju u isti opseg, pa Convex OCC sam ponavlja
 * mutaciju ako dve porudžbine stignu u istoj sekundi — dupli broj je nemoguć.
 */
export async function nextOrderNumber(ctx: Ctx, now: number): Promise<string> {
  const date = belgradeNow(now).date;
  const prefix = `BM-${date.slice(2, 4)}${date.slice(5, 7)}-`;
  const last = await ctx.db
    .query("orders")
    .withIndex("by_orderNumber", (q) => q.gte("orderNumber", prefix).lt("orderNumber", `${prefix}~`))
    .order("desc")
    .first();
  const seq = last ? Number.parseInt(last.orderNumber.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(Number.isFinite(seq) ? seq : 1).padStart(4, "0")}`;
}

/* =====================================================================
 * Validacija kupca
 * ===================================================================== */

const customerArgs = v.object({
  name: v.string(),
  phone: v.string(),
  email: v.string(),
  address: v.string(),
  city: v.string(),
  postalCode: v.string(),
  note: v.optional(v.string()),
});

function validateCustomer(raw: {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  note?: string;
}) {
  const email = validateEmail(raw.email);
  if (!email) throw new ConvexError(ORDER_MESSAGES.emailRequired);

  const address = raw.address.trim();
  if (address.length < 4 || address.length > 120) throw new ConvexError(ORDER_MESSAGES.address);
  const city = raw.city.trim();
  if (city.length < 2 || city.length > 60) throw new ConvexError(ORDER_MESSAGES.city);
  const postalCode = raw.postalCode.replace(/\s/g, "");
  if (!/^\d{5}$/.test(postalCode)) throw new ConvexError(ORDER_MESSAGES.postalCode);

  return {
    name: validateName(raw.name),
    phone: validatePhone(raw.phone),
    email,
    address,
    city,
    postalCode,
    note: validateNote(raw.note),
  };
}

async function assertOrderRateLimit(ctx: MutationCtx, phone: string, now: number): Promise<void> {
  const recent = await ctx.db
    .query("orders")
    .withIndex("by_phone", (q) => q.eq("customer.phone", phone))
    .order("desc")
    .filter((q) => q.gt(q.field("createdAt"), now - ORDER_RATE_LIMIT_WINDOW_MS))
    .take(ORDER_RATE_LIMIT_MAX);
  if (recent.length >= ORDER_RATE_LIMIT_MAX) throw new ConvexError(MESSAGES.rateLimit);
}

/* =====================================================================
 * Javno — nova porudžbina
 * ===================================================================== */

export const create = mutation({
  args: {
    // Namerno SAMO slug i količina. Cena, popust, poštarina i loyalty se
    // računaju na serveru iz baze; ono što klijent misli da košta ne ulazi ovde.
    items: v.array(v.object({ slug: v.string(), qty: v.number() })),
    customer: customerArgs,
    paymentMethod: paymentMethodValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    if (args.items.length === 0) throw new ConvexError(ORDER_MESSAGES.empty);
    if (args.items.length > MAX_LINES) throw new ConvexError(ORDER_MESSAGES.tooManyLines);

    const customer = validateCustomer(args.customer);
    await assertOrderRateLimit(ctx, customer.phone, now);

    if (args.paymentMethod === "ips" && !isIpsConfigured()) {
      throw new ConvexError(ORDER_MESSAGES.paymentUnavailable);
    }

    // Iste stavke u više redova se sabiraju pre provere stanja — inače bi
    // 2× po 5 komada prošlo i kad na stanju ima 6.
    const wanted = new Map<string, number>();
    for (const item of args.items) {
      if (!isValidQty(item.qty)) throw new ConvexError(ORDER_MESSAGES.qty);
      const total = (wanted.get(item.slug) ?? 0) + item.qty;
      if (!isValidQty(total)) throw new ConvexError(ORDER_MESSAGES.qty);
      wanted.set(item.slug, total);
    }

    const lines: {
      product: Doc<"products">;
      qty: number;
      unitPriceRsd: number;
      discountPercent: number;
      lineTotal: number;
    }[] = [];

    for (const [slug, qty] of wanted) {
      const product = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!product || !product.active) throw new ConvexError(`${ORDER_MESSAGES.unknownProduct} (${slug})`);
      if (product.stock < qty) throw new ConvexError(`${ORDER_MESSAGES.outOfStock} (${product.name})`);
      lines.push({
        product,
        qty,
        unitPriceRsd: product.priceRsd,
        discountPercent: product.discountPercent,
        lineTotal: discountedUnitPrice(product.priceRsd, product.discountPercent) * qty,
      });
    }

    // Loyalty: samo za prijavljenog člana koji stvarno ima neiskorišćen popust.
    const user = await currentUser(ctx);
    const loyalty = user ? await loyaltyStatusFor(ctx, user) : null;
    const loyaltyApplies = loyalty?.eligible === true;

    const totals = cartTotals(
      lines.map((l) => ({ priceRsd: l.unitPriceRsd, discountPercent: l.discountPercent, qty: l.qty })),
      loyaltyApplies,
    );
    const orderNumber = await nextOrderNumber(ctx, now);
    const paymentStatus = args.paymentMethod === "ips" ? "ceka_uplatu" : "nije_potrebno";
    const ips =
      args.paymentMethod === "ips"
        ? buildIpsPaymentDetails({
            amountRsd: totals.totalRsd,
            orderNumber,
            productShortNames: lines.map((l) => productShortName(l.product.name)),
          })
        : null;

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      items: lines.map((l) => ({
        productId: l.product._id,
        slug: l.product.slug,
        name: l.product.name,
        brand: l.product.brand,
        unitPriceRsd: l.unitPriceRsd,
        discountPercent: l.discountPercent,
        qty: l.qty,
        lineTotal: l.lineTotal,
      })),
      customer,
      customerId: user?._id,
      subtotalRsd: totals.subtotalRsd,
      loyaltyDiscountRsd: totals.loyaltyDiscountRsd,
      shippingRsd: totals.shippingRsd,
      totalRsd: totals.totalRsd,
      paymentMethod: args.paymentMethod,
      paymentStatus,
      paymentPurpose: ips?.purpose,
      paymentReference: ips?.reference,
      status: "nova",
      createdAt: now,
      updatedAt: now,
      statusHistory: [{ status: "nova", at: now }],
    });

    // Stanje se umanjuje u istoj transakciji kao i upis porudžbine — ili oboje
    // ili ništa. Bez toga bi dva istovremena kupca kupila poslednji komad.
    for (const l of lines) {
      await ctx.db.patch(l.product._id, { stock: l.product.stock - l.qty });
    }

    if (loyaltyApplies && user && totals.loyaltyDiscountRsd > 0) {
      await ctx.db.insert("loyaltyRedemptions", {
        userId: user._id,
        kind: "web",
        orderId,
        amountRsd: totals.subtotalRsd,
        discountRsd: totals.loyaltyDiscountRsd,
        redeemedAt: now,
      });
    }

    return {
      orderId,
      orderNumber,
      subtotalRsd: totals.subtotalRsd,
      loyaltyDiscountRsd: totals.loyaltyDiscountRsd,
      shippingRsd: totals.shippingRsd,
      totalRsd: totals.totalRsd,
      paymentMethod: args.paymentMethod,
      paymentStatus,
      ips,
    };
  },
});

/* =====================================================================
 * Javno — praćenje porudžbine
 * ===================================================================== */

/** Praćenje bez naloga: broj porudžbine + telefon sa kojim je poručeno. */
export const byNumber = query({
  args: { orderNumber: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber.trim().toUpperCase()))
      .first();
    // Pogrešan telefon i nepostojeća porudžbina daju isti odgovor — da se
    // brojevi porudžbina ne mogu nagađati.
    if (!order || order.customer.phone !== normalizePhone(args.phone)) return null;
    return publicOrder(order);
  },
});

/** „Moje porudžbine" — samo svoje, nikad tuđe. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await assertSignedIn(ctx);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(50);
    return orders.map(publicOrder);
  },
});

function publicOrder(order: Doc<"orders">) {
  const ips =
    order.paymentMethod === "ips"
      ? buildIpsPaymentDetails({
          amountRsd: order.totalRsd,
          orderNumber: order.orderNumber,
          productShortNames: order.items.map((i) => productShortName(i.name)),
          purpose: order.paymentPurpose,
          reference: order.paymentReference,
        })
      : null;
  return { ...order, ips };
}

/* =====================================================================
 * Admin
 * ===================================================================== */

export const list = query({
  args: {
    key: v.optional(v.string()),
    status: v.optional(orderStatusValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
    if (args.status) {
      return await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }
    return await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(limit);
  },
});

/** Iz „otkazana" se ne izlazi — roba je vraćena na stanje, put nazad nije isti dokument. */
const ALLOWED_FROM: Record<Doc<"orders">["status"], readonly Doc<"orders">["status"][]> = {
  nova: ["u_obradi", "poslata", "zavrsena", "otkazana"],
  u_obradi: ["poslata", "zavrsena", "otkazana"],
  poslata: ["zavrsena", "otkazana"],
  zavrsena: [],
  otkazana: [],
};

export const setStatus = mutation({
  args: {
    key: v.optional(v.string()),
    id: v.id("orders"),
    status: orderStatusValidator,
    note: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError(ORDER_MESSAGES.notFound);
    if (order.status === args.status) return null;
    if (!ALLOWED_FROM[order.status].includes(args.status)) throw new ConvexError(ORDER_MESSAGES.transition);

    const now = Date.now();
    if (args.status === "otkazana") {
      await restock(ctx, order);
      // Otkazana porudžbina ne sme da pojede loyalty popust — član ga dobija nazad.
      const redemptions = await ctx.db
        .query("loyaltyRedemptions")
        .withIndex("by_redeemedAt")
        .order("desc")
        .take(200);
      for (const r of redemptions) {
        if (r.orderId === order._id) await ctx.db.delete(r._id);
      }
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: now,
      statusHistory: [...order.statusHistory, { status: args.status, at: now, note: validateNote(args.note) }],
    });
    return null;
  },
});

async function restock(ctx: MutationCtx, order: Doc<"orders">): Promise<void> {
  for (const item of order.items) {
    const product = item.productId
      ? await ctx.db.get(item.productId)
      : await ctx.db
          .query("products")
          .withIndex("by_slug", (q) => q.eq("slug", item.slug))
          .first();
    if (product) await ctx.db.patch(product._id, { stock: product.stock + item.qty });
  }
}

/** Potvrda uplate po IPS nalogu — vlasnica je videla izvod. */
export const confirmPayment = mutation({
  args: { key: v.optional(v.string()), id: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const order = await ctx.db.get(args.id);
    if (!order) throw new ConvexError(ORDER_MESSAGES.notFound);
    await ctx.db.patch(args.id, { paymentStatus: "placeno", updatedAt: Date.now() });
    return null;
  },
});

/** Šta se prodaje, koliko i za koliko para. Otkazane porudžbine se ne broje. */
export const salesAnalytics = query({
  args: { key: v.optional(v.string()), sinceMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const since = args.sinceMs ?? 0;
    const orders = (await ctx.db.query("orders").withIndex("by_createdAt").order("desc").take(1000)).filter(
      (o) => o.createdAt >= since && o.status !== "otkazana",
    );

    type Row = {
      slug: string;
      name: string;
      soldQty: number;
      revenueRsd: number;
      ordersCount: number;
      lastSoldAt: number;
      currentStock: number;
    };
    const rows = new Map<string, Row>();
    let itemsCount = 0;
    let revenueRsd = 0;

    for (const order of orders) {
      revenueRsd += order.subtotalRsd - order.loyaltyDiscountRsd;
      for (const item of order.items) {
        itemsCount += item.qty;
        const row = rows.get(item.slug) ?? {
          slug: item.slug,
          name: item.name,
          soldQty: 0,
          revenueRsd: 0,
          ordersCount: 0,
          lastSoldAt: 0,
          currentStock: 0,
        };
        row.soldQty += item.qty;
        row.revenueRsd += item.lineTotal;
        row.ordersCount += 1;
        row.lastSoldAt = Math.max(row.lastSoldAt, order.createdAt);
        rows.set(item.slug, row);
      }
    }

    for (const row of rows.values()) {
      const product = await ctx.db
        .query("products")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .first();
      row.currentStock = product?.stock ?? 0;
    }

    return {
      summary: {
        ordersCount: orders.length,
        itemsCount,
        revenueRsd,
        uniqueProducts: rows.size,
      },
      products: [...rows.values()].sort((a, b) => b.soldQty - a.soldQty || b.revenueRsd - a.revenueRsd),
    };
  },
});

/** Broj novih porudžbina — bedž u panelu. */
export const countNew = query({
  args: { key: v.optional(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "nova"))
      .take(200);
    return rows.length;
  },
});
