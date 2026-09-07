"use client";

/**
 * „Preskoči" — jedini vidljivi trag reprodukcije uvoda (spec 18 → C2).
 *
 * Specifikacija traži da POSTOJEĆI indikator skrola na dnu heroja promeni tekst; indikator ne
 * postoji (hero nikad nije imao strelicu — poziv da se skrola nosi bočica koja podigne zatvarač
 * na hover). Zato ovde stoji najmanja stvar koja radi isti posao: dok animacija ide, na dnu
 * kadra je jedno dugme koje je gasi. Van reprodukcije ga nema ni u kadru ni u redu za tastaturu,
 * pa hero u miru izgleda kao i do sada.
 *
 * Klik i `Enter`/`Space` rade isto što i drugi namerni skrol (`heroPlayback` → B4): tween ide na
 * kraj, skrol se otključava i strana se predaje sledećoj sekciji.
 */
export function HeroSkip({ visible, onSkip }: { visible: boolean; onSkip: () => void }) {
  if (!visible) return null;
  return (
    // `fixed`, i van `.hero-stage`: stage ima `will-change: transform` (containing block) i u
    // drugoj polovini reprodukcije odlazi iznad kadra — dugme bi otišlo s njim baš kad zatreba.
    // `z-40` je gornja ivica skale sadržaja (docs/MOTION.md → Z-skala).
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
      <button
        type="button"
        onClick={onSkip}
        aria-label="Preskoči uvod"
        // 44 px dodirno polje (docs/BRAND.md), tekst manji od polja — meta ne sme da bude ivica slova.
        className="hero-ink-70 pointer-events-auto grid h-11 min-w-11 place-items-center rounded-full px-4 text-caption underline decoration-current/40 underline-offset-4 transition-opacity duration-200 hover:opacity-100 motion-safe:opacity-80"
      >
        Preskoči
      </button>
    </div>
  );
}
