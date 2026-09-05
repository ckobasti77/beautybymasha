"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * `false` na serveru i pri prvom klijentskom renderu, `true` posle hidratacije.
 *
 * Za sve što zavisi od `localStorage`, `window` ili portala: bez ovoga se SSR
 * i prvi klijentski render raziđu, pa React baci hidratacionu grešku ili
 * sadržaj bljesne pa nestane.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
