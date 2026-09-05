"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LogoSignature } from "@/components/brand/LogoSignature";
import { Button } from "@/components/ui/Button";
import { EASE_ENTER, Flip, ScrollTrigger, gsap, useGSAP } from "@/lib/gsap";
import { revealWords } from "@/lib/textReveal";
import { useCanvasActive, useWebGLAllowed } from "@/lib/webgl";
import { HeroFallback } from "./HeroFallback";
import type { HeroDrivers } from "./LiquidCanvas";

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
 */

const LiquidCanvas = dynamic(() => import("./LiquidCanvas"), { ssr: false });

type FitVars = { x: number; y: number; scaleX: number; scaleY: number };

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLParagraphElement>(null);

  const webgl = useWebGLAllowed();
  const active = useCanvasActive(rootRef, webgl);

  // Mutable kutija van React-a: menja se svakog frejma i ne sme da izaziva re-render.
  // `useState` sa inicijalizatorom, ne `useRef().current` — ref se ne čita u renderu.
  const [drivers] = useState<HeroDrivers>(() => ({
    pointer: { current: { x: 0, y: 0 } },
    scroll: { current: 0 },
  }));

  /* ---- pointer: cilj u -1..1, inerciju radi shader ---- */
  useEffect(() => {
    if (!webgl) return;
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

  /* ---- scroll scenario: pin, Flip wordmark → nav, skupljanje u krug ---- */
  useGSAP(
    () => {
      const root = rootRef.current;
      const visual = visualRef.current;
      const wordmark = wordmarkRef.current;
      const copy = copyRef.current;
      if (!root || !visual || !wordmark || !copy) return;

      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const navLogo = document.getElementById("nav-logo-slot");

        // Flip meri jednom po `refresh`-u: dve merne tačke (wordmark u heroju i mesto
        // u navigaciji) su u istom, nepomerenom rasporedu samo pre nego što scrub
        // primeni transformaciju. `onRefreshInit` briše i merenje i zatečeni transform.
        let fit: FitVars | null = null;
        const measure = (): FitVars => {
          if (!fit && navLogo) {
            fit = Flip.fit(wordmark, navLogo, { getVars: true, scale: true }) as FitVars | null;
          }
          return fit ?? { x: 0, y: 0, scaleX: 1, scaleY: 1 };
        };

        const tl = gsap.timeline({ defaults: { ease: "none" } });

        // 15–60%: copy se povlači, wordmark leti u navigaciju i tamo se predaje logu.
        tl.to(copy, { opacity: 0, y: -48, duration: 0.4 }, 0.15);
        if (navLogo) {
          tl.to(
            wordmark,
            {
              x: () => measure().x,
              y: () => measure().y,
              scale: () => measure().scaleX,
              duration: 0.42,
            },
            0.15,
          );
          tl.to(wordmark, { opacity: 0, duration: 0.1 }, 0.5);
          tl.fromTo(navLogo, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.5);
        }

        // 60–100%: podloga se skuplja u krug iz logotipa i predaje ekran sekciji Usluge.
        tl.fromTo(
          visual,
          { clipPath: "circle(140% at 50% 45%)" },
          { clipPath: "circle(13% at 50% 45%)", scale: 0.78, duration: 0.34 },
          0.6,
        );
        tl.to(visual, { opacity: 0, duration: 0.1 }, 0.9);

        const trigger = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "+=110%",
          pin: true,
          pinSpacing: true,
          scrub: 1,
          animation: tl,
          invalidateOnRefresh: true,
          onRefreshInit: () => {
            fit = null;
            gsap.set(wordmark, { clearProps: "transform" });
          },
          onUpdate: (self) => {
            drivers.scroll.current = self.progress;
            /*
             * Povučeni copy se sklanja iz rasporeda, ne samo iz vidljivosti. `visibility`
             * ne prazni `offsetParent`, pa bi provera iz docs/MOTION.md prijavila hero
             * naslov kao „sakriven copy koji niko nije vratio". Vodi ga `progress`, ne
             * callback timeline-a, da stanje bude tačno i posle refresh-a i posle
             * učitavanja strane na sredini skrola.
             */
            copy.style.display = self.progress >= 0.55 ? "none" : "";
          },
        });

        return () => {
          trigger.kill();
          copy.style.display = "";
          gsap.set([copy, wordmark, visual], { clearProps: "opacity,transform,clipPath" });
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
      <div ref={visualRef} className="absolute inset-0 -z-10 will-change-transform">
        {webgl ? <LiquidCanvas drivers={drivers} active={active} /> : <HeroFallback />}
      </div>

      <div className="mx-auto flex w-full max-w-content flex-col gap-10 px-5 pt-28 pb-20 md:px-8 md:pt-32">
        <div ref={wordmarkRef} className="w-full max-w-[min(78vw,540px)] origin-top-left will-change-transform">
          <LogoSignature variant="wordmark" size="100%" className="block w-full text-ink" />
        </div>

        {/*
          Blok kontejner, ne flex: reč-spanovi u flex/grid roditelju postaju flex stavke,
          `gap` padne između reči i `lib/textReveal.ts` tada ceo element gasi kao blok.
          Razmak drži `space-y-*` (margina), pa reč-po-reč ostaje moguć.
        */}
        <div ref={copyRef} className="max-w-2xl space-y-6">
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
    </section>
  );
}
