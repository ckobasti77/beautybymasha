"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  addToCart,
  cartCount,
  parseCart,
  removeFromCart,
  setCartQty,
  type CartItem,
} from "./cart";

/**
 * Korpa kao spoljni store, ne kao React state.
 *
 * `localStorage` je spoljni sistem i React ima tačno jedan alat za njega:
 * `useSyncExternalStore`. Time nestaju i dva problema koja bi inače ostala —
 * prvi render se poklapa sa serverskim (prazna korpa), a druga otvorena kartica
 * istog sajta menja isti podatak i vraća ovu u red.
 *
 * U store-u su SAMO `slug` i količina. Cene računa server (`orders.quote`).
 */

const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();

/** Snapshot mora da bude referencijalno stabilan dok se podatak ne promeni. */
let cachedRaw: string | null = null;
let cached: CartItem[] = EMPTY;

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return cached;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseCart(raw);
  }
  return cached;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function write(items: CartItem[]): void {
  cached = items;
  cachedRaw = JSON.stringify(items);
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, cachedRaw);
  } catch {
    // Privatni režim ume da odbije upis. Korpa tada živi samo u ovoj kartici.
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_STORAGE_KEY) {
      cachedRaw = e.newValue;
      cached = parseCart(e.newValue);
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const serverSnapshot = () => EMPTY;

export type Cart = {
  items: CartItem[];
  count: number;
  /** `false` dok se `localStorage` ne pročita — do tada se broj u navigaciji ne crta. */
  hydrated: boolean;
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

export function useCart(): Cart {
  const items = useSyncExternalStore(subscribe, read, serverSnapshot);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const add = useCallback((slug: string, qty = 1) => write(addToCart(read(), slug, qty)), []);
  const setQty = useCallback((slug: string, qty: number) => write(setCartQty(read(), slug, qty)), []);
  const remove = useCallback((slug: string) => write(removeFromCart(read(), slug)), []);
  const clear = useCallback(() => write([]), []);

  return { items, count: cartCount(items), hydrated, add, setQty, remove, clear };
}
