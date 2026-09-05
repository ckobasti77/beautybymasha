"use client";

import { useEffect } from "react";
import { TEXT_REVEAL } from "@/constants/textRevealConfig";
import { revealWords } from "@/lib/textReveal";
import { gsap } from "@/lib/gsap";

/**
 * Site-wide otkrivanje copy-ja (Sistem 1 iz docs/MOTION.md). Montira se jednom u
 * Providers i ne renderuje ništa.
 *
 * `hideCss()` sakrije svaki copy-kandidat na `opacity:0` pre prvog paint-a. Ovaj
 * modul je JEDINI koji ga vraća — zato mora da garantuje da NIŠTA ne ostane sakriveno
 * (docs/MOTION.md, .nightrun/specs/09-popravke.md A1: „bolje bez animacije nego nevidljivo").
 *
 * Otkrivanje je odvezano od IntersectionObserver-a: IO je optimizacija (lep, animiran
 * ulaz), a garanciju daje `sweep()` na čistoj geometriji (`getBoundingClientRect`),
 * nezavisan od IO async-isporuke, Lenis smooth-skrola i pinovanog heroja. `fire` je
 * idempotentan, pa IO i sweep ne mogu dva puta da otkriju isti element.
 *
 * Ne dodavati drugu animaciju opacity-ja na tekst — vidi .claude/skills/text-reveal.
 */
export function TextRevealGlobal() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();
    const waiting = new Set<HTMLElement>();

    // `force` = odmah, bez animacije (element je prošao ili je fallback poslednje šanse).
    const fire = (el: HTMLElement, force = false) => {
      if (!waiting.has(el)) return; // već otkriven — IO/sweep/ticker se ne biju
      waiting.delete(el);
      io.unobserve(el);
      // settle: posle ulaza reči se vraćaju u običan tekst (bez .reveal-word omotača)
      revealWords(el, { instant: force || reduced, settle: true });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) fire(entry.target as HTMLElement);
        }
      },
      { rootMargin: `0px 0px -${TEXT_REVEAL.enterRatio * 100}% 0px`, threshold: 0 },
    );

    const take = (el: HTMLElement) => {
      if (seen.has(el)) return;
      // chrome i opt-out podstabla
      if (el.closest(TEXT_REVEAL.skipSelector)) return;
      // omotači (npr. <li> sa <h3> unutra) nisu tekst — njihova deca jesu
      if (el.querySelector(TEXT_REVEAL.nestedSelector)) return;
      if (!(el.textContent ?? "").trim()) return;
      seen.add(el);
      waiting.add(el);
      el.dataset.revealState = "pending";
      io.observe(el);
    };

    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(TEXT_REVEAL.candidateSelector)) take(root);
      for (const el of root.querySelectorAll<HTMLElement>(TEXT_REVEAL.candidateSelector)) take(el);
    };

    scan(document.body);

    /**
     * Sigurnosna mreža — jedini garant vidljivosti. Za svaki `waiting` element,
     * po čistoj geometriji:
     *  - prošao IZNAD kadra (`bottom < 0`) → odmah, bez animacije,
     *  - ušao 15% u kadar (`top < enterLine`) → animirano (isti prag kao IO, ali vodi
     *    ga sweep a ne async IO isporuka koju Lenis/pin ume da preskoči),
     *  - na dnu strane (nema više kuda) → sve što je vidljivo, jer poslednjih 15%
     *    nikad ne pređe skraćeni root.
     * Redosled je DOM redosled (scan) → čitanje odozgo nadole.
     */
    const sweep = () => {
      if (!waiting.size) return;
      const h = window.innerHeight;
      const enterLine = h * (1 - TEXT_REVEAL.enterRatio);
      const doc = document.documentElement;
      const atBottom = window.scrollY + h >= doc.scrollHeight - 2;
      for (const el of [...waiting]) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0) fire(el, true);
        else if (r.top < enterLine && r.bottom > 0) fire(el);
        else if (atBottom && r.top < h && r.bottom > 0) fire(el);
      }
    };

    /** Poslednja šansa: sve što je dotaklo kadar (`top < innerHeight`) → odmah. */
    const sweepForce = () => {
      if (!waiting.size) return;
      const h = window.innerHeight;
      for (const el of [...waiting]) {
        if (el.getBoundingClientRect().top < h) fire(el, true);
      }
    };

    // scroll → sweep, throttlovan na jedan poziv po frejmu
    let rafScheduled = false;
    const onScroll = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        sweep();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sweep);
    window.addEventListener("orientationchange", sweep);

    /**
     * Hardening: deljeni gsap.ticker (isti RAF koji vozi Lenis) prolazi sweep ~8 Hz
     * DOK ima nečeg u `waiting` — pokriva slučaj da native `scroll` ne stigne pod
     * Lenis-om. Kad se `waiting` isprazni, rana provera ga svede na nulu troška.
     */
    let lastTick = 0;
    const onTick = () => {
      if (!waiting.size) return;
      const now = performance.now();
      if (now - lastTick < 120) return;
      lastTick = now;
      sweep();
    };
    gsap.ticker.add(onTick);

    // load: layout je slegao (fontovi, slike) → još jedan animiran prolaz
    const onLoad = () => sweep();
    if (document.readyState === "complete") sweep();
    else window.addEventListener("load", onLoad);

    // 3 s posle učitavanja: svaki pending iznad preloma se otkriva odmah (spec A1)
    const forceTimer = window.setTimeout(sweepForce, 3000);

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node as HTMLElement);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      waiting.clear();
      gsap.ticker.remove(onTick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sweep);
      window.removeEventListener("orientationchange", sweep);
      window.removeEventListener("load", onLoad);
      window.clearTimeout(forceTimer);
    };
  }, []);

  return null;
}
