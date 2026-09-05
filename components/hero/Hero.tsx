"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LogoSignature } from "@/components/brand/LogoSignature";
import { Button } from "@/components/ui/Button";
import { EASE_ENTER, gsap, useGSAP } from "@/lib/gsap";
import { compensationPercent, logoTravel, restBox, type Box } from "@/lib/logoTravel";
import { revealWords } from "@/lib/textReveal";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useCanvasActive, useWebGLAllowed } from "@/lib/webgl";
import { HeroFallback } from "./HeroFallback";
import { HeroScrim } from "./HeroScrim";
import type { HeroDrivers } from "./heroDrivers";

/**
 * Hero „tečni lak" (docs/BRAND.md §6, docs/MOTION.md → Hero scroll scenario).
 *
 * DVA SISTEMA, JASNO PODELJENA. Cela sekcija je `data-reveal="off"`, pa je site-wide
 * reč-po-reč prolaz ne dira. Dug koji time preuzimamo (docs/MOTION.md) vraćamo ovde:
 * naslov i uvod i dalje stižu reč po reč, ali kroz `revealWords` iz `lib/textReveal.ts`,
 * u našem timeline-u i našim tempom. Nikakav lokalni splitter, nikakav drugi opacity.
 * Copy je sakriven pre prvog paint-a preko `data-reveal-motion="pending"` (isti ugovor
 * kao `Reveal`: ko krije, taj i otkriva) i tu zastavicu skidamo kad ulaz završi.
 *
 * WebGL se montira samo ako `useWebGLAllowed` (`lib/webgl.ts`) kaže da smemo. Mobilni nikad.
 * Bočica u istom canvasu samo ≥ 1024 px (spec 12 → D); ispod toga copy ide punom širinom.
 *
 * Skrol (korak 12): JEDAN ScrollTrigger na sekciji, `start top top → end bottom top`,
 * scrub, BEZ pina (pin je uklonjen u koraku 10 i ne vraća se — pravio je `.pin-spacer`
 * koji je pomerao sve trigere ispod). Isti napredak vozi tri stvari:
 *  1. `drivers.scroll` → shader (`uScroll` dubina, `uPour` razlivanje) i bočica
 *     (nagib → smanjivanje → nestajanje), sve u `useFrame`, nula layouta;
 *  2. wordmark → logo slot u navigaciji: samo `transform` (translate + scale) po izmerenim
 *     pravougaonicima (`lib/logoTravel.ts`), do 70 %, expo.out po ekranu (naslov ide za
 *     njim brzinom strane, pa mora brzo da mu pobegne); 70–85 % crossfade sa nav logom,
 *     posle toga wordmark je `visibility: hidden` da ne hvata klikove. Bez GSAP Flip-a.
 *  3. ništa na copy-ju: njegov opacity drži reveal sistem i ostaje čitljiv do kraja.
 */

const LiquidCanvas = dynamic(() => import("./LiquidCanvas"), { ssr: false });

/** Wordmark stiže u nav slot na 70 % heroja (spec 12 → H). */
const TRAVEL_END = 0.7;
/** Do 85 % se crossfade-uje sa logom u navigaciji. */
const CROSSFADE_END = 0.85;

function boxOf(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width };
}

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLParagraphElement>(null);

  const webgl = useWebGLAllowed();
  const active = useCanvasActive(rootRef, webgl);
  const bottle = useMediaQuery("(min-width: 1024px)");

  // Mutable kutija van React-a: menja se svakog frejma i ne sme da izaziva re-render.
  // `useState` sa inicijalizatorom, ne `useRef().current` — ref se ne čita u renderu.
  const [drivers] = useState<HeroDrivers>(() => ({
    pointer: { current: { x: 0, y: 0 } },
    scroll: { current: 0 },
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

  /* ---- skrol: jedan scrub trigger za shader, bočicu i wordmark → nav (bez pina) ---- */
  useGSAP(
    () => {
      const root = rootRef.current;
      const wordmark = wordmarkRef.current;
      if (!root || !wordmark) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const navLogo = document.getElementById("nav-logo-slot");
        const wordmarkSvg = wordmark.querySelector("svg");
        // Slot nosi dva SVG-a (mark ispod 400 px, wordmark iznad) — meri se onaj koji je
        // zaista prikazan; skriveni ima pravougaonik 0×0 u (0, 0).
        const shownNavSvg = () =>
          navLogo
            ? ([...navLogo.querySelectorAll("svg")].find((s) => s.getBoundingClientRect().width > 0) ?? null)
            : null;

        // Dok scrub vozi opacity nav loga inline, CSS prelaz sa klase bi svaki frejm
        // razvlačio 300 ms — pa se za to vreme gasi i vraća u čišćenju.
        const previousTransition = navLogo?.style.transition ?? "";
        if (navLogo) navLogo.style.transition = "none";

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            // `true`, ne broj: `y` wordmark-a kompenzuje pomeraj strane, što je tačno samo
            // kad je napredak tweena jednak stvarnom skrolu. Glatkoću daje Lenis; shader i
            // bočica se dodatno sami glačaju u `useFrame`.
            scrub: true,
            invalidateOnRefresh: true,
            // Merenje (dole) traži wordmark BEZ transforma — refresh počinje čišćenjem.
            onRefreshInit: () => gsap.set(wordmark, { clearProps: "transform" }),
            onUpdate: (self) => {
              drivers.scroll.current = self.progress;
            },
            onRefresh: (self) => {
              drivers.scroll.current = self.progress;
            },
          },
        });

        // Timeline mora da traje tačno 1: scrub mapira napredak trigera (0..1) na CELO
        // trajanje, pa bi bez ovoga crossfade od 0.70–0.85 bio razvučen do kraja heroja.
        tl.to({}, { duration: 0 }, 1);

        if (navLogo && shownNavSvg() && wordmarkSvg) {
          /*
           * Funkcijske vrednosti — računaju se na svakom refresh-u (resize, load), posle
           * `onRefreshInit`. Rect wordmark-a se svodi na „položaj pri napretku 0" preko
           * toga koliko je strana u trenutku merenja skrolovana od starta trigera.
           */
          const travel = () => {
            const st = tl.scrollTrigger;
            const heroHeight = st ? st.end - st.start : root.offsetHeight;
            const scrolled = st ? st.scroll() - st.start : 0;
            const navSvg = shownNavSvg();
            const from = restBox(boxOf(wordmarkSvg), scrolled);
            return logoTravel({
              from,
              to: navSvg ? boxOf(navSvg) : from,
              heroHeight,
              endProgress: TRAVEL_END,
            });
          };

          /*
           * Dva tweena na istom elementu (lib/logoTravel.ts): put na EKRANU ide expo.out —
           * wordmark brzo napusti naslov koji za njim ide brzinom strane, pa se lagano
           * smesti u slot — a `yPercent` LINEARNO vraća ono što strana odnese, pa se
           * skrol član tačno skrati. Jedan tween sa ease-om to ne može: kompenzacija
           * mora da bude linearna, put ne.
           */
          tl.fromTo(
            wordmark,
            { x: 0, y: 0, yPercent: 0, scale: 1, transformOrigin: "0 0" },
            {
              x: () => travel().x,
              y: () => travel().y,
              scale: () => travel().scale,
              transformOrigin: "0 0",
              duration: TRAVEL_END,
              ease: EASE_ENTER,
            },
            0,
          );
          tl.fromTo(
            wordmark,
            { yPercent: 0 },
            {
              yPercent: () => compensationPercent(travel(), wordmark.offsetHeight),
              duration: TRAVEL_END,
              ease: "none",
            },
            0,
          );
          // Crossfade: `fromTo` sa eksplicitnim početkom, jer `invalidateOnRefresh` inače
          // uzima zatečeno stanje (npr. wordmark već sakriven) kao početak tweena.
          tl.fromTo(
            wordmark,
            { autoAlpha: 1 },
            { autoAlpha: 0, duration: CROSSFADE_END - TRAVEL_END },
            TRAVEL_END,
          );
          tl.fromTo(
            navLogo,
            { opacity: 0 },
            { opacity: 1, duration: CROSSFADE_END - TRAVEL_END },
            TRAVEL_END,
          );
        }

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
          gsap.set(wordmark, { clearProps: "transform,opacity,visibility" });
          if (navLogo) {
            gsap.set(navLogo, { clearProps: "opacity" });
            navLogo.style.transition = previousTransition;
          }
          drivers.scroll.current = 0;
        };
      });
    },
    { scope: rootRef, dependencies: [drivers] },
  );

  return (
    <section
      ref={rootRef}
      id="hero"
      // Ceo hero je van site-wide prolaza; reč-po-reč ulazak radi timeline iznad.
      data-reveal="off"
      className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        {webgl ? <LiquidCanvas drivers={drivers} active={active} bottle={bottle} /> : <HeroFallback />}
      </div>

      <div className="mx-auto w-full max-w-content px-5 pt-28 pb-20 md:px-8 md:pt-32">
        {/*
          Leva kolona: na ≥ 1024 px ne ide dalje od polovine kadra — desna polovina je
          bočica u canvasu (spec 12 → B). Ispod toga zauzima punu širinu. `relative` zbog
          scrima koji je 120 % njene širine.
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
          <div className="max-w-2xl space-y-6">
            <h1 ref={titleRef} data-reveal-motion="pending" className="text-h1 text-ink">
              Dva salona u Belvilleu. Termin birate sami.
            </h1>
            <p ref={leadRef} data-reveal-motion="pending" className="max-w-prose text-lg text-ink/80">
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

            <p ref={stripRef} data-reveal-motion="pending" className="text-caption text-ink/70">
              Jurija Gagarina 14ž i 14i, Blok 67 · radimo i nedeljom
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
