/**
 * Mek veo iza kolone sa copy-jem u heroju (spec 12 → J): radijalni gradijent boje
 * papira, alfa .55 u centru kolone → 0 na ivicama, ~120 % širine kolone. Bez tvrdih
 * ivica i bez kutije — treba da izgleda kao da je lak tu tanji, pa naslov i pasus prolaze
 * AA i na najsvetlijem delu shadera.
 *
 * Boja je literal (`#FAF6F1`), ne token: podloga heroja je uvek svetla, i u tamnoj temi
 * (isto kao `HeroFallback`). Roditelj mora da bude `relative`; hero je `isolate`, canvas
 * `-z-10`, pa `-z-[1]` pada iznad canvasa a ispod teksta.
 */
export function HeroScrim() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-y-10 -left-[10%] -z-[1] w-[120%]"
      style={{
        background:
          "radial-gradient(closest-side, rgba(250,246,241,0.55) 0%, rgba(250,246,241,0.32) 45%, rgba(250,246,241,0) 100%)",
      }}
    />
  );
}
