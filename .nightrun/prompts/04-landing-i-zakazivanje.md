ultrathink

Napravi JAVNI SAJT: landing sa hero shaderom i carobnjak za zakazivanje.
Ovo je prvi ekran koji vlasnica salona vidi sutra.

PRVO PROCITAJ, u celosti, pa radi tacno ono sto pise:
  .nightrun/specs/04-landing-i-zakazivanje.md   <- puna specifikacija
  docs/MOTION.md    <- ceo, ugovor o dva sistema animacije
  docs/BRAND.md     (paragraf 6 hero, paragraf 7 raspored stranica)
  data/design-dna.json -> visual_effects
  CLAUDE.md

SKILLS koje moras da otvoris: threejs-shaders, threejs-fundamentals, threejs-materials,
gsap-scrolltrigger, gsap-timeline, gsap-plugins, gsap-performance, text-reveal, humanizer

Cetiri stvari koje najlakse puknu:
1. Dva sistema animacije. Reveal animira KONTEJNER, text-reveal reci unutra.
   Nikad oba na istom cvoru. Ako to prekrsis, tekst ostane nevidljiv.
2. Hero fallback je obavezan. Mobilni i prefers-reduced-motion NIKAD ne pokrecu
   WebGL - staticni CSS gradijent umesto toga. Njena klijentela je na telefonu.
3. Galerija: koristi photo varijantu, ALI bbm-10 (tim) i bbm-24 (zid lakova) MORAJU
   ici kao card varijanta - crop im je los, to pise u data/photos.json pod note.
   Alt tekstovi su vec napisani, koristi ih doslovno.
4. Cenovnik ima 144 usluge. Bez pretrage i akordeona je neupotrebljiv.

Sav srpski tekst koji sam pises provuci kroz skill humanizer. Tekst iz cenovnika
i alt tekstovi se NE diraju.

Zavrsna provera: typecheck, lint, test, build, i provera reveal-a iz docs/MOTION.md
mora da vrati prazan niz. Proveri i na 390px.
PRE SVEGA - provera prethodnog koraka (najvise 10 minuta na ovo):
Procitaj docs/STATUS.md ako postoji i pokreni `npm run typecheck` i `npm run lint`.
Ako je prethodni korak nesto ostavio slomljeno ili nedovrseno, popravi TO prvo.
Proveri i produkciju: https://beautybymasha-mu.vercel.app - prethodni korak je
vec deployovan. Ako je prod pao ili prikazuje gresku, to je prioritet nad tvojim zadatkom.
Jedan prolaz, ne vise. Ako ne mozes da popravis za 10 minuta, upisi u docs/STATUS.md
sta je slomljeno i nastavi sa svojim zadatkom - ne zaglavljuj se.

PREGLED U BROWSERU: nista ne radi u pozadini. Ako ti treba pogled, pokreni
`npm run dev -- -p 3001`, proveri, pa ga OBAVEZNO ugasi pre kraja koraka -
inace `npm run build` puca. Nikad port 3000.
