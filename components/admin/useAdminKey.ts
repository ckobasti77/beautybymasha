"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Rezervni `ADMIN_KEY` — isti ugovor kao u convex/lib/admin.ts: važi SAMO dok u
 * bazi ne postoji nijedan admin nalog. Postoji zato što bi prazna baza inače
 * bila zaključana spolja (panel traži admin nalog, a nalog se pravi kroz panel).
 *
 * Čim se prvi admin nalog napravi, ključ prestaje da važi na serveru i panel
 * traži pravu prijavu — ovde se onda samo briše.
 */

const STORAGE_KEY = "bm-admin-key";

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function useAdminKey(): { key: string; setKey: (next: string) => void } {
  const key = useSyncExternalStore(subscribe, read, () => "");

  const setKey = useCallback((next: string) => {
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Privatni režim bez localStorage — ključ tada važi samo za ovu stranu.
    }
    emit();
  }, []);

  return { key, setKey };
}
