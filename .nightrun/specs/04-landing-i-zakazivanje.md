ultrathink

Napravi JAVNI SAJT: landing stranicu sa hero shaderom i čarobnjak za zakazivanje.
Ovo je prvi ekran koji vlasnica salona vidi. Mora da izgleda skupo i da radi na telefonu.

PROČITAJ PRE KODA:
- CLAUDE.md, docs/BRAND.md (§6 hero, §7 raspored), docs/MOTION.md (CEO — ugovor o dva sistema)
- data/design-dna.json → visual_effects (shader parametri, scroll scenario, image_effects)
- lib/site.ts, lib/services.ts, lib/products.ts, lib/photos.ts — svi podaci su tu, tipovani
- components/motion/Reveal.tsx, components/ui/*, components/brand/Logo.tsx — postoje, koristi ih
- convex/availability.ts, convex/bookings.ts — backend zakazivanja postoji
- SKILLS, obavezno: threejs-shaders, threejs-fundamentals, threejs-materials,
  gsap-scrolltrigger, gsap-timeline, gsap-plugins (Flip), gsap-performance, text-reveal, humanizer
- _ref/colorcutchris/components/booking/ — ceo čarobnjak (koraci, slot čipovi, nedeljna traka,
  rezime, uspeh, roving radio). Prilagodi, ne prepisuj slepo.

HERO — "tečni lak" (najvažnijih 100 linija na sajtu):
- R3F, jedan PlaneGeometry(2,2), OrthographicCamera, ShaderMaterial
- Fragment shader: 3 sloja fBm simplex šuma sa domain warpingom u dva prolaza,
  paleta iz design-dna (#57BFA8 → #C9E9E1 → #FBDCE9 → #FAF6F1), plus specular
  highlight koji lenjo klizi i čita se kao mokar lak. Pun ciklus ~24 s.
- Uniformi: uTime, uPointer, uScroll, uPalette[4], uReduced, uResolution
- Pointer gura polje sa inercijom (lerp 0.06). Scroll pomera dubinu.
- dpr={[1, 1.75]}, antialias false, frameloop="demand" van viewporta, pauza na
  visibilitychange i kad hero izađe iz kadra.
- FALLBACK JE OBAVEZAN: ako !WebGL2 || prefers-reduced-motion || max-width 768px →
  NE montiraj Canvas uopšte. Statični CSS radial-gradient u istim bojama.
  Mobilni NIKAD ne pokreće WebGL — njena klijentela je pretežno na telefonu.

SCROLL SCENARIO (docs/MOTION.md §Hero) — samo desktop:
1. 0–15%: shader diše, copy stiže reč po reč, dugmad poslednja
2. 15–60%: hero pinovan, uScroll raste, wordmark se GSAP Flip-om smanjuje i seli
   u navigaciju kao logo
3. 60–100%: shader se skuplja u KRUG (motiv iz logotipa), smanjuje se i predaje
   ekran prvoj ikoni sekcije Usluge
4. Navigacija dobija frosted podlogu tek kad hero izađe iz kadra
Na mobilnom i uz reduced-motion: bez pina, bez Flipa, običan skrol.

SEKCIJE (docs/BRAND.md §7, tim redom):
Nav · Hero · Loyalty traka (samo neulogovani) · Usluge (5 krugova) · Zakazivanje ·
Radovi (galerija) · ORLY/ENTITY istaknuti · Cenovnik · Lokacije · Recenzije · Kontakt/Footer

- Usluge: 5 krugova (Nokti, Depilacija, Masaža, Trepavice i obrve, Nega lica),
  svaki vodi na cenovnik sa filterom
- Radovi: masonry iz lib/photos.ts. Koristi `photo` varijantu (čista fotografija).
  IZUZETAK: bbm-10 (tim) i bbm-24 (zid lakova) MORAJU ići kao `card` — crop im je loš,
  to piše u photos.json → note. Lightbox. Reveal variant="clip", stagger.
  alt tekstovi su VEĆ napisani u photos.json — koristi ih doslovno.
- Cenovnik: pretraga (sticky) + akordeon po 9 grupa, svih 144 usluge sa cenom i trajanjem.
  Usluge bez cene (priceRsd null) prikazuju "na upit".
- Lokacije: dve kartice, radno vreme SVAKE posebno (Mimoza ne radi ponedeljkom),
  dugmad "Pozovi" i "Navigacija" (Google Maps preko mapsQuery).
- Recenzije: 011info navodi 28 ocena. Bez izmišljenih citata — prikaži samo broj
  i link, uz [POTVRDITI da smemo da citiramo].

ČAROBNJAK ZA ZAKAZIVANJE — ugrađen u landing, ne zasebna stranica:
Koraci: Lokacija → Usluga → Dan i vreme → Podaci → Potvrda
- Lokacija: dve velike kartice sa radnim vremenom
- Usluga: 144 usluge se NE prikazuju kao lista. Grupa → pretraga → usluga.
  Svaka pokazuje trajanje i cenu.
- Dan i vreme: nedeljna traka + slot čipovi iz convex availability.slots.
  Prazan dan kaže zašto (zatvoreno / popunjeno / prekasno za danas).
- Podaci: ime, telefon (obavezno), email (opciono), napomena
- Potvrda: "Zahtev je primljen. Javljamo se u roku od X h da potvrdimo termin."
- Greške sa servera se prikazuju na srpskom, sa radnjom: "Termin je upravo zauzet.
  Izaberite drugi." Ne "Error".
- Pun keyboard pristup, roving radio za slotove, aria-live za promene.

TEKST: sav srpski tekst koji sam pišeš provuci kroz skill `humanizer`.
Bez "vrhunski", "nezaboravno iskustvo", "posvećeni smo". Ton je stručan i konkretan,
persiranje. Tekst iz cenovnika i alt tekstovi iz photos.json se NE diraju.

PROVERA PRE "GOTOVO":
- npm run typecheck && npm run lint && npm test && npm run build
- Provera reveal-a iz docs/MOTION.md mora da vrati prazan niz
- Mobilni 390px: hero BEZ canvasa, ništa ne izlazi iz ekrana, nema horizontalnog skrola

---
PREGLED U BROWSERU (vazi za svaki korak):
Nista ne radi u pozadini. Kad menjas convex/ fajlove, sam pokreni `npx convex dev --once`
(to je i deo zavrsne provere). NE pokreci `npx convex dev` u watch rezimu - tuce se sa `--once`.
Next dev server takodje ne radi, jer bi se tukao sa `npm run build` oko .next foldera.
Ako ti treba vizuelna provera:
  1. pokreni `npm run dev -- -p 3001`
  2. otvori http://localhost:3001 i proveri sta ti treba
  3. OBAVEZNO ga ugasi pre nego sto zavrsis korak (inace `npm run build` puca)
Nikad ne koristi port 3000 - moze biti zauzet.
