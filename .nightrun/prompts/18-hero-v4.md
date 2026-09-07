ultrathink

Hero v4. Koreografija iz koraka 13-16 OSTAJE netaknuta — menja se KO je vozi i gde radi.
Cetiri zahteva: (1) animacija se pusta JEDNIM malim skrolom sa vrha, traje 2,2 s, pa strana sama
odskroluje do sledece sekcije; (2) 3D bocica i na telefonu; (3) pozadina prati ziroskop na
telefonu kao sto prati misa na desktopu; (4) dugme „nazad na vrh".

PRVO PROCITAJ U CELOSTI:
  .nightrun/specs/18-hero-v4.md   <- stanja A-G, brojevi, provera F
  docs/STATUS.md (koraci 13-16), docs/MOTION.md, CLAUDE.md
  components/hero/*, components/three/HeroBottle.tsx, components/providers/SmoothScroll.tsx,
  lib/{heroChoreography,heroProgress,webgl}.ts

SKILLS: motion-design, gsap-performance, threejs-materials, apple-design, 3d-scrollytelling

TVRDA PRAVILA:
- `heroChoreography(p)` i sve sto zavisi od `p` se NE prepisuje. Uvodi se drugi izvor za `p`:
  `p = max(timeP, scrollP)`. Reload i skrol i dalje daju isto stanje.
- BEZ pina, BEZ Flip-a. Lock skrola postoji SAMO u prozoru reprodukcije (B) i mora imati prekid
  (B4) i tvrdi tajmer od 3 s. Nikakav ulaz ne sme da bude progutan duze od 150 ms.
- Samo transform/opacity/uniformi. convex/ se ne dira.
- `prefers-reduced-motion`: bez reprodukcije, locka, auto-skrola i ziroskopa.

REDOM:
A - 3D NA MALIM EKRANIMA: povuci ADR-005. `useWebGLAllowed` vise ne gleda sirinu nego sposobnost
  (WebGL2 + deviceMemory/hardwareConcurrency + prvi frejm < 120 ms). Mobilni budzet: dpr <= 1.5,
  low-power, bez antialiasa, staklo BEZ transmisije (drugi prolaz je preskup), shader 2 oktave
  (uniform, ne dve verzije koda), bocica manja i centrirana ispod copy-ja. Ako prosek frejma u
  prva 2 s prelazi 26 ms → automatski nazad na `HeroDrop`, razlog u `window.__bbmHero.downgrade`.
B - REPRODUKCIJA (`lib/heroPlayback.ts`): stanja armed → playing → handoff → done.
  Naoruzano na `scrollY <= 2` uz zadrzavanje 350 ms. Okidac: prvi wheel / touchmove > 6 px /
  Space/PageDown/ArrowDown. Reprodukcija: tween `{v:0}` → 0.75 za 2200 ms, `power2.inOut`, skrol
  zakljucan. Prekid: kumulativni delta > 120, touchmove > 60 px, Escape, klik, ili tajmer 3 s →
  `progress(1)` + otkljucaj. Handoff: `lenis.scrollTo(vrh .hero-overlap, 0.9 s, easeInOutCubic)`,
  otkljucano, korisnik moze da prekine; ostatak p (0.75 → 1) vozi pravi skrol pa je parallax
  preklop isti kao sad. Ponovno naoruzavanje kad se vrati na vrh (350 ms).
C - Indikator skrola na dnu heroja tokom reprodukcije postaje „Preskoci" (44 px, aria-label).
  Klik na „Zakazite termin" preskace animaciju i vodi na `#zakazivanje` — namera je jaca od efekta.
D - ZIROSKOP (`lib/tilt.ts`): jedan modul daje `{x,y}` iz `pointermove` ILI `deviceorientation`.
  iOS dozvolu (`requestPermission`) trazi IZ ISTOG gesta koji pusta animaciju — nikad na ucitavanju;
  odbijena dozvola = tih fallback na idle drift. Kalibracija na prvo ocitavanje (beta0/gamma0),
  mrtva zona 1,5°, lerp 0,12, amplituda POLA desktopske, odjava kad je hero van kadra.
E - DUGME ZA VRH (`components/site/BackToTop.tsx`): iznad 2 ekrana skrola, 48 px, `.nav-frost` +
  mint-deep strelica, `z-40`, safe-area, sakriveno uz otvoren meni/dijalog, `lenis.scrollTo(0, 0.8 s)`,
  posle dolaska fokus u nav. Dolazak na vrh naoruzava hero (B6).
F - PROVERA po specu (1440 i 390, obe teme): trajanje okidac→mirovanje 2,0-3,4 s; prekid otkljucava
  za <= 150 ms; sakriven tab 5 s ne ostavlja lock; ponovno naoruzavanje posle dugmeta za vrh; deep
  link ne pusta animaciju; na 390 canvas vidljiv i frejm < 26 ms uz 4x throttle (inace fallback);
  simuliran `deviceorientation` pomera `uPointer`; reduced-motion sve gasi; `.pin-spacer` 0;
  reveal 0 pending; bez prekoracenja; typecheck + lint + test + build.
G - docs/MOTION.md „Hero v4", docs/BRIEF.md (ADR-005 povucen + novi ugovor), STATUS.md na vrh.
  Commit "korak 18: hero se pusta jednim skrolom, 3D na telefonu, ziroskop, dugme za vrh" + push.

Ako neki deo ne moze bez krsenja tvrdih pravila — NE radi ga, upisi u STATUS zasto.
Dev: ako 3001 ne odgovara, `npm run dev -- -p 3001`.
