"use client";

import { useSyncExternalStore } from "react";

/**
 * Napredak hero zone kao spoljni store (spec 13 → B): `Hero.tsx` ga puni iz `onUpdate` /
 * `onRefresh` svog ScrollTrigger-a, navigacija ga čita za frost i za pravilo „nikad sakrivena
 * dok je hero u kadru". Strane bez heroja ne dolaze ovde — prosleđuju `alwaysSolid`.
 *
 * Podrazumevano `p = 0` (ne 1): server i prva hidratacija landinga tada vide isto (providna
 * traka), bez bljeska frosta. Hookovi vraćaju BOOLEAN — `set({ p })` stiže na svaki frejm
 * skrola, a React re-renderuje samo kad se izvedena vrednost promeni.
 */

export type HeroProgress = {
  /** 0 = vrh sekcije na vrhu kadra, 1 = hero izašao. */
  readonly p: number;
  /** Uhvaćena boja tečnosti (`#RRGGBB`) ili null dok ciklus teče. */
  readonly color: string | null;
};

/** Od ovog napretka traka dobija glass (tačno kad wordmark sleti u slot). */
export const HERO_FROST_P = 0.3;

const listeners = new Set<() => void>();
let state: HeroProgress = { p: 0, color: null };

export function getHeroProgress(): HeroProgress {
  return state;
}

export function setHeroProgress(next: Partial<HeroProgress>): void {
  const p = next.p ?? state.p;
  const color = next.color === undefined ? state.color : next.color;
  if (p === state.p && color === state.color) return;
  state = { p, color };
  for (const listener of listeners) listener();
}

export function subscribeHeroProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useHeroFlag(alwaysSolid: boolean, test: (p: number) => boolean): boolean {
  return useSyncExternalStore(
    subscribeHeroProgress,
    () => alwaysSolid || test(state.p),
    () => alwaysSolid,
  );
}

/** Traka nosi `.nav-frost`: na landingu od p ≥ 0.30, na ostalim stranama uvek. */
export function useHeroFrost(alwaysSolid: boolean): boolean {
  return useHeroFlag(alwaysSolid, (p) => p >= HERO_FROST_P);
}

/** Hero je van kadra (senka trake, dozvola za sakrivanje). */
export function useHeroOut(alwaysSolid: boolean): boolean {
  return useHeroFlag(alwaysSolid, (p) => p >= 1);
}
