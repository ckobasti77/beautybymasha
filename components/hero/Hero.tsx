"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LogoSignature } from "@/components/brand/LogoSignature";
import { Button } from "@/components/ui/Button";
import { EASE_ENTER, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import {
  CAPTURE_P,
  LOGO_SWAP_P,
  LOGO_SWAP_REDUCED_P,
  heroChoreography,
  holdEndOf,
  logoSwap,
  pourCoverage,
  stageLag,
} from "@/lib/heroChoreography";
import { HERO_COLOR_STORAGE_KEY, HeroColorCycle, effectivePourHex, inkFor, mixHex } from "@/lib/heroColors";
import { setHeroProgress } from "@/lib/heroProgress";
import { wordmarkTransformAt, type Box } from "@/lib/logoTravel";
import { palette } from "@/lib/palette";
import { revealWords } from "@/lib/textReveal";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useCanvasActive, useWebGLAllowed } from "@/lib/webgl";
import { HeroDrop, HeroPour } from "./HeroDrop";
import { HeroFallback } from "./HeroFallback";
import { HeroScrim } from "./HeroScrim";
import type { HeroDrivers } from "./heroDrivers";

/**
 * Hero „tečni lak" (docs/BRAND.md §6, docs/MOTION.md → Hero v2, spec 13).
 *
 * DVA SISTEMA, JASNO PODELJENA. Cela sekcija je `data-reveal="off"`, pa je site-wide
 * reč-po-reč prolaz ne dira. Dug koji time preuzimamo (docs/MOTION.md) vraćamo ovde:
 * naslov i uvod i dalje stižu reč po reč, ali kroz `revealWords` iz `lib/textReveal.ts`,
 * u našem timeline-u i našim tempom. Nikakav lokalni splitter, nikakav drugi opacity na
 * tekstualnim čvorovima — izlazak copy-ja animira KONTEJNER (`data-hero-copy`).
 *
 * ZONA (spec C): sekcija je 170 vh (mobilni 130 vh, reduced motion 100 vh) sa `sticky` stage-om
 * od 100 vh. Do HOLD_END = (H − vh) / H hero fizički miruje — to je „zadržavanje", bez pina,
 * bez Flip-a, bez zaključavanja skrola. JEDAN ScrollTrigger (`top top → bottom top`) daje `p`,
 * a `apply(p)` je čista funkcija: reload usred heroja daje isto stanje kao skrol do te tačke.
 *  - `drivers.scroll` → shader (razlivanje) i bočica (nagib, kap, izlaz), u `useFrame`;
 *  - wordmark → nav slot 0.04–0.30 (samo transform po izmerenim pravougaonicima,
 *    lib/logoTravel.ts), crossfade sa nav logom 0.30–0.36; ispod 400 px i uz reduced motion
 *    samo zamena (0.30 / 0.50);
 *  - copy kontejner 0.55–0.85 (opacity, y), CTA prestaju da hvataju klik od 0.55, od 0.85
 *    `hidden` — iznad je kadra, a provera iz MOTION.md ostaje poštena;
 *  - stage zaostaje za stranom do 40 % visine (HOLD_END–1) ispod `.hero-overlap` sekcije;
 *  - `data-ink` po kontrastu razlivene boje kad front pokrije copy (lib/heroColors.ts).
 * Merenje ide u `onRefreshInit` (transformi skinuti, copy vidljiv), `apply` i u `onRefresh`.
 *
 * BOJE (spec D): ciklus pet bestselera (hex sa servera kroz `colors`) vozi gsap.ticker OVDE,
 * za sve tri grane — 3D bočica (≥ 1024), shader bez bočice (769–1023) i CSS kap (≤ 1023).
 * Prvi pomak skrola (p > 0.01) hvata trenutnu boju; p < 0.01 pušta ciklus dalje.
 *
 * WebGL se montira samo ako `useWebGLAllowed` (`lib/webgl.ts`) kaže da smemo. Mobilni nikad.
 */

declare global {
  interface Window {
    /** Samo u dev-u (provera J.6): trenutno stanje hero zone. */
    __bbmHero?: {
      readonly p: number;
      readonly pour: number;
      readonly color: string;
      readonly captured: string | null;
    };
  }
}

const LiquidCanvas = dynamic(() => import("./LiquidCanvas"), { ssr: false });

/** Posle pauze (sakriven tab) prvi tik ticker-a nosi ceo razmak — ciklus ga ne preskače. */
const MAX_TICK_DT = 0.1;
/** Front razlivanja prebacuje ink kad ovoliko pokrije centar copy kolone. */
const INK_COVERAGE = 0.5;

type Uv = { x: number; y: number };

type Measure = {
  rest: Box;
  slot: Box;
  holdEnd: number;
  sectionHeight: number;
  stageHeight: number;
  aspect: number;
  copy: Uv;
  /** Koliko px DOM kap pada do dna stage-a. */
  dropFall: number;
};

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
    liquid: { current: { from: first, to: first, t: 0 } },
    captured: { current: null },
    pourOrigin: { current: { x: 0.72, y: 0 } },
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

  /* ---- boje: ciklus, hvatanje, ink (spec D) ---- */
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

  /* ---- dev: window.__bbmHero (provera J.6) ---- */
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
    };
    return () => {
      delete window.__bbmHero;
    };
  }, [drivers]);

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

      const tl = gsap.timeline({ delay: 0.15 });
      tl.add(revealWords(title, { settle: true }), 0);
      tl.add(revealWords(lead, { settle: true }), 0.12);
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
    },
    { scope: rootRef },
  );

  /* ---- zona: jedan ScrollTrigger, sve iz p (spec C) ---- */
  useGSAP(
    () => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const wordmark = wordmarkRef.current;
      const copy = copyRef.current;
      if (!root || !stage || !wordmark || !copy) return;

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
          const travel = !reduce && mid;
          const swapAt = reduce ? LOGO_SWAP_REDUCED_P : LOGO_SWAP_P;

          const navLogo = document.getElementById("nav-logo-slot");
          const bar = navLogo?.closest<HTMLElement>(".nav-bar") ?? null;
          const wordmarkSvg = wordmark.querySelector("svg");
          // Slot nosi dva SVG-a (mark ispod 400 px, wordmark iznad) — meri se onaj koji je
          // zaista prikazan; skriveni ima pravougaonik 0×0.
          const shownNavSvg = () =>
            navLogo
              ? ([...navLogo.querySelectorAll("svg")].find((s) => s.getBoundingClientRect().width > 0) ?? null)
              : null;
          const dropEl = dropRef.current;
          const pourEl = pourRef.current;

          // Dok se opacity nav loga vozi inline, CSS prelaz sa klase bi svaki frejm
          // razvlačio 300 ms — pa se za to vreme gasi i vraća u čišćenju.
          const previousTransition = navLogo?.style.transition ?? "";
          if (navLogo) navLogo.style.transition = "none";

          gsap.set(wordmark, { transformOrigin: "0 0" });
          if (pourEl) gsap.set(pourEl, { xPercent: -50, yPercent: -50, scale: 0 });

          /*
           * Po jedan quickSetter PO SVOJSTVU: `quickSetter(el, "css")` sa objektom pravi novu
           * CSSPlugin instancu na svaki poziv i čita computed style (forsiran style flush po
           * frejmu — profil, korak 13). Setteri po svojstvu pišu pravo u transform keš.
           * Ono što se menja retko (visibility, pointer-events, hidden) piše se samo na promenu.
           */
          const q = (el: Element, prop: string, unit?: string) => gsap.quickSetter(el, prop, unit);
          const wmX = q(wordmark, "x", "px");
          const wmY = q(wordmark, "y", "px");
          const wmScale = q(wordmark, "scale");
          const wmOpacity = q(wordmark, "opacity");
          const copyOpacity = q(copy, "opacity");
          const copyY = q(copy, "y", "px");
          const stageY = q(stage, "y", "px");
          const navLogoOpacity = navLogo ? q(navLogo, "opacity") : null;
          const dropY = dropEl ? q(dropEl, "y", "px") : null;
          const dropScale = dropEl ? q(dropEl, "scale") : null;
          const pourScale = pourEl ? q(pourEl, "scale") : null;
          let wmHidden = false;
          let copyInteractive = true;
          let dropHidden = false;
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

          const m: Measure = {
            rest: { left: 0, top: 0, width: 1 },
            slot: { left: 0, top: 0, width: 0 },
            holdEnd: 0,
            sectionHeight: 1,
            stageHeight: 1,
            aspect: 1,
            copy: { x: 0.3, y: 0.5 },
            dropFall: 0,
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

            if (wordmarkSvg) {
              const r = wordmarkSvg.getBoundingClientRect();
              m.rest = { left: r.left, top: r.top - stageRect.top, width: r.width };
            }
            const navSvg = shownNavSvg();
            if (navSvg && bar) {
              // Relativno na traku: ona ume da bude sakrivena (translateY) baš u trenutku merenja.
              const r = navSvg.getBoundingClientRect();
              const b = bar.getBoundingClientRect();
              m.slot = { left: r.left, top: r.top - b.top, width: r.width };
            } else {
              m.slot = { left: 0, top: 0, width: 0 };
            }

            const cr = copy.getBoundingClientRect();
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

          const apply = (p: number) => {
            const c = heroChoreography(p);
            drivers.scroll.current = p;
            setHeroProgress({ p });

            // Stage: sticky ga drži do HOLD_END, posle zaostaje (transform) — spec G.
            const lag = reduce ? 0 : stageLag(p, m.holdEnd, m.stageHeight);
            stageY(lag);
            const stageTop = -Math.max(0, p - m.holdEnd) * m.sectionHeight + lag;

            // Wordmark → slot, crossfade sa nav logom; bez puta samo zamena.
            if (travel && m.slot.width > 0) {
              const t = wordmarkTransformAt(c.logo, m.rest, m.slot, stageTop);
              wmX(t.x);
              wmY(t.y);
              wmScale(t.scale);
              wmOpacity(c.wordmarkOpacity);
              setWmHidden(c.wordmarkOpacity <= 0);
              navLogoOpacity?.(c.navLogoOpacity);
            } else {
              const on = logoSwap(p, swapAt);
              wmOpacity(1 - on);
              setWmHidden(on === 1);
              navLogoOpacity?.(on);
            }

            // Copy izlazi kao kontejner; tekstualnim čvorovima opacity drži reveal sistem.
            copyOpacity(c.copyOpacity);
            copyY(c.copyY);
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

            // Ink: svetao tekst tek kad front razlivene TAMNE boje pokrije copy (odluka 3).
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

          const trigger = ScrollTrigger.create({
            trigger: root,
            start: "top top",
            end: "bottom top",
            scrub: true,
            onRefreshInit: () => {
              gsap.set([wordmark, stage, copy], { clearProps: "transform" });
              if (dropEl) gsap.set(dropEl, { clearProps: "transform" });
              copy.hidden = false;
              copyHidden = false;
              measure();
            },
            onRefresh: (self) => apply(self.progress),
            onUpdate: (self) => apply(self.progress),
          });

          return () => {
            trigger.kill();
            applyRef.current = null;
            gsap.set([wordmark, stage, copy], { clearProps: "transform,opacity" });
            wordmark.style.visibility = "";
            copy.style.pointerEvents = "";
            copy.hidden = false;
            delete root.dataset.ink;
            if (dropEl) gsap.set(dropEl, { clearProps: "all" });
            if (pourEl) gsap.set(pourEl, { clearProps: "all" });
            if (navLogo) {
              gsap.set(navLogo, { clearProps: "opacity" });
              navLogo.style.transition = previousTransition;
            }
            drivers.scroll.current = 0;
          };
        },
      );
    },
    { scope: rootRef, dependencies: [drivers, drop] },
  );

  return (
    <section
      ref={rootRef}
      id="hero"
      // Ceo hero je van site-wide prolaza; reč-po-reč ulazak radi timeline iznad.
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
          {webgl ? <LiquidCanvas drivers={drivers} active={active} bottle={bottle} /> : <HeroFallback />}
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

            <div ref={wordmarkRef} className="w-full max-w-[min(78vw,540px)] origin-top-left will-change-transform">
              <LogoSignature variant="wordmark" size="100%" className="block w-full text-ink" />
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
