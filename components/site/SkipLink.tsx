/**
 * Prvi element koji tastatura dohvati na svakoj stranici (WCAG 2.1 §2.4.1).
 *
 * Bez njega bi svaki gost koji se kreće tabom morao da prođe kroz celu
 * navigaciju pre nego što stigne do sadržaja — na stranici proizvoda to je
 * desetak dodira. Ovako je jedan.
 *
 * Link je vidljiv tek kad dobije fokus. `sr-only` ga sklanja sa ekrana ali ga
 * ostavlja u redosledu fokusiranja; `focus:` klase ga vraćaju u gornji levi ugao.
 * `<a>` je u `skipSelector`-u text-reveal sistema, pa ga otkrivanje teksta ne dira.
 *
 * Meta je `#sadrzaj` — id koji nosi `<main>` na svakoj ruti, uključujući panel.
 */
export function SkipLink() {
  return (
    <a
      href="#sadrzaj"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-pill focus:bg-fg focus:px-5 focus:text-bg focus:no-underline focus-ring"
    >
      Preskoči na sadržaj
    </a>
  );
}
