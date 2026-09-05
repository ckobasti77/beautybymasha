import { site } from "../../lib/site";

/**
 * PRAVILA LOYALTY PROGRAMA (ADR-004) — JEDNO MESTO.
 *
 * Kako smo ih razumeli:
 *   1. Registracija donosi pravo na 10% popusta na SLEDEĆI račun.
 *   2. Popust se troši jednom — i na sajtu i u salonu, svejedno.
 *   3. Posle trošenja član ponovo stiče pravo tek posle sledeće plaćene posete
 *      (završena porudžbina ili potvrđen termin nakon datuma trošenja).
 *
 * Tačna pravila su [POTVRDITI kod vlasnice] — koliko traje ciklus, da li se
 * računa termin ili račun, da li postoji minimalni iznos. Kad ih potvrdi,
 * menja se SAMO `computeLoyaltyEligibility`; sve ostalo je zove.
 */
export const LOYALTY_DISCOUNT_PERCENT = site.loyalty.discountPercent;

export type LoyaltyEligibilityInput = {
  /** Kad je nalog napravljen (ms). */
  readonly registeredAt: number;
  /** Vremena svih iskorišćenih popusta (ms), bilo kojim redosledom. */
  readonly redemptionsAt: readonly number[];
  /** Vremena plaćenih poseta: završene porudžbine i potvrđeni termini (ms). */
  readonly paidVisitsAt: readonly number[];
};

export type LoyaltyEligibility = {
  readonly eligible: boolean;
  readonly discountPercent: number;
  /** Zašto jeste ili nije — ide pravo u UI i u admin panel. */
  readonly reason: "prva-poseta" | "posle-posete" | "iskoriscen" | "nije-clan";
  readonly lastRedeemedAt: number | null;
  readonly redemptionsCount: number;
};

export function computeLoyaltyEligibility(input: LoyaltyEligibilityInput): LoyaltyEligibility {
  const discountPercent = LOYALTY_DISCOUNT_PERCENT;
  const redemptionsCount = input.redemptionsAt.length;
  const lastRedeemedAt = redemptionsCount > 0 ? Math.max(...input.redemptionsAt) : null;

  // Pravilo 1: nikad nije trošio — registracija mu je i dala pravo.
  if (lastRedeemedAt === null) {
    return {
      eligible: true,
      discountPercent,
      reason: "prva-poseta",
      lastRedeemedAt: null,
      redemptionsCount: 0,
    };
  }

  // Pravilo 3: ponovo stiče pravo tek posle plaćene posete koja je došla
  // POSLE poslednjeg trošenja. Sama registracija se više ne računa.
  const hasVisitSince = input.paidVisitsAt.some((at) => at > lastRedeemedAt);
  return {
    eligible: hasVisitSince,
    discountPercent,
    reason: hasVisitSince ? "posle-posete" : "iskoriscen",
    lastRedeemedAt,
    redemptionsCount,
  };
}

/** Popust koji član stvarno dobija na dati iznos. Zaokružuje se na ceo dinar. */
export function loyaltyDiscountRsd(amountRsd: number, discountPercent: number): number {
  if (amountRsd <= 0 || discountPercent <= 0) return 0;
  return Math.round((amountRsd * discountPercent) / 100);
}

/** „BM" + 6 cifara. Jedini sadržaj QR koda — ništa lično se ne kodira. */
export function formatLoyaltyNumber(digits: number): string {
  return `BM${String(Math.abs(Math.floor(digits)) % 1_000_000).padStart(6, "0")}`;
}

export function isLoyaltyNumber(value: string): boolean {
  return /^BM\d{6}$/.test(value);
}
