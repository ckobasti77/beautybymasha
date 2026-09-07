"use client";

import { useEffect, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Dve odluke koje deli svako WebGL platno na sajtu: smemo li uopšte, i crtamo li baš sada.
 *
 * KORAK 18 — ADR-005 se povlači. Do sada je pravilo bilo „nikad ispod 768 px": širina je
 * korišćena kao gruba zamena za snagu uređaja. To je i gasilo bočicu na telefonu koji je vozi bez
 * problema, i palilo je na slabom laptopu. Novi ugovor gleda SPOSOBNOST, ne širinu:
 *
 *  1. postoji `webgl2` kontekst,
 *  2. nije `prefers-reduced-motion`,
 *  3. uređaj prođe jeftin test: `deviceMemory >= 4` ILI `hardwareConcurrency >= 4`
 *     (polje kojeg nema se smatra prolaznim — Safari ne javlja `deviceMemory`),
 *  4. prvi frejm se iscrta ispod `FIRST_FRAME_BUDGET_MS` (meri se oko `gl.finish()` na
 *     probnom platnu 64×64).
 *
 * Širina i dalje odlučuje KOLIKO se troši (`useMobileBudget`), ne DA LI se crta. Poslednja
 * odbrana je merenje u radu: `components/hero/Hero.tsx` gasi platno ako prosek frejma u prve
 * dve sekunde pređe budžet (razlog u `window.__bbmHero.downgrade`).
 */

/** Prvi frejm probe iznad ovoga = uređaj ne vuče shader. */
export const FIRST_FRAME_BUDGET_MS = 120;
/** Prosek frejma u prve 2 s iznad ovoga = pad na `HeroDrop` (spec 18 → A). */
export const FRAME_BUDGET_MS = 26;
/** Koliko dugo se meri prosek frejma po montiranju platna. */
export const FRAME_SAMPLE_MS = 2000;

export type WebGLDecision = {
  /** Smemo li da montiramo platno. */
  readonly allowed: boolean;
  /** Da li je odluka uopšte doneta (pre prvog efekta je `false` — tada ni fallback ne montiraj). */
  readonly decided: boolean;
};

type DeviceNavigator = Navigator & { deviceMemory?: number };

/** Test sposobnosti se radi jednom po strani — rezultat se ne menja bez reload-a. */
let probe: boolean | null = null;

/** Zašto je platno odbijeno (dev, `window.__bbmHero.downgrade`). */
export let webglRejection: string | null = null;

function probeDevice(): boolean {
  if (probe !== null) return probe;

  const nav = navigator as DeviceNavigator;
  const memory = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;
  // „Ako polja nema, smatra se da prolazi" — pa je uslov ILI nad dva blaga testa.
  const capable = (memory === undefined || memory >= 4) || (cores === undefined || cores >= 4);
  if (!capable) {
    webglRejection = `slab uređaj (deviceMemory ${memory ?? "?"}, cores ${cores ?? "?"})`;
    probe = false;
    return probe;
  }

  let gl: WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    gl = canvas.getContext("webgl2");
  } catch {
    gl = null;
  }
  if (!gl) {
    webglRejection = "nema webgl2 konteksta";
    probe = false;
    return probe;
  }

  // Prvi frejm: obojiti i SAČEKATI da GPU zaista završi. Bez `finish()` merimo samo koliko
  // traje upis komande u red, a ne koliko uređaj crta.
  const start = performance.now();
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.finish();
  const elapsed = performance.now() - start;
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  probe = elapsed < FIRST_FRAME_BUDGET_MS;
  if (!probe) webglRejection = `prvi frejm ${elapsed.toFixed(1)} ms > ${FIRST_FRAME_BUDGET_MS} ms`;
  return probe;
}

/**
 * Sme li strana da pokrene WebGL. Prati `prefers-reduced-motion`, pa uključen „smanji kretanje"
 * gasi platno bez reload-a. `decided` razdvaja „još ne znamo" od „ne sme" — dok ne znamo se ne
 * montira ni platno ni njegov fallback, da CSS kap ne bljesne na uređaju koji vozi bočicu.
 */
export function useWebGLAllowed(): WebGLDecision {
  const [decision, setDecision] = useState<WebGLDecision>({ allowed: false, decided: false });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      if (reduced.matches) {
        webglRejection = "prefers-reduced-motion";
        setDecision({ allowed: false, decided: true });
        return;
      }
      setDecision({ allowed: probeDevice(), decided: true });
    };

    evaluate();
    reduced.addEventListener("change", evaluate);
    return () => reduced.removeEventListener("change", evaluate);
  }, []);

  return decision;
}

/**
 * Mobilni BUDŽET: uzak ekran ILI gruba kazaljka. Ne odlučuje DA LI se crta (to je
 * `useWebGLAllowed`), nego koliko se troši — `dpr`, antialias, oktave šuma, staklo bez
 * transmisije (spec 18 → A). Tablet u landscape-u prolazi ovuda: kazaljka je gruba, GPU je
 * skroman, ali kadar je širok — zato budžet i RASPORED nisu isti upit.
 */
export function useMobileBudget(): boolean {
  return useMediaQuery("(max-width: 767px), (pointer: coarse)");
}

/**
 * Mobilni RASPORED bočice: ispod 1024 px copy zauzima celu širinu (`lg:max-w-[calc(50vw-2rem)]`
 * važi tek od 1024), pa desna polovina kadra ne postoji. Tada bočica ide u donji pojas, manja i
 * centrirana (`lib/bottleScreen.ts` → „small"). Ista granica kao i pre koraka 18 — samo što se
 * sada ispod nje bočica CRTA umesto da je nema.
 */
export function useNarrowLayout(): boolean {
  return useMediaQuery("(max-width: 1023px)");
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
