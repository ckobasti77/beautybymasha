ultrathink

Dve stvari koje klijent najvise gleda: cenovnik koji vodi u zakazivanje, i boje lakova
koje izgledaju kao prave kapi a ne kao flat krugovi. Sajt je stabilan posle koraka 10.

PRVO PROCITAJ u celosti:
  .nightrun/specs/11-cenovnik-swatch.md   <- sve sto treba, sa merama
  docs/BRAND.md, docs/MOTION.md, CLAUDE.md, data/products.json (polje `finish`)

SKILLS: text-reveal, gsap-react, humanizer, design-taste-frontend

A - CENOVNIK. Sada: 144 stavke u 9 akordeona, "mnogo dugacak, mnogo los UX".
    Treba: sticky cipovi grupa + pretraga sa sinonimima, "Najcesce" na vrhu, dodaci kao
    cipovi a ne redovi, i na SVAKOM redu dugme **Zakazi** koje vodi u carobnjak sa tom
    uslugom vec izabranom (`#zakazivanje?usluga=<key>`, preskace korak Usluga).
    BookingWizard mora da cita `usluga` iz URL-a i da slusa event `bbm:book`.
    Ispod Nega ruku / Nega nogu: red "Lakovi koje koristimo →" ka /shop.

B - SWATCH-EVI (klijent insistira, obavezno). Referenca je ORLY "Colors & Finishes":
    kap laka snimljena odozgo — sjaj gore-levo, tamniji obod dole, dubina, i TEKSTURA
    PO FINISU: creme glatko, sheer providno, shimmer zrnasto, glitter konfeti cestice,
    metallic vrtlog (kao "Golds"), duochrome dvobojni preliv, holo duga preko glitera,
    base/top/treatment providna kap. Cist CSS + SVG filteri (feTurbulence,
    feDisplacementMap), BEZ slika — mora da radi za svih 70 boja. SVG filteri u JEDNOM
    <defs> na stranici, ne 70 kopija. Prepisi postojeci components/shop/ProductSwatch.tsx
    i koristi ga SVUDA: shop mreza, detalj, landing ORLY sekcija, admin, korpa.
    Hover gloss sweep ostaje i klizi preko reljefa.

PROVERA (spec, sekcija C): pretraga "gel" nalazi trajni lak; Zakazi na Manikir otvara
carobnjak na koraku Lokacija sa Manikirom u rezimeu; 70 swatch-eva se golim okom
razlikuju po finisu; 390 px radi; reveal provera iz MOTION.md i dalje 0.
Plus typecheck, lint, test, build.

Sav srpski tekst koji sam pises kroz skill humanizer. Nepoznato = [POTVRDITI].
PREGLED: `npm run dev -- -p 3001`, proveri STVARNO u browseru, pa ga ugasi pre kraja.
