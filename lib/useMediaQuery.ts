"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * `matchMedia` kao React stanje, bez hidratacione greške: na serveru i pri prvom
 * klijentskom renderu je `false`, posle toga prati promene upita (rotacija, resize,
 * promena sistemske preference).
 *
 * Jedno mesto za sve komponente (hero bočica ≥ 1024 px, sheet desktop/mobilni…) — ista
 * logika na dva mesta bi se vremenom razišla.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
