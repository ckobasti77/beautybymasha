/**
 * Jedan `<script type="application/ld+json">`. Sadržaj je naš objekat, ne
 * korisnički unos, ali `<` se svejedno eskejpuje — bez toga bi opis proizvoda
 * sa `</script>` u sebi zatvorio skriptu i razbio stranicu.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
