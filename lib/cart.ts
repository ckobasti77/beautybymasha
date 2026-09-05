/**
 * Korpa — čist podatak, bez React-a i bez cena.
 *
 * U `localStorage` stoji SAMO spisak `{ slug, qty }`. Cene, popusti, poštarina i
 * loyalty stižu iz `orders.quote` (Convex), pa ih klijent ne može ni pomeriti ni
 * ustajati: kad se cena promeni u adminu, korpa je vidi pri sledećem otvaranju.
 */
import { MAX_QTY_PER_LINE } from "./shop";

export const CART_STORAGE_KEY = "bbm.korpa.v1";
export const MAX_CART_LINES = 40;

export type CartItem = { readonly slug: string; readonly qty: number };

function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1;
  return Math.min(MAX_QTY_PER_LINE, Math.max(1, Math.trunc(qty)));
}

/** Nepoznat sadržaj iz `localStorage` — sve što nije ispravna stavka ispada. */
export function parseCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: CartItem[] = [];
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;
    const { slug, qty } = entry as { slug?: unknown; qty?: unknown };
    if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(slug)) continue;
    if (typeof qty !== "number") continue;
    if (out.some((i) => i.slug === slug)) continue;
    out.push({ slug, qty: clampQty(qty) });
    if (out.length >= MAX_CART_LINES) break;
  }
  return out;
}

export function addToCart(items: readonly CartItem[], slug: string, qty = 1): CartItem[] {
  const existing = items.find((i) => i.slug === slug);
  if (existing) {
    return items.map((i) => (i.slug === slug ? { slug, qty: clampQty(i.qty + qty) } : i));
  }
  if (items.length >= MAX_CART_LINES) return [...items];
  return [...items, { slug, qty: clampQty(qty) }];
}

export function setCartQty(items: readonly CartItem[], slug: string, qty: number): CartItem[] {
  if (qty < 1) return removeFromCart(items, slug);
  return items.map((i) => (i.slug === slug ? { slug, qty: clampQty(qty) } : i));
}

export function removeFromCart(items: readonly CartItem[], slug: string): CartItem[] {
  return items.filter((i) => i.slug !== slug);
}

export function cartCount(items: readonly CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
