"use client";

import { useEffect, useState } from "react";

/**
 * Dve odluke koje deli svako WebGL platno na sajtu (ADR-005):
 * smemo li uopšte, i crtamo li baš sada.
 *
 * Bile su lokalne u `components/hero/Hero.tsx`. Kad je stigla i 3D bočica
 * (`components/three/`), druga kopija istog pravila bi značila da se „nikad na
 * mobilnom" jednog dana promeni na jednom mestu a na drugom ne. Pravilo je jedno.
 */

/**
 * Sme li strana da pokrene WebGL: WebGL2, širina preko 768 px i bez
 * `prefers-reduced-motion`. Sva tri uslova moraju da prođu. Prati promene, pa
 * rotacija telefona ili uključen „smanji kretanje" gase platno bez reload-a.
 */
export function useWebGLAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const small = window.matchMedia("(max-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      if (small.matches || reduced.matches) {
        setAllowed(false);
        return;
      }
      let supported = false;
      try {
        supported = Boolean(
          document.createElement("canvas").getContext("webgl2"),
        );
      } catch {
        supported = false;
      }
      setAllowed(supported);
    };

    evaluate();
    small.addEventListener("change", evaluate);
    reduced.addEventListener("change", evaluate);
    return () => {
      small.removeEventListener("change", evaluate);
      reduced.removeEventListener("change", evaluate);
    };
  }, []);

  return allowed;
}

/**
 * Crta li platno uopšte: element mora biti u kadru i tab vidljiv. Van toga
 * `frameloop` ide na `demand` i GPU miruje.
 */
export function useCanvasActive(
  ref: React.RefObject<HTMLElement | null>,
  enabled: boolean,
): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setActive(false);
      return;
    }
    let inView = true;
    const sync = () =>
      setActive(inView && document.visibilityState === "visible");

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ref, enabled]);

  return active;
}
