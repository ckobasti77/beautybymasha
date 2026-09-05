"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * WAI-ARIA radio grupa sa roving tabindex-om: cela grupa je jedan tab-stop
 * (izabrana stavka, ili prva), a strelice, Home i End pomeraju fokus I biraju.
 * Portovano iz `_ref/colorcutchris/components/booking/useRovingRadio.ts`.
 *
 * Koriste je kartice lokala, kartice usluga i čipovi vremena. Nedeljna traka ima
 * svoju varijantu jer mora da preskoči neradne i popunjene dane.
 */
export function useRovingRadio<T extends HTMLElement>(
  count: number,
  selectedIndex: number,
  onMove: (index: number) => void,
) {
  const refs = useRef<(T | null)[]>([]);
  const rovingIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const setRef = (index: number) => (el: T | null) => {
    refs.current[index] = el;
  };

  const onKeyDown = (e: KeyboardEvent<T>, index: number) => {
    if (count === 0) return;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (index - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    if (next === null) return;
    e.preventDefault();
    onMove(next);
    refs.current[next]?.focus();
  };

  return { rovingIndex, setRef, onKeyDown };
}
