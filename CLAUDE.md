@AGENTS.md

# Beauty by Masha

Sajt kozmetičkog salona u Belvilleu (Novi Beograd): **landing + onlajn zakazivanje za
dva lokala + ORLY webshop + jedan admin panel**. Sve na srpskom, latinica (`sr-Latn`).

## Pročitaj pre bilo kakvog koda

| Fajl | Šta sadrži |
| --- | --- |
| `docs/BRIEF.md` | ko je klijent, lokacije, radno vreme, šta radi, šta prodaje, sve odluke (ADR) |
| `docs/BRAND.md` | boje, tipografija, motion, raspored svake stranice |
| `docs/ADMIN.md` | specifikacija admin panela |
| `docs/MOTION.md` | **ugovor o dva sistema animacije — pročitaj pre bilo koje animacije** |
| `data/design-dna.json` | Design DNA profil (tokeni, stil, vizuelni efekti) — ulaz za design-dna skill |
| `data/site.json` | lokacije, radno vreme, kontakt, kapacitet, loyalty, poštarina |
| `data/services.json` | 144 usluge sa cenama (verbatim iz cenovnika) i procenjenim trajanjima |
| `data/products.json` | 50 ORLY proizvoda sa slikama, cenama i swatch bojama |

## Referentni kod — `_ref/` (samo za čitanje)

Dva gotova, produkciona projekta iz kojih portujemo. **Nikada ne importuj iz `_ref/`** —
to je čitanka, ne biblioteka. Prepiši i prilagodi u naš kod.

- `_ref/colorcutchris/` — **sistem zakazivanja** (Convex). Motor dostupnosti
  (`convex/lib/availability.ts`, `convex/bookings.ts`, `lib/slots.ts`), čarobnjak
  (`components/booking/`), admin (`app/admin/`), text-reveal, dizajn tokeni.
  Snimci ekrana kako to izgleda: `_ref/colorcutchris/docs/screenshots/`.
- `_ref/studio-lady-gaga/` — **webshop** (Convex). Proizvodi i kategorije
  (`convex/products.ts`), porudžbine i analitika (`convex/orders.ts`), korpa
  (`contexts/cart-context.tsx`), IPS QR plaćanje (`lib/ips-qr.ts`, `lib/ips-purpose.ts`),
  checkout (`app/placanje/`), admin porudžbina (`app/admin/evidencija-narudzbina/`).

`_ref/` je izuzet iz `tsconfig.json`, ESLint-a i git-a.

## Pravila

- **Ne izmišljaj podatke o klijentu.** Sve što nije u `docs/BRIEF.md` je `[POTVRDITI]`.
  Ako ti treba podatak kojeg nema — napiši `[POTVRDITI]` u kod i prijavi u odgovoru.
- **Cene usluga su verbatim** iz njenog cenovnika. Nikad ih ne menjaj.
  **Trajanja su procena** i smeju da se menjaju samo kroz admin.
- Sve slike idu kroz `next/image` i **moraju biti AVIF**. Spoljne slike skida
  `node scripts/fetch-assets.mjs` u `public/` — u kodu se koriste samo lokalne putanje.
- Srpski tekst: `š đ č ć ž` u UI-ju; **ključevi, slug-ovi i imena fajlova bez dijakritika**.
- Cene: `2.300 RSD`. Datumi: `sr-Latn-RS`. Vreme 24 h.
- Mobilni prvo. Tap-target ≥ 44 px. Kontrast AA. `prefers-reduced-motion` se poštuje.
- Nula ESLint upozorenja, `tsc --noEmit` prolazi. To je uslov za „gotovo".

## Skills — koristi ih, nisu ukras

U `.claude/skills/` je 51 skill. Ovi su obavezni za ovaj projekat:

| Skill | Kada |
| --- | --- |
| `text-reveal` | **Uvek pre dodavanja ili izmene bilo kog teksta na sajtu.** Sistem već postoji — pročitaj šta pokriva pa ga ne razbij. Vidi `docs/MOTION.md`. |
| `design-dna` | Faza 3 (generisanje) iz `data/design-dna.json`. Profil je već izvučen — ne radi Fazu 2 ponovo. |
| `gsap-react` | Svaka GSAP animacija u React komponenti — `useGSAP`, scope, cleanup. |
| `gsap-scrolltrigger` | Svaki scroll-vezan ulaz, pin, parallax, scrub. |
| `gsap-timeline` | Koreografija više elemenata u nizu (ulaz sekcije, hero scenario). |
| `gsap-core` | `stagger`, easing, `gsap.matchMedia()` za responsive i reduced-motion. |
| `gsap-performance` | Pre nego što kažeš da je gotovo — transformi, batching, `will-change`. |
| `gsap-plugins` | Flip (wordmark → logo u navigaciji), Observer, Draggable u adminu. |
| `threejs-shaders` | Hero „tečni lak" fragment shader — fBm, domain warping, uniformi. |
| `threejs-fundamentals` | Postavka R3F scene, ortografska kamera, `frameloop="demand"`. |
| `threejs-materials` | `ShaderMaterial`, uniformi, optimizacija. |
| `threejs-interaction` | Pointer u shaderu, inercija. |
| `humanizer` | **Svaki srpski tekst koji sami pišemo prolazi kroz ovo pre nego što ostane.** Bez „vrhunski", „nezaboravno iskustvo", „posvećeni smo". Njen ton je stručan i konkretan. Tekst preuzet sa njenog Instagrama ili iz cenovnika se NE humanizuje — on je već njen. |
| `seo-local` + `seo-schema` + `seo-maps` | Dva lokala = dva `LocalBusiness` entiteta, `NAP` doslednost, Google Business povezivanje. Prompt 7. |
| `seo-sitemap` + `seo-technical` + `seo-images` | `sitemap.ts`, `robots.ts`, Core Web Vitals, alt tekstovi. Prompt 7. |
| `seo-ecommerce` | `Product` i `Offer` schema za ORLY katalog. Prompt 5 i 7. |
| `site-architecture` | Struktura URL-ova i interno linkovanje — pre nego što se naprave rute. |
| `popups` | Loyalty poziv za neulogovane — kad se prikaže, kako se gasi, da ne smeta. |

Ostali `seo-*` skillovi su tu ako zatrebaju; ne pozivaj ih bez potrebe.

## Komande

```bash
npm run dev            # Next dev
npx convex dev         # u drugom terminalu - obavezno uz dev
npm run build          # produkcioni build
npm run lint           # ESLint, nula upozorenja
npm run typecheck      # tsc --noEmit
node scripts/fetch-assets.mjs   # skida i konvertuje slike u AVIF
```

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
