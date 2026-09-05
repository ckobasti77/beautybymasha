"use client";

import { useEffect } from "react";
import { TEXT_REVEAL } from "@/constants/textRevealConfig";
import { revealWords } from "@/lib/textReveal";

/**
 * Site-wide otkrivanje copy-ja (Sistem 1 iz docs/MOTION.md). Montira se jednom u
 * Providers i ne renderuje ništa.
 *
 * Jedan IntersectionObserver (root skraćen odozdo za enterRatio) pali svaki element
 * tačno jednom, 15% u viewport-u. MutationObserver hvata copy koji stigne kasnije.
 * prefers-reduced-motion → tekst se pojavi odmah, bez blur-a i pomeranja.
 *
 * Ne dodavati drugu animaciju opacity-ja na tekst — vidi .claude/skills/text-reveal.
 */
export function TextRevealGlobal() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();
    const waiting = new Set<HTMLElement>();

    const fire = (el: HTMLElement) => {
      waiting.delete(el);
      io.unobserve(el);
      // settle: posle ulaza reči se vraćaju u običan tekst (bez .reveal-word omotača)
      revealWords(el, { instant: reduced, settle: true });
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
     * Copy u poslednjih 15% poslednjeg ekrana (podnožje) nikada ne pređe skraćeni
     * root — strana više nema kuda da se skroluje. Kad se stigne do dna, pusti sve
     * što je vidljivo, da ništa ne ostane sakriveno.
     */
    const flushAtBottom = () => {
      const doc = document.documentElement;
      if (window.scrollY + window.innerHeight < doc.scrollHeight - 2) return;
      for (const el of [...waiting]) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) fire(el);
      }
    };
    window.addEventListener("scroll", flushAtBottom, { passive: true });
    window.addEventListener("resize", flushAtBottom);

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
      window.removeEventListener("scroll", flushAtBottom);
      window.removeEventListener("resize", flushAtBottom);
    };
  }, []);

  return null;
}
