/**
 * Aritmetika korpe — JEDINO mesto gde se računa cena.
 *
 * Server (convex/orders.ts) i klijent (korpa, prompt 5) zovu iste funkcije, ali
 * server ih zove nad cenama iz baze. Ono što klijent pošalje kao cenu se baca:
 * klijent bira SAMO proizvod i količinu.
 *
 * BEZ React importa i BEZ `@/` aliasa — uvozi ga i Convex backend.
 */
import { site } from "./site";

export const MAX_DISCOUNT_PERCENT = 90;
export const MAX_QTY_PER_LINE = 20;

/** Cena jednog komada posle popusta na sam proizvod. Zaokružuje se na ceo dinar. */
export function discountedUnitPrice(priceRsd: number, discountPercent: number): number {
  const percent = clampDiscount(discountPercent);
  if (percent === 0) return Math.round(priceRsd);
  return Math.round((priceRsd * (100 - percent)) / 100);
}

export function clampDiscount(discountPercent: number): number {
  if (!Number.isFinite(discountPercent)) return 0;
  return Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Math.round(discountPercent)));
}

export function lineTotal(priceRsd: number, discountPercent: number, qty: number): number {
  return discountedUnitPrice(priceRsd, discountPercent) * qty;
}

/** Poštarina: fiksna, besplatna preko praga. Prag se meri po zbiru robe. */
export function shippingFor(subtotalRsd: number): number {
  if (subtotalRsd <= 0) return 0;
  return subtotalRsd >= site.shipping.freeOverRsd ? 0 : site.shipping.flatRsd;
}

/** Loyalty popust ide na robu, ne na poštarinu. */
export function loyaltyDiscountFor(subtotalRsd: number, applies: boolean): number {
  if (!applies || subtotalRsd <= 0) return 0;
  return Math.round((subtotalRsd * site.loyalty.discountPercent) / 100);
}

export type CartLineInput = {
  readonly priceRsd: number;
  readonly discountPercent: number;
  readonly qty: number;
};

export type CartTotals = {
  readonly subtotalRsd: number;
  readonly loyaltyDiscountRsd: number;
  readonly shippingRsd: number;
  readonly totalRsd: number;
};

/**
 * Redosled je namerno ovakav: roba → loyalty popust → poštarina po zbiru robe
 * PRE popusta. Prag za besplatnu dostavu se ne gubi zato što je član ostvario 10%.
 */
export function cartTotals(lines: readonly CartLineInput[], loyaltyApplies: boolean): CartTotals {
  const subtotalRsd = lines.reduce((sum, l) => sum + lineTotal(l.priceRsd, l.discountPercent, l.qty), 0);
  const loyaltyDiscountRsd = loyaltyDiscountFor(subtotalRsd, loyaltyApplies);
  const shippingRsd = shippingFor(subtotalRsd);
  return {
    subtotalRsd,
    loyaltyDiscountRsd,
    shippingRsd,
    totalRsd: subtotalRsd - loyaltyDiscountRsd + shippingRsd,
  };
}

/** Ispravna količina po stavci: ceo broj 1…20. Sve ostalo je greška, ne tiho popravljanje. */
export function isValidQty(qty: number): boolean {
  return Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY_PER_LINE;
}
