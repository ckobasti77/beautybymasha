/**
 * Mek veo iza kolone sa copy-jem u heroju (spec 12 → J, spec 13 → E): radijalni gradijent,
 * alfa .55 u centru kolone → 0 na ivicama, ~120 % širine kolone. Bez tvrdih ivica i bez
 * kutije — treba da izgleda kao da je lak tu tanji, pa naslov i pasus prolaze AA i na
 * najsvetlijem delu shadera.
 *
 * Dva sloja koji se crossfade-uju po `#hero[data-ink]` (globals.css → `.hero-scrim-*`):
 * papirni veo dok je tekst taman, ink veo kad razlivena boja traži svetao tekst — beo tekst
 * preko papirnog vela bi pao ispod AA. Boje su literali (`#FAF6F1`, `#12100F`), ne tokeni:
 * podloga heroja je uvek svetla, i u tamnoj temi. Roditelj mora da bude `relative`; stage je
 * `isolate`, canvas `-z-10`, pa `-z-[1]` pada iznad canvasa a ispod teksta.
 */
export function HeroScrim() {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-y-10 -left-[10%] -z-[1] w-[120%]">
      <div className="hero-scrim-paper absolute inset-0" />
      <div className="hero-scrim-ink absolute inset-0" />
    </div>
  );
}
