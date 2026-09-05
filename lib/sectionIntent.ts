/**
 * Deep link ka dve sekcije landinga, bez reload-a i bez React-a:
 *
 *  - čarobnjak: `#zakazivanje?usluga=<key>` (spec 11) — cenovnik ga postavlja u URL
 *    (`history.replaceState`, bez novog unosa u istoriju) i šalje `bbm:book`;
 *    `BookingWizard` čita hash pri montiranju i sluša event.
 *  - cenovnik: `#cenovnik-<grupa>` — postojeći id-ovi naslova grupa (rade i bez JS-a,
 *    nema `?` u hash-u pa Lenis `anchors` ne upozorava), event `bbm:cenovnik`.
 *
 * `replaceState` prolazi kroz Next-ov patch (ACTION_RESTORE) i ne pomera skrol; skrol
 * radi onaj ko sluša, jer jedino on zna da li Lenis postoji i gde je naslov koraka.
 */
import { isServiceGroupKey, type ServiceGroupKey } from "./services";

export const BOOKING_SECTION_ID = "zakazivanje";
export const PRICE_SECTION_ID = "cenovnik";
export const BOOK_EVENT = "bbm:book";
export const PRICE_EVENT = "bbm:cenovnik";

export type BookDetail = { serviceKey: string };
export type PriceDetail = { group: ServiceGroupKey };

export function bookingHash(serviceKey: string): string {
  return `#${BOOKING_SECTION_ID}?usluga=${encodeURIComponent(serviceKey)}`;
}

/** `#zakazivanje?usluga=manikir` → "manikir"; sve drugo → null. */
export function parseBookingHash(hash: string): string | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const q = h.indexOf("?");
  if (q === -1) return null;
  if (h.slice(0, q) !== BOOKING_SECTION_ID) return null;
  const key = new URLSearchParams(h.slice(q + 1)).get("usluga")?.trim();
  return key ? key : null;
}

export function priceHash(group: ServiceGroupKey): string {
  return `#${PRICE_SECTION_ID}-${group}`;
}

/** `#cenovnik-masaza` → "masaza"; nepoznata grupa ili drugi hash → null. */
export function parsePriceHash(hash: string): ServiceGroupKey | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const prefix = `${PRICE_SECTION_ID}-`;
  if (!h.startsWith(prefix)) return null;
  const group = h.slice(prefix.length);
  return isServiceGroupKey(group) ? group : null;
}

function replaceHash(hash: string): void {
  if (typeof window === "undefined") return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}${hash}`);
}

/** Klik na „Zakažite" u cenovniku: URL dobija uslugu, čarobnjak dobija event. */
export function emitBooking(serviceKey: string): void {
  if (typeof window === "undefined") return;
  replaceHash(bookingHash(serviceKey));
  window.dispatchEvent(new CustomEvent<BookDetail>(BOOK_EVENT, { detail: { serviceKey } }));
}

/** Usluga promenjena u čarobnjaku dok URL već nosi deep link — URL prati izbor. */
export function syncBookingHash(serviceKey: string): void {
  if (typeof window === "undefined") return;
  if (parseBookingHash(window.location.hash) === null) return;
  replaceHash(bookingHash(serviceKey));
}

/** Posle poslatog zahteva ili „ispočetka": reload ne sme ponovo da izabere uslugu. */
export function clearBookingHash(): void {
  if (typeof window === "undefined") return;
  if (parseBookingHash(window.location.hash) === null) return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

/** Krug iz sekcije Usluge: URL dobija grupu, cenovnik dobija event. */
export function emitPriceGroup(group: ServiceGroupKey): void {
  if (typeof window === "undefined") return;
  replaceHash(priceHash(group));
  window.dispatchEvent(new CustomEvent<PriceDetail>(PRICE_EVENT, { detail: { group } }));
}
