# Korak 11 — cenovnik kao ulaz u zakazivanje + swatch-evi kao kap laka

## A. CENOVNIK — sada je zid, treba da bude alat

Klijent: "mnogo dugacak, mnogo los UX". 144 stavke u 9 akordeona. Trazi:
1. bolji pregled, 2. pretragu "da zene mogu da nadju", 3. **iz cenovnika pravo u zakazivanje**.

### Struktura
- **Sticky traka grupa** (horizontalni cipovi, skroluju se na mobilnom): Nega ruku ·
  Nega nogu · Depilacija · Masaza · Trepavice i obrve · Ostalo. Klik = filter, ne skok.
  Depilacija spaja 4 podgrupe (vosak z/m, pasta z/m) pod jedan cip sa pod-filterom.
- **Pretraga** ostaje na vrhu, sticky uz cipove. Traži po nazivu I po sinonimima
  (npr. "gel" nalazi "trajni lak" i "ORLY gel"; "obrve" nalazi i kanu i lift).
  Rezultat se boji (highlight pogodka). Prazno stanje: "Nema '...' — pozovite nas, možda
  radimo i to." sa dugmetom Pozovi.
- **"Najcesce"** na vrhu kad nema filtera: 6 usluga koje klijent bira — [POTVRDITI kod
  vlasnice], za sad: Manikir + trajni lak, Pedikir + trajni lak, Depilacija cele noge,
  Relax masaza 60, Lash lift + botox, Korekcija ORLY gelom M.
- **Red usluge**: naziv · trajanje · cena · dugme **"Zakazi"**. Na mobilnom cela kartica
  je dodirljiva. Dodaci (`addon: true`) NISU zasebni redovi — prikazuju se kao cipovi
  ispod roditeljske grupe ("Dodaci: French +300 · Nail art +150 · ...").
- Paketi (`package: true`) imaju oznaku "paket od 10" i dugme "Raspitajte se" (tel:).
- Usluge bez cene: "na upit", dugme Pozovi, bez Zakazi.
- Ispod grupa Nega ruku i Nega nogu: jedan red "Lakovi koje koristimo →" ka /shop.
  To je veza cenovnik → prodaja koju klijent trazi.

### "Zakazi" → carobnjak, sa uslugom vec izabranom
- Klik vodi na `#zakazivanje?usluga=<key>` (glatki skrol Lenis-om).
- `BookingWizard` cita `usluga` iz URL-a (i slusa custom event `bbm:book` za klik bez
  reload-a), preskace korak Usluga, ide na Lokacija → Dan i vreme, a u rezimeu je usluga
  vec upisana. Korisnik moze da je promeni ("Promeni uslugu").
- Ako je kljuc nepoznat ili usluga nije bookable — carobnjak krece normalno, bez greske.
- Isti mehanizam koristi i ServicesCircles (5 krugova) → filter cenovnika po grupi.

## B. SWATCH-EVI — kap laka snimljena odozgo, po finisu (OBAVEZNO, klijent insistira)

Referenca: ORLY "Colors & Finishes" — svaka boja je fotografija kapi laka: sjaj gore,
tamniji obod dole, vidljiva dubina, i **tekstura zavisi od finisa**. Sada su ravni krugovi.

Jedna komponenta `ProductSwatch` (vec postoji — prepisi je), cist CSS/SVG, BEZ slika,
mora da radi za svih 70 boja ukljucujuci 20 ENTITY bez fotografije. Props: hex, finish, size.

Zajednicka osnova (svaki finis):
- oblik: krug sa blago nepravilnim `border-radius` (npr. 48% 52% 50% 50% / 51% 49% 51% 49%)
- telo: `radial-gradient` — svetlije gore-levo (oko 30% 25%), boja u sredini, tamnije
  (`color-mix` sa crnom 18-25%) na donjem-desnom rubu → dubina tecnosti
- specular: ostar beli odsjaj gore-levo, ~14% precnika, `blur(1px)`, alfa 0.9
- sekundarni odsjaj: sirok mek beli luk po gornjoj ivici, alfa 0.18
- obod: `inset box-shadow` tamniji na dnu (kap ima debljinu)
- senka na podlozi: `box-shadow` 0 10px 24px u tonu boje (color-mix sa hex, alfa .35),
  NIKAD crna
- tamna tema: senka i odsjaji se malo pojacaju da se kap odvoji od podloge

Po finisu (`finish` iz products.json):
- `creme`: samo osnova. Glatko, kremasto.
- `sheer`: alfa tela 0.55, svetlija sredina, odsjaj mekši — providno.
- `shimmer`: fina zrnasta tekstura — SVG `feTurbulence` (baseFrequency ~0.9) kao maska
  belih tackica, alfa 0.25, preko osnove.
- `glitter`: krupnije cestice — dva sloja `feTurbulence` razlicitih frekvencija, tackice
  u beloj i u boji za 20% svetlijoj, alfa 0.5. Kao konfeti na ORLY referenci.
- `holo`: kao glitter + `conic-gradient` duginih tonova alfa 0.22 preko svega.
- `metallic`: vrtlozna tekstura — `feTurbulence` type=turbulence, niska frekvencija,
  velika amplituda, `feDisplacementMap` na linear-gradient svetlo/tamno — kao "Golds".
- `duochrome`: dve boje — hex i hex pomeren za ~40° hue (`color-mix` u `oklch` prostoru),
  `linear-gradient` 135°, pa osnova preko.
- `base` / `top` / `treatment`: providna kap — telo alfa 0.35, jaci odsjaji, bez teksture.

Hover: postojeci gloss sweep ostaje i klizi PREKO reljefa. Plus blago podizanje (2px)
i senka se produbi. Na touch bez hovera.
Performanse: SVG filteri su u JEDNOM `<svg>` sa `<defs>` na stranici, swatch-evi ga
referenciraju po id-u — ne 70 kopija filtera. Proveri da mreza od 70 skroluje glatko.

Primeni na: shop mreza, detalj proizvoda, ORLY/ENTITY sekcija na landingu, admin
Proizvodi, korpa. Svuda ista komponenta.

## C. PROVERA
- cenovnik: pretraga "gel" nalazi trajni lak; klik Zakazi na Manikir → carobnjak na
  koraku Lokacija sa "Manikir" u rezimeu; URL `#zakazivanje?usluga=manikir` radi i direktno
- swatch: na 70 karticama se razlikuju creme / glitter / metallic / sheer golim okom
- 390 px: cipovi grupa se skroluju horizontalno, red usluge je dodirljiv celom povrsinom
- reveal provera iz docs/MOTION.md i dalje 0; typecheck, lint, test, build
