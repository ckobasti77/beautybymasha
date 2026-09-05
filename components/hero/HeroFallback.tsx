/**
 * Podloga hero sekcije kad WebGL ne sme da se pokrene: mobilni, `prefers-reduced-motion`
 * ili browser bez WebGL2 (docs/BRAND.md §6, ADR-005).
 *
 * Statična je namerno. Animirani `background-position` preko gradijenta preko celog
 * ekrana repaint-uje ceo prvi ekran u svakom frejmu, a njena klijentela je pretežno
 * na telefonu — to je baš onaj uređaj koji tu cenu ne treba da plati.
 *
 * Iste četiri boje kao shader: `data/design-dna.json` → background_effects.color_palette.
 */
export function HeroFallback() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundColor: "#FAF6F1",
        backgroundImage: [
          "radial-gradient(72% 58% at 18% 22%, #57BFA8 0%, rgba(87,191,168,0) 62%)",
          "radial-gradient(64% 52% at 82% 16%, #C9E9E1 0%, rgba(201,233,225,0) 58%)",
          "radial-gradient(78% 64% at 70% 88%, #FBDCE9 0%, rgba(251,220,233,0) 60%)",
          "radial-gradient(90% 72% at 50% 50%, rgba(250,246,241,0) 42%, #FAF6F1 100%)",
        ].join(","),
      }}
    />
  );
}
