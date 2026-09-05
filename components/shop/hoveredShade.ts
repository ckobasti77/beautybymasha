"use client";

import { useSyncExternalStore } from "react";

/**
 * Nijansa nad kojom je pokazivač na zidu swatch-eva.
 *
 * Spoljni store, ne React state, iz jednog razloga: zid (`ShopWall`) i bočica u
 * zaglavlju (`ShopHeroBottle`) su dva brata u stablu, a podizanje state-a bi
 * značilo da se ceo katalog od 70 kartica ponovo renderuje na svaki prelaz mišem.
 * Ovako se osvežava samo onaj ko sluša.
 */

const listeners = new Set<() => void>();
let hovered: string | null = null;

/** `null` vraća bočicu na podrazumevanu nijansu. */
export function setHoveredShade(hex: string | null): void {
  if (hex === hovered) return;
  hovered = hex;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHoveredShade(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => hovered,
    () => null,
  );
}
