"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const LenisContext = createContext<RefObject<Lenis | null> | null>(null);

/**
 * Pristup Lenis instanci (npr. `useLenis().current?.scrollTo("#zakazivanje")`).
 * `current` je null pre mount-a i kad je uključen prefers-reduced-motion.
 */
export function useLenis() {
  const ref = useContext(LenisContext);
  if (!ref) throw new Error("useLenis mora biti unutar <SmoothScroll>");
  return ref;
}

/** Isto, ali vraća null van <SmoothScroll> (npr. admin bez Lenis-a). */
export function useOptionalLenis() {
  return useContext(LenisContext);
}

/**
 * Smooth scroll (Lenis) sinhronizovan sa GSAP ScrollTrigger-om.
 * - jedan RAF (gsap.ticker) pokreće i Lenis i GSAP → nema „drhtanja"
 * - poštuje prefers-reduced-motion (tada je nativni scroll)
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const instance = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.2,
      anchors: true,
    });

    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = instance;

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
