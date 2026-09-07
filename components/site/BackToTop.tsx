"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useOptionalLenis } from "@/components/providers/SmoothScroll";
import { easeInOutCubic } from "@/lib/heroPlayback";

/**
 * „Nazad na vrh" (spec 18 → E).
 *
 * Strana je duga: landing ima devet sekcija, cenovnik 144 stavke. Do sada je jedini put nagore
 * bio ručno skrolovanje ili nav (koji se pri skrolu naniže sakriva). Dugme se pojavljuje tek
 * posle DVA ekrana — pre toga vrh je na dohvat i dugme bi bilo smeće u kadru.
 *
 * Dolazak na vrh usput NAORUŽAVA hero: `lib/heroPlayback.ts` gleda samo `scrollY <= 2` i
 * zadržavanje 350 ms, pa ovde nema nijedne posebne linije za to (B6).
 *
 * Posle dolaska fokus ide u navigaciju — inače bi tastatura ostala na dnu strane, na dugmetu
 * koje je u međuvremenu nestalo.
 */

/** Ispod dva ekrana skrola dugmeta nema. */
const SHOW_AFTER_SCREENS = 2;
const DURATION_S = 0.8;

export function BackToTop() {
  const pathname = usePathname();
  const lenis = useOptionalLenis();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Meni i dijalozi zaključavaju `body` — dok su otvoreni dugme se ne vidi (spec 18 E).
    const locked = () => document.body.style.overflow === "hidden";
    const sync = () => setShow(window.scrollY > SHOW_AFTER_SCREENS * window.innerHeight && !locked());

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      observer.disconnect();
    };
  }, []);

  // Panel nema hero ni dugu naslovnu stranu; njegova navigacija je već fiksirana dole.
  if (pathname.startsWith("/admin")) return null;

  const toTop = () => {
    const focusNav = () => {
      const target =
        document.getElementById("nav-logo-slot")?.closest("a") ??
        document.querySelector<HTMLElement>("nav a, nav button");
      target?.focus();
    };
    if (lenis?.current) {
      lenis.current.scrollTo(0, { duration: DURATION_S, easing: easeInOutCubic, onComplete: focusNav });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(focusNav, DURATION_S * 1000);
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Nazad na vrh"
      title="Nazad na vrh"
      // `z-40` je gornja ivica skale sadržaja (docs/MOTION.md → Z-skala): ispod nav-a (100) i
      // ispod dijaloga (110). `hidden` uz `opacity` — nevidljivo dugme ne sme da hvata klik ni
      // da bude na redu za tastaturu, a `motion-safe` prelaz ne pomera raspored.
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      className={`nav-frost fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 grid size-12 place-items-center overflow-hidden rounded-full text-mint-deep transition-[opacity,transform] duration-200 ease-out ${
        show ? "opacity-100" : "pointer-events-none scale-90 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
