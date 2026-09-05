"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LogoSignature, type SignatureIntro } from "@/components/brand/LogoSignature";
import { Button } from "@/components/ui/Button";
import { EASE_ENTER, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import {
  CAPTURE_P,
  EXIT,
  LOGO_SWAP_P,
  LOGO_SWAP_REDUCED_P,
  blockExitAt,
  copyReflowAt,
  heroChoreography,
  holdEndOf,
  logoSwap,
  pourCoverage,
  stageLag,
  stageTop,
  wordExitAt,
} from "@/lib/heroChoreography";
import { HERO_COLOR_STORAGE_KEY, HeroColorCycle, effectivePourHex, inkFor, mixHex } from "@/lib/heroColors";
import { setHeroProgress } from "@/lib/heroProgress";
import {
  SIG_ERASE,
  dotAt,
  eraseAt,
  eraseFrontAt,
  flyPoint,
  signatureProgress,
  writeAt,
  writeFrontAt,
  type Point,
} from "@/lib/logoSignature";
import { LETTERS_END, LETTER_COUNT, letterTravelAt, type Rect } from "@/lib/logoTravel";
import { palette } from "@/lib/palette";
import { revealWords } from "@/lib/textReveal";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useCanvasActive, useWebGLAllowed } from "@/lib/webgl";
import { HeroDrop, HeroPour } from "./HeroDrop";
import { HeroFallback } from "./HeroFallback";
import { HeroScrim } from "./HeroScrim";
import type { HeroDrivers } from "./heroDrivers";

/**
 * Hero „tečni lak" (docs/BRAND.md §6, docs/MOTION.md → Hero v3, spec 14).
 *
 * DVA SISTEMA, JASNO PODELJENA. Cela sekcija je `data-reveal="off"`, pa je site-wide
 * reč-po-reč prolaz ne dira. Dug koji time preuzimamo (docs/MOTION.md) vraćamo ovde:
 * naslov i uvod stižu reč po reč kroz `revealWords` iz `lib/textReveal.ts` — i ODLAZE reč po reč
 * (spanovi ostaju, `settle: false`), obrnutim redom, vozeni skrolom. Nikakav lokalni splitter.
 *
 * ZONA (spec 13 C): sekcija je 170 vh (mobilni 130 vh, reduced motion 100 vh) sa `sticky` stage-om
 * od 100 vh. Do HOLD_END = (H − vh) / H hero fizički miruje — bez pina, bez Flip-a, bez zaključavanja
 * skrola. JEDAN ScrollTrigger (`top top → bottom top`) daje `p`, a `apply(p)` je čista funkcija:
 * reload usred heroja daje isto stanje kao skrol do te tačke. Merenje ide u `onRefreshInit`
 * (transformi skinuti, copy vidljiv), `apply` i u `onRefresh`.
 *
 * KOREOGRAFIJA v3 (lib/heroChoreography.ts, lib/logoTravel.ts, lib/logoSignature.ts):
 *  - slova BEAUTY putuju POJEDINAČNO iz heroja u nav glif (0.06 + 0.015·i, bezier, overshoot);
 *    nav wordmark se sastavlja s leva na desno, nikad dva ista slova vidljiva;
 *  - potpis se briše (0.10–0.20) i ponovo piše u nav-u (0.24–0.36); tačka tinte jaše na frontu,
 *    leti 0.20–0.24 — živi u nav traci (`#nav-ink-dot`) da bude iznad frosta;
 *  - frost trake se pali iz slota `clip-path`-om (`--frost-clip` na `.nav-bar`, 0.30–0.42);
 *  - copy se preslaže u prostor wordmarka (0.12–0.36, po elementu), ništa ne bledi do 0.55, pa
 *    izlazi reč po reč (strip, lead, CTA, h1; 0.55–0.80), `hidden` od 0.85;
 *  - kontakt senku bočice na polici (`#hero-shelf-shadow` u `.hero-overlap`) vozi sama bočica
 *    (`HeroBottle`, lenji chunk) iz iste `bottleScreen` funkcije — DOM i three se ne mogu razići,
 *    a matematika bočice ne ulazi u početni JS;
 *  - stage zaostaje za stranom do 40 % visine (HOLD_END–1), `data-ink` po kontrastu razlivene boje.
 *
 * BOJE (spec 13 D): ciklus pet bestselera vozi gsap.ticker OVDE, za sve tri grane — 3D bočica
 * (≥ 1024), shader bez bočice (769–1023) i CSS kap (≤ 1023). Prvi pomak skrola hvata boju.
 *
 * WebGL se montira samo ako `useWebGLAllowed` (`lib/webgl.ts`) kaže da smemo. Mobilni nikad.
 * `HeroFallback` (svetla podloga) je UVEK ispod canvasa: dok lenji chunk stiže, podloga heroja ne
 * sme da bude tamna pozadina strane (siva mrlja vela u tamnoj temi, spec 14 C).
 */

declare global {
  interface Window {
    /** Samo u dev-u (provera D): trenutno stanje hero zone. */
    __bbmHero?: {
      readonly p: number;
      readonly pour: number;
      readonly color: string;
      readonly captured: string | null;
      readonly pourOrigin: { x: number; y: number };
      readonly letters: readonly { hero: number; nav: number; t: number }[];
      readonly signature: { erased: number; written: number; dot: { x: number; y: number; visible: boolean; phase: string } };
      readonly frostClip: number;
      readonly bottle: Record<string, number>;
    };
  }
}

const LiquidCanvas = dynamic(() => import("./LiquidCanvas"), { ssr: false });

/** Posle pauze (sakriven tab) prvi tik ticker-a nosi ceo razmak — ciklus ga ne preskače. */
const MAX_TICK_DT = 0.1;
/** Front razlivanja prebacuje ink kad ovoliko pokrije centar copy kolone. */
const INK_COVERAGE = 0.5;

type Uv = { x: number; y: number };
type Ctm = { a: number; b: number; c: number; d: number; e: number; f: number };

type Measure = {
  holdEnd: number;
  sectionHeight: number;
  stageHeight: number;
  aspect: number;
  copy: Uv;
  /** Koliko px DOM kap pada do dna stage-a. */
  dropFall: number;
  /** px po SVG jedinici hero wordmarka. */
  unit: number;
  heroGlyphs: Rect[];
  navGlyphs: Rect[];
  /** Gornji levi ugao bbox-a svakog hero glifa u njegovim SVG jedinicama (origin skale). */
  heroBox: { x: number; y: number }[];
  sigLengths: number[];
  heroCtm: Ctm | null;
  navCtm: Ctm | null;
  /** Rep hero „b" (px stage-a) i glava nav „b" (px trake) — krajevi leta tačke. */
  flyFrom: Point;
  flyTo: Point;
  /** Za koliko copy ide nagore: vrh copy-ja − vrh wordmarka (visina wordmarka + razmak). */
  copyShift: number;
};

function transformPoint(m: Ctm, x: number, y: number): Point {
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

function relativeCtm(el: SVGGraphicsElement, originX: number, originY: number): Ctm | null {
  const m = el.getScreenCTM();
  if (!m) return null;
  return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e - originX, f: m.f - originY };
}

/** Glifovi po indeksu (`data-glyph="b0".."b5"` / `"s0".."s6"`), sortirani. */
function glyphPaths(root: Element, prefix: "b" | "s"): SVGPathElement[] {
  return [...root.querySelectorAll<SVGPathElement>(`[data-glyph^="${prefix}"]`)].sort(
    (x, y) => Number(x.dataset.glyph?.slice(1)) - Number(y.dataset.glyph?.slice(1)),
  );
}

/** Piše samo na promenu — attribute i style setteri za SVG (bez GSAP-ovog SVG transform keša). */
function attrSetter(el: Element, name: string): (value: string) => void {
  let prev: string | null = null;
  return (value) => {
    if (value === prev) return;
    prev = value;
    if (value === "") el.removeAttribute(name);
    else el.setAttribute(name, value);
  };
}

function styleSetter(el: ElementCSSInlineStyle, prop: string): (value: string) => void {
  let prev: string | null = null;
  return (value) => {
    if (value === prev) return;
    prev = value;
    el.style.setProperty(prop, value);
  };
}

const f2 = (n: number) => n.toFixed(2);

export function Hero({ colors }: { colors: readonly string[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLParagraphElement>(null);
  const swatchRef = useRef<HTMLSpanElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const pourRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<((p: number) => void) | null>(null);
  const introRef = useRef<SignatureIntro | null>(null);
  const introTlRef = useRef<gsap.core.Timeline | null>(null);

  const webgl = useWebGLAllowed();
  const active = useCanvasActive(rootRef, webgl);
  const bottle = useMediaQuery("(min-width: 1024px)");
  // DOM kap: bez bočice. Server snapshot je `false`, pa se montira tek posle hidratacije —
  // nema bljeska kapi na desktopu dok `useWebGLAllowed` još odlučuje.
  const drop = useMediaQuery("(max-width: 1023px)");

  const first = colors[0] ?? palette.mint;

  // Mutable kutija van React-a: menja se svakog frejma i ne sme da izaziva re-render.
  // `useState` sa inicijalizatorom, ne `useRef().current` — ref se ne čita u renderu.
  const [drivers] = useState<HeroDrivers>(() => ({
    pointer: { current: { x: 0, y: 0 } },
    scroll: { current: 0 },
    holdEnd: { current: 0 },
    liquid: { current: { from: first, to: first, t: 0 } },
    cyclePhase: { current: 0 },
    captured: { current: null },
    pourOrigin: { current: { x: 0.72, y: 0 } },
    debug: { current: {} },
  }));
  // Dev snimak DOM koreografije (window.__bbmHero); `apply` ga puni samo van produkcije (guard je
  // `process.env.NODE_ENV`, konstanta pri build-u — minifier izbaci te grane; runtime guard ih ne bi).
  const [dev] = useState(() => ({
    letters: [] as { hero: number; nav: number; t: number }[],
    signature: { erased: 0, written: 0, dot: { x: 0, y: 0, visible: false, phase: "none" } },
    frostClip: 100,
  }));

  /* ---- pointer: cilj u -1..1, inerciju rade shader i bočica; samo pravi miš ---- */
  useEffect(() => {
    if (!webgl) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;
    const onMove = (e: PointerEvent) => {
      drivers.pointer.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: 1 - (e.clientY / window.innerHeight) * 2,
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [webgl, drivers]);

  /* ---- boje: ciklus, hvatanje, ink (spec 13 D) ---- */
  useEffect(() => {
    const cycle = new HeroColorCycle(colors.length ? colors : [palette.mint]);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      const saved = window.sessionStorage.getItem(HERO_COLOR_STORAGE_KEY);
      if (saved) cycle.startFrom(saved);
    } catch {
      /* privatni režim */
    }

    // Ceo objekat u `.current` (ne polja) i samo iz tika, nikad sinhrono iz efekta — to je
    // oblik pisanja koji React compiler dozvoljava nad vrednošću iz state-a; alokacija po
    // frejmu je zanemarljiva. Kap dobija boju na prvom tiku (do tada nosi svoj hex iz prop-a).
    const sync = () => {
      drivers.liquid.current = cycle.blend;
      drivers.cyclePhase.current = cycle.phase;
      swatchRef.current?.style.setProperty("--sw", cycle.hex);
    };

    const tick = (_time: number, deltaMs: number) => {
      if (document.hidden) return;
      const p = drivers.scroll.current;
      if (cycle.captured === null && p > CAPTURE_P) {
        const hex = cycle.capture();
        drivers.captured.current = hex;
        try {
          window.sessionStorage.setItem(HERO_COLOR_STORAGE_KEY, hex);
        } catch {
          /* privatni režim */
        }
        pourRef.current?.style.setProperty("--pour-color", effectivePourHex(hex));
        setHeroProgress({ color: hex });
        applyRef.current?.(p);
      } else if (cycle.captured !== null && p <= CAPTURE_P) {
        cycle.release();
        drivers.captured.current = null;
        setHeroProgress({ color: null });
        applyRef.current?.(p);
      }
      if (!reduced) cycle.step(Math.min(deltaMs / 1000, MAX_TICK_DT));
      sync();
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [colors, drivers]);

  /* ---- dev: window.__bbmHero (provera D) ---- */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    window.__bbmHero = {
      get p() {
        return drivers.scroll.current;
      },
      get pour() {
        return heroChoreography(drivers.scroll.current).pour;
      },
      get color() {
        const b = drivers.liquid.current;
        return b.t > 0 ? mixHex(b.from, b.to, b.t) : b.from;
      },
      get captured() {
        return drivers.captured.current;
      },
      get pourOrigin() {
        return drivers.pourOrigin.current;
      },
      get letters() {
        return dev.letters;
      },
      get signature() {
        return dev.signature;
      },
      get frostClip() {
        return dev.frostClip;
      },
      get bottle() {
        return drivers.debug.current;
      },
    };
    return () => {
      delete window.__bbmHero;
    };
  }, [drivers, dev]);

  /* ---- ulaz: reč po reč, dugmad poslednja (docs/MOTION.md → Redosled) ---- */
  useGSAP(
    () => {
      const title = titleRef.current;
      const lead = leadRef.current;
      const cta = ctaRef.current;
      const strip = stripRef.current;
      if (!title || !lead || !cta || !strip) return;

      const done = (el: HTMLElement) => {
        el.dataset.revealMotion = "done";
      };
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduced) {
        revealWords(title, { instant: true, settle: true });
        revealWords(lead, { instant: true, settle: true });
        gsap.set([cta, strip], { opacity: 1, y: 0 });
        for (const el of [title, lead, cta, strip]) done(el);
        return;
      }

      // `settle: false`: spanovi reči OSTAJU — izlaz reč po reč (apply) ih vozi iz p-a.
      const tl = gsap.timeline({ delay: 0.15 });
      tl.add(revealWords(title), 0);
      tl.add(revealWords(lead), 0.12);
      tl.fromTo(
        cta,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: EASE_ENTER, onComplete: () => done(cta) },
        0.34,
      );
      tl.fromTo(
        strip,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6, ease: EASE_ENTER, onComplete: () => done(strip) },
        0.46,
      );
      tl.eventCallback("onComplete", () => {
        done(title);
        done(lead);
      });
      introTlRef.current = tl;
      return () => {
        introTlRef.current = null;
      };
    },
    { scope: rootRef },
  );

  /* ---- zona: jedan ScrollTrigger, sve iz p ---- */
  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const wordmark = wordmarkRef.current;
      const copy = copyRef.current;
      const title = titleRef.current;
      const lead = leadRef.current;
      const cta = ctaRef.current;
      const strip = stripRef.current;
      if (!root || !stage || !wordmark || !copy || !title || !lead || !cta || !strip) return;

      setHeroProgress({ p: 0 });

      const mm = gsap.matchMedia();
      // `all` je catch-all: bez njega handler ne bi ni radio ispod 400 px bez reduced motion
      // (gsap.matchMedia poziva handler samo kad bar jedan uslov važi).
      mm.add(
        {
          all: "all",
          reduce: "(prefers-reduced-motion: reduce)",
          wide: "(min-width: 1024px)",
          mid: "(min-width: 400px)",
        },
        (ctx) => {
          const { reduce, mid } = ctx.conditions as { reduce: boolean; wide: boolean; mid: boolean };
          const swapAt = reduce ? LOGO_SWAP_REDUCED_P : LOGO_SWAP_P;

          const navLogo = document.getElementById("nav-logo-slot");
          const bar = navLogo?.closest<HTMLElement>(".nav-bar") ?? null;
          const navSvg = navLogo?.querySelector<SVGSVGElement>("svg.js-nav-wordmark") ?? null;
          const wordmarkSvg = wordmark.querySelector("svg");
          const heroLetters = glyphPaths(wordmark, "b");
          const heroSig = glyphPaths(wordmark, "s");
          const heroSigGroup = wordmark.querySelector<SVGGElement>("[data-logo-sig]");
          const navLetters = navSvg ? glyphPaths(navSvg, "b") : [];
          const navSig = navSvg ? glyphPaths(navSvg, "s") : [];
          const navSigGroup = navSvg?.querySelector<SVGGElement>("[data-logo-sig]") ?? null;
          const dotEl = document.getElementById("nav-ink-dot");
          const dropEl = dropRef.current;
          const pourEl = pourRef.current;
          const titleWords = [...title.querySelectorAll<HTMLElement>(".reveal-word")];
          const leadWords = [...lead.querySelectorAll<HTMLElement>(".reveal-word")];

          // Slovo po slovo samo kad nav zaista prikazuje wordmark (≥ 400 px) i nema reduced motion.
          const travel =
            !reduce &&
            mid &&
            !!navSvg &&
            navLetters.length === LETTER_COUNT &&
            heroLetters.length === LETTER_COUNT &&
            navSig.length === heroSig.length;

          // Dok se opacity nav loga vozi inline, CSS prelaz sa klase bi svaki frejm
          // razvlačio 300 ms — pa se za to vreme gasi i vraća u čišćenju.
          const previousTransition = navLogo?.style.transition ?? "";
          if (navLogo) navLogo.style.transition = "none";
          if (pourEl) gsap.set(pourEl, { xPercent: -50, yPercent: -50, scale: 0 });

          /*
           * Po jedan quickSetter PO SVOJSTVU (HTML): `quickSetter(el, "css")` sa objektom pravi novu
           * CSSPlugin instancu na svaki poziv i čita computed style. SVG glifovi idu direktno u
           * atribut/stil, na promenu (attrSetter/styleSetter) — bez GSAP-ovog SVG transform keša.
           */
          const q = (el: Element, prop: string, unit?: string) => gsap.quickSetter(el, prop, unit);
          const stageY = q(stage, "y", "px");
          const copyOpacity = q(copy, "opacity");
          const navLogoOpacity = navLogo ? q(navLogo, "opacity") : null;
          const reflowY = [title, lead, cta, strip].map((el) => q(el, "y", "px"));
          const wordOpacity = (els: HTMLElement[]) => els.map((el) => q(el, "opacity"));
          const wordY = (els: HTMLElement[]) => els.map((el) => q(el, "y", "px"));
          const titleOpacity = wordOpacity(titleWords);
          const titleY = wordY(titleWords);
          const leadOpacity = wordOpacity(leadWords);
          const leadY = wordY(leadWords);
          const ctaOpacity = q(cta, "opacity");
          const ctaY = q(cta, "y", "px");
          const stripOpacity = q(strip, "opacity");
          const stripY = q(strip, "y", "px");
          const dropY = dropEl ? q(dropEl, "y", "px") : null;
          const dropScale = dropEl ? q(dropEl, "scale") : null;
          const pourScale = pourEl ? q(pourEl, "scale") : null;
          const dotX = dotEl ? q(dotEl, "x", "px") : null;
          const dotY = dotEl ? q(dotEl, "y", "px") : null;
          const dotScale = dotEl ? q(dotEl, "scale") : null;
          const dotOpacity = dotEl ? q(dotEl, "opacity") : null;

          const heroTransform = heroLetters.map((el) => attrSetter(el, "transform"));
          const heroOpacity = heroLetters.map((el) => styleSetter(el, "opacity"));
          const navOpacity = navLetters.map((el) => styleSetter(el, "opacity"));
          const sigStyle = (els: SVGPathElement[]) =>
            els.map((el) => ({
              offset: styleSetter(el, "stroke-dashoffset"),
              fill: styleSetter(el, "fill-opacity"),
              stroke: styleSetter(el, "stroke-opacity"),
            }));
          const heroSigStyle = sigStyle(heroSig);
          const navSigStyle = sigStyle(navSig);
          const frostClip = bar ? styleSetter(bar, "--frost-clip") : null;

          let wmHidden = false;
          let copyInteractive = true;
          let dropHidden = false;
          let dotHidden = true;
          let heroSigDriven = false;
          let introSettled = false;
          let exiting = false;
          const setWmHidden = (v: boolean) => {
            if (v === wmHidden) return;
            wmHidden = v;
            wordmark.style.visibility = v ? "hidden" : "";
          };
          const setCopyInteractive = (v: boolean) => {
            if (v === copyInteractive) return;
            copyInteractive = v;
            copy.style.pointerEvents = v ? "" : "none";
          };
          const setDropHidden = (v: boolean) => {
            if (v === dropHidden || !dropEl) return;
            dropHidden = v;
            dropEl.style.visibility = v ? "hidden" : "";
          };
          const setDotHidden = (v: boolean) => {
            if (v === dotHidden || !dotEl) return;
            dotHidden = v;
            dotEl.hidden = v;
          };
          /** Intro (reči, CTA, strip) i ispis potpisa moraju da stanu pre nego što p preuzme iste čvorove. */
          const settleIntro = () => {
            if (introSettled) return;
            introSettled = true;
            introTlRef.current?.progress(1);
          };

          const m: Measure = {
            holdEnd: 0,
            sectionHeight: 1,
            stageHeight: 1,
            aspect: 1,
            copy: { x: 0.3, y: 0.5 },
            dropFall: 0,
            unit: 1,
            heroGlyphs: [],
            navGlyphs: [],
            heroBox: [],
            sigLengths: [],
            heroCtm: null,
            navCtm: null,
            flyFrom: { x: 0, y: 0 },
            flyTo: { x: 0, y: 0 },
            copyShift: 0,
          };

          const rectOf = (el: Element, originX: number, originY: number): Rect => {
            const r = el.getBoundingClientRect();
            return { left: r.left - originX, top: r.top - originY, width: r.width, height: r.height };
          };

          /* Meri se BEZ transforma i sa vidljivim copy-jem — zove se iz onRefreshInit. */
          const measure = () => {
            const stageRect = stage.getBoundingClientRect();
            const w = Math.max(1, stageRect.width);
            const h = Math.max(1, stageRect.height);
            m.sectionHeight = root.offsetHeight;
            m.stageHeight = stage.offsetHeight;
            m.holdEnd = reduce ? 0 : holdEndOf(m.sectionHeight, m.stageHeight);
            m.aspect = w / h;
            drivers.holdEnd.current = m.holdEnd;

            const barRect = bar?.getBoundingClientRect();
            const barTop = barRect ? barRect.top : 0;
            const barLeft = barRect ? barRect.left : 0;

            if (travel && wordmarkSvg && navSvg) {
              const box = wordmarkSvg.viewBox.baseVal;
              const svgRect = wordmarkSvg.getBoundingClientRect();
              m.unit = box.width > 0 ? svgRect.width / box.width : 1;
              // Hero glif: levo u px ekrana, vrh relativno na stage; nav glif: relativno na traku
              // (ona ume da bude sakrivena baš u trenutku merenja — nikad dok je hero u kadru).
              m.heroGlyphs = heroLetters.map((el) => rectOf(el, 0, stageRect.top));
              m.navGlyphs = navLetters.map((el) => rectOf(el, barLeft, barTop));
              m.heroBox = heroLetters.map((el) => {
                const b = el.getBBox();
                return { x: b.x, y: b.y };
              });
              m.sigLengths = heroSig.map((el) => el.getTotalLength());
              m.heroCtm = heroSigGroup ? relativeCtm(heroSigGroup, 0, stageRect.top) : null;
              m.navCtm = navSigGroup ? relativeCtm(navSigGroup, barLeft, barTop) : null;
              if (m.heroCtm && heroSig.length) {
                const p0 = heroSig[0].getPointAtLength(0);
                m.flyFrom = transformPoint(m.heroCtm, p0.x, p0.y);
              }
              if (m.navCtm && navSig.length) {
                const p0 = navSig[0].getPointAtLength(0);
                m.flyTo = transformPoint(m.navCtm, p0.x, p0.y);
              }
            }

            const wr = wordmark.getBoundingClientRect();
            const cr = copy.getBoundingClientRect();
            m.copyShift = Math.max(0, cr.top - wr.top);
            m.copy = {
              x: (cr.left + cr.width / 2 - stageRect.left) / w,
              y: 1 - (cr.top + cr.height / 2 - stageRect.top) / h,
            };

            if (dropEl) {
              const d = dropEl.getBoundingClientRect();
              const cx = d.left + d.width / 2 - stageRect.left;
              const cy = d.top + d.height / 2 - stageRect.top;
              m.dropFall = h - cy + d.height;
              drivers.pourOrigin.current = { x: cx / w, y: 0 };
              if (pourEl) {
                const diameter = 2 * Math.hypot(w, h);
                pourEl.style.left = `${cx}px`;
                pourEl.style.top = `${h}px`;
                pourEl.style.width = `${diameter}px`;
                pourEl.style.height = `${diameter}px`;
              }
            }
          };

          let inkLight = false;
          let copyHidden = false;
          root.dataset.ink = "dark";
          const devOn = process.env.NODE_ENV !== "production";

          /* ---- slova + potpis + tačka + frost (grana sa putem) ---- */
          const applyLogo = (p: number, top: number) => {
            const c = heroChoreography(p);
            const u = m.unit;
            for (let i = 0; i < LETTER_COUNT; i += 1) {
              const t = letterTravelAt(p, i, m.heroGlyphs[i], m.navGlyphs[i], top);
              if (t.t <= 0) heroTransform[i]("");
              else {
                const b = m.heroBox[i];
                heroTransform[i](
                  `translate(${f2(b.x + t.x / u)} ${f2(b.y + t.y / u)}) scale(${f2(t.scale)}) translate(${f2(-b.x)} ${f2(-b.y)})`,
                );
              }
              heroOpacity[i](t.landed ? "0" : "");
              navOpacity[i](t.landed ? "1" : "0");
              if (devOn) dev.letters[i] = { hero: t.landed ? 0 : 1, nav: t.landed ? 1 : 0, t: t.t };
            }

            // Hero potpis: p ga dira tek od 0.10 (dotle piše intro); ispod toga vraća nacrtano stanje.
            if (p >= SIG_ERASE[0]) {
              if (!heroSigDriven) {
                heroSigDriven = true;
                introRef.current?.finish();
              }
              const states = eraseAt(p, m.sigLengths);
              states.forEach((s, i) => {
                heroSigStyle[i].offset(`${f2(s.dashoffset)}px`);
                heroSigStyle[i].fill(f2(s.fill));
                heroSigStyle[i].stroke(s.stroke ? "1" : "0");
              });
              if (devOn) dev.signature.erased = 1 - signatureProgress(states, m.sigLengths);
            } else if (heroSigDriven) {
              heroSigDriven = false;
              heroSigStyle.forEach((s) => {
                s.offset("0px");
                s.fill("1");
                s.stroke("0");
              });
              if (devOn) dev.signature.erased = 0;
            }
            const written = writeAt(p, m.sigLengths);
            written.forEach((s, i) => {
              navSigStyle[i].offset(`${f2(s.dashoffset)}px`);
              navSigStyle[i].fill(f2(s.fill));
              navSigStyle[i].stroke(s.stroke ? "1" : "0");
            });
            if (devOn) dev.signature.written = signatureProgress(written, m.sigLengths);

            // Tačka tinte: na frontu brisanja (hero), u letu, na frontu pisanja (nav).
            const d = dotAt(p);
            if (d.phase === "none" || !dotX || !dotY || !dotScale || !dotOpacity) {
              setDotHidden(true);
              if (devOn) dev.signature.dot = { x: 0, y: 0, visible: false, phase: d.phase };
            } else {
              let pt: Point;
              if (d.phase === "erase" && m.heroCtm) {
                const front = eraseFrontAt(p, m.sigLengths);
                const sp = heroSig[front.glyph].getPointAtLength(front.length);
                pt = transformPoint(m.heroCtm, sp.x, sp.y);
                pt = { x: pt.x, y: pt.y + top };
              } else if (d.phase === "write" && m.navCtm) {
                const front = writeFrontAt(p, m.sigLengths);
                const sp = navSig[front.glyph].getPointAtLength(front.length);
                pt = transformPoint(m.navCtm, sp.x, sp.y);
              } else {
                pt = flyPoint(d.t, { x: m.flyFrom.x, y: m.flyFrom.y + top }, m.flyTo);
              }
              dotX(pt.x);
              dotY(pt.y);
              dotScale(d.scale);
              dotOpacity(d.opacity);
              setDotHidden(false);
              if (devOn) dev.signature.dot = { x: pt.x, y: pt.y, visible: true, phase: d.phase };
            }

            frostClip?.(`inset(0 ${c.frostClip.toFixed(1)}% 0 0)`);
            if (devOn) dev.frostClip = c.frostClip;
            setWmHidden(p >= LETTERS_END);
          };

          const apply = (p: number) => {
            const c = heroChoreography(p);
            drivers.scroll.current = p;
            setHeroProgress({ p });

            // Stage: sticky ga drži do HOLD_END, posle zaostaje (transform).
            const lag = reduce ? 0 : stageLag(p, m.holdEnd, m.stageHeight);
            stageY(lag);
            const top = stageTop(p, m.holdEnd, m.sectionHeight, m.stageHeight);

            if (travel && m.navGlyphs.length === LETTER_COUNT && m.navGlyphs[0].width > 0) {
              navLogoOpacity?.(1);
              applyLogo(p, top);
            } else {
              const on = logoSwap(p, swapAt);
              setWmHidden(on === 1);
              navLogoOpacity?.(on);
              frostClip?.("none");
            }

            // Copy: reflow nagore (ne bledi), pa izlaz reč po reč; reduced samo kontejner.
            if (reduce) {
              copyOpacity(c.copyFade);
            } else {
              if (p >= (travel ? 0.12 : LOGO_SWAP_P)) settleIntro();
              for (let i = 0; i < reflowY.length; i += 1) reflowY[i](-m.copyShift * copyReflowAt(p, i, !travel));
              if (p >= EXIT.strip[0] || exiting) {
                exiting = p >= EXIT.strip[0];
                settleIntro();
                for (let i = 0; i < titleWords.length; i += 1) {
                  const w = wordExitAt(p, i, titleWords.length, EXIT.title);
                  titleOpacity[i](w.opacity);
                  titleY[i](w.y);
                }
                for (let i = 0; i < leadWords.length; i += 1) {
                  const w = wordExitAt(p, i, leadWords.length, EXIT.lead);
                  leadOpacity[i](w.opacity);
                  leadY[i](w.y);
                }
                const ce = blockExitAt(p, EXIT.cta);
                ctaOpacity(ce.opacity);
                ctaY(ce.y);
                const se = blockExitAt(p, EXIT.strip);
                stripOpacity(se.opacity);
                stripY(se.y);
              }
            }
            setCopyInteractive(c.copyInteractive);
            const wantHidden = c.copyHidden && !copy.contains(document.activeElement);
            if (wantHidden !== copyHidden) {
              copyHidden = wantHidden;
              copy.hidden = wantHidden;
            }

            // DOM kap (bez bočice): pad, pa prosipanje.
            if (dropY && dropScale && !reduce) {
              dropY(c.fall * m.dropFall);
              dropScale(1 - 0.35 * c.fall);
              setDropHidden(c.fall >= 1);
            }
            if (pourScale && !reduce) pourScale(c.pour);

            // Ink: svetao tekst tek kad front razlivene TAMNE boje pokrije copy (odluka 3, korak 13).
            let light = false;
            const captured = drivers.captured.current;
            if (captured && !reduce && inkFor(effectivePourHex(captured)) === "light") {
              light = pourCoverage(m.copy, drivers.pourOrigin.current, m.aspect, c.pour) >= INK_COVERAGE;
            }
            if (light !== inkLight) {
              inkLight = light;
              root.dataset.ink = light ? "light" : "dark";
            }
          };
          applyRef.current = apply;

          // Dasharray oba potpisa: intro ga za hero već stavlja (isti broj), nav ga nema.
          const armSignatures = () => {
            if (!travel) return;
            heroSig.forEach((el, i) => {
              el.style.strokeDasharray = `${m.sigLengths[i]}px`;
            });
            navSig.forEach((el, i) => {
              el.style.strokeDasharray = `${m.sigLengths[i]}px`;
            });
          };

          const trigger = ScrollTrigger.create({
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: true,
            onRefreshInit: () => {
              gsap.set([stage, copy, title, lead, cta, strip], { clearProps: "transform" });
              for (const el of heroLetters) {
                el.removeAttribute("transform");
                el.style.opacity = "";
              }
              if (dropEl) gsap.set(dropEl, { clearProps: "transform" });
              copy.hidden = false;
              copyHidden = false;
              measure();
              armSignatures();
            },
            onRefresh: (self) => apply(self.progress),
            onUpdate: (self) => apply(self.progress),
          });

          return () => {
            trigger.kill();
            applyRef.current = null;
            gsap.set([stage, copy, title, lead, cta, strip], { clearProps: "transform,opacity" });
            gsap.set([...titleWords, ...leadWords], { clearProps: "transform,opacity" });
            for (const el of heroLetters) {
              el.removeAttribute("transform");
              el.style.opacity = "";
            }
            for (const el of navLetters) el.style.opacity = "";
            for (const el of [...heroSig, ...navSig]) {
              el.style.strokeDasharray = "";
              el.style.strokeDashoffset = "";
              el.style.fillOpacity = "";
              el.style.strokeOpacity = "";
            }
            wordmark.style.visibility = "";
            copy.style.pointerEvents = "";
            copy.hidden = false;
            delete root.dataset.ink;
            if (dropEl) gsap.set(dropEl, { clearProps: "all" });
            if (pourEl) gsap.set(pourEl, { clearProps: "all" });
            if (dotEl) {
              gsap.set(dotEl, { clearProps: "all" });
              dotEl.hidden = true;
            }
            if (bar) bar.style.removeProperty("--frost-clip");
            if (navLogo) {
              gsap.set(navLogo, { clearProps: "opacity" });
              navLogo.style.transition = previousTransition;
            }
            drivers.scroll.current = 0;
          };
        },
      );
    },
    { scope: rootRef, dependencies: [drivers, dev, drop] },
  );

  return (
    <section
      ref={rootRef}
      id="hero"
      // Ceo hero je van site-wide prolaza; reč-po-reč ulazak i izlazak radi ova komponenta.
      data-reveal="off"
      // Zona: 170 vh (mobilni 130 vh, reduced motion 100 vh = bez holda). BEZ overflow:hidden —
      // stage u fazi izlaska zaostaje ispod sledeće sekcije.
      className="relative isolate h-[170vh] max-md:h-[130vh] motion-reduce:h-[100vh]"
    >
      <div
        ref={stageRef}
        className="hero-stage sticky top-0 isolate flex h-[100vh] flex-col justify-center overflow-hidden will-change-transform"
      >
        <div className="absolute inset-0 -z-10">
          {/* Svetla podloga UVEK ispod canvasa — dok lenji chunk stiže i u tamnoj temi (spec 14 C). */}
          <HeroFallback />
          {webgl ? <LiquidCanvas drivers={drivers} active={active} bottle={bottle} /> : null}
        </div>
        {drop ? <HeroPour pourRef={pourRef} /> : null}

        {/*
          Omotač i kolona ne hvataju pointer: providna kutija iznad canvasa bi gutala
          hover/klik na bočici. Copy kontejner ih vraća (`pointer-events-auto`).
        */}
        <div className="pointer-events-none mx-auto w-full max-w-content px-5 pt-28 pb-20 md:px-8 md:pt-32">
          {/*
            Leva kolona: na ≥ 1024 px ne ide dalje od polovine kadra — desna polovina je
            bočica u canvasu. Ispod toga zauzima punu širinu. `relative` zbog scrima koji je
            120 % njene širine.
          */}
          <div className="relative flex flex-col gap-10 lg:max-w-[calc(50vw-2rem)]">
            <HeroScrim />

            {/* `hero-wordmark`: SVG mora da bude overflow visible — slova lete van svog viewBox-a. */}
            <div ref={wordmarkRef} className="hero-wordmark w-full max-w-[min(78vw,540px)]">
              <LogoSignature variant="wordmark" size="100%" className="block w-full text-ink" introRef={introRef} />
            </div>

            {/*
              Blok kontejner, ne flex: reč-spanovi u flex/grid roditelju postaju flex stavke,
              `gap` padne između reči i `lib/textReveal.ts` tada ceo element gasi kao blok.
              Razmak drži `space-y-*` (margina), pa reč-po-reč ostaje moguć.
            */}
            <div ref={copyRef} data-hero-copy className="pointer-events-auto relative max-w-2xl space-y-6">
              {drop ? <HeroDrop hex={first} swatchRef={swatchRef} dropRef={dropRef} /> : null}
              <h1 ref={titleRef} data-reveal-motion="pending" className="hero-ink text-h1 max-lg:pr-24">
                Dva salona u Belvilleu. Termin birate sami.
              </h1>
              <p ref={leadRef} data-reveal-motion="pending" className="hero-ink-80 max-w-prose text-lg">
                Nokti, depilacija, masaža, trepavice i obrve. Izaberite lokal, uslugu i vreme, a mi vas zovemo
                da potvrdimo termin.
              </p>

              <div ref={ctaRef} data-reveal-motion="pending" className="flex flex-wrap items-center gap-3">
                <Button as="a" href="#zakazivanje" size="lg">
                  Zakažite termin
                </Button>
                {/* Podloga hero-a je uvek svetla (shader ili gradijent), i u tamnoj temi —
                    zato ovo dugme nosi papirnu površinu i ink obrub, ne tokene teme. */}
                <Button
                  as="a"
                  href="#shop"
                  variant="ghost"
                  size="lg"
                  className="border-ink/15 bg-paper-elev/85 text-ink hover:border-ink/30 hover:bg-paper-elev"
                >
                  Pogledajte proizvode
                </Button>
              </div>

              <p ref={stripRef} data-reveal-motion="pending" className="hero-ink-70 text-caption">
                Jurija Gagarina 14ž i 14i, Blok 67 · radimo i nedeljom
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
