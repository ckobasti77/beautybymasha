# Korak 12 — 3D bocica na desnoj strani heroja, sa scroll koreografijom

## Sta postoji
Korak 08 je napravio proceduralnu bocicu: `components/three/bottleGeometry.ts`,
`BottleScene.tsx` (mesh `Liquid` prima `hex`, boja se lerp-uje), `BottleShowcase.tsx`.
Koristi se u shop heroju (`components/shop/ShopHeroBottle.tsx`). Radi.
Klijent: "desna strana heroja je prazna — stavi tu tu 3D bocicu i neka se nesto desava
na skrol, da se pomera, razliva". Nista nije radjeno u Blenderu i ne treba — proceduralna
bocica je 0 bajtova mreze.

## A. JEDAN CANVAS, NE DVA
Hero vec ima R3F canvas sa shaderom (plane). Bocica ide u ISTI canvas:
shader plane pozadi (ortografski sloj ili fullscreen quad sa `depthTest: false`,
`renderOrder: -1`), bocica ispred u perspektivnoj kameri. Jedan WebGL kontekst.
Ako je tehnicki cistije, dve scene u istom rendereru sa `autoClear: false` — ali JEDAN canvas.

## B. POSTAVKA
- Layout heroja: copy zauzima levu polovinu (kao sada), bocica **desnu polovinu**,
  vertikalno centrirana, visina ~62% visine heroja. Na 1440 px i sire.
- Tecnost: brend mint `#57BFA8`. Bez menjanja boje na hover — mirno, brend.
- Idle: lagano lebdenje (y ±1.5%, period 6 s) i blagi yaw (±7°, period 11 s).
- Pointer parallax: bocica prati kursor do ±6° rotacije, lerp 0.05. Gasi se na touch.
- Svetlo: jedno key svetlo gore-desno + `Environment` preset "studio" ili "city" sa
  niskim intenzitetom, da staklo ima sta da reflektuje. Bez senki, bez postprocessinga.

## C. SCROLL KOREOGRAFIJA — scrub, BEZ PINA (pin je uklonjen u koraku 10 i ne vraca se)
ScrollTrigger na hero sekciji, `start: "top top"`, `end: "bottom top"`, `scrub: 1`.
Progres 0 → 1 dok hero izlazi iz kadra:
- 0.00–0.35: bocica se **naginje** ka levo-dole (rotation.z do ~-55°, rotation.x ~+12°)
  kao da se lak sipa ka copy-ju
- 0.25–0.70: u shaderu `uPour` raste 0 → 1: mint u pozadini se **razliva** odozgo-desno
  ka dole-levo (domain warp pomera, zasicenost mint sloja raste). To je "razlivanje"
  koje klijent trazi — bocica sipa, pozadina se puni bojom.
- 0.55–1.00: bocica se smanjuje (scale 1 → 0.7), drift ka centru, opacity → 0.
  Copy ostaje citljiv do kraja (reveal sistem ga je vec otkrio; ne diraj mu opacity).
Sve na `transform`/uniformima. Nista ne menja layout, nema `.pin-spacer`.

## D. FALLBACK — obavezan
- <1024 px ILI prefers-reduced-motion ILI nema WebGL2: bocice NEMA, canvas se ne montira,
  hero je shader/gradijent + copy kao u koraku 10. Desna polovina ostaje prazna na
  mobilnom — to je u redu, copy se siri na punu sirinu.
- Dok se canvas ucitava (dynamic import): prazno mesto rezervisano, bez skoka layouta.

## E. BUDZET
- dpr [1, 1.5], `frameloop="demand"` kad hero nije u kadru, pauza na visibilitychange
- bocica ≤ 40k trouglova (vec je), bez tekstura
- bundle heroja ne raste vise od 60 KB gzip preko trenutnog — izmeri (`scripts/measure-bundle.mjs` postoji)
- 60 fps na 1440 px tokom skrola — proveri u Performance panelu, prijavi

## F. PREKIDAC
Ako posle 2 pokusaja ne prolazi provera G — VRATI hero na stanje iz koraka 11
(`git checkout` tih fajlova), upisi u docs/STATUS.md sta nije uspelo. Bolje bez bocice
nego hero koji stucka. Demo je danas.


## H. LOGO KOJI PUTUJE U NAVIGACIJU — vraca se, ali BEZ PINA
Klijent: "onaj fazon sa logom sto iz heroja prelazi u nav bar mi se svidjao".
Efekat je bio dobar; PIN je bio problem. Vracamo efekat, pin ne.
- Scrub-driven tween na hero sekciji (isti trigger kao bocica, `start: "top top"`,
  `end: "bottom top"`, `scrub: 1`). Nista se ne pinuje, layout se ne menja.
- Wordmark u heroju je `position: relative`, animira se SAMO `transform` (translate + scale)
  ka poziciji logo slota u navigaciji. Poziciju slota izmeri jednom na mount i na resize
  (`getBoundingClientRect` slota u nav-u, koji je uvek prisutan ali `opacity: 0`).
- 0.00-0.70: wordmark putuje i skuplja se ka slotu. 0.70-0.85: crossfade — wordmark u
  heroju ide na opacity 0, logo u nav-u na opacity 1. Posle 0.85 hero wordmark je
  `visibility: hidden` da ne hvata klikove.
- Bez GSAP Flip plugina — obican tween sa izmerenim delta vrednostima je predvidljiviji.
- NE dirati opacity teksta ispod wordmark-a (reveal sistem ga drzi).
- Ako izazove bilo koje odstupanje u proveri G (pin-spacer, pending, nevidljivo) — izbaci
  ga i prijavi. Bocica i shader imaju prednost.

## I. NAVIGACIJA — pozadina i mobilni meni
- Desktop: kad je hero u kadru, nav je providan preko shadera. Kad hero izadje (isti
  scrub progres > 0.85) ILI na svakoj strani koja nije landing (/shop, /nalog, /korpa...),
  nav dobija frosted podlogu: `background: rgba(paper, .82)` + `backdrop-filter: blur(12px)`
  + 1px linija ispod. Sada na /shop sadrzaj strane proviruje kroz nav — to ne sme.
- **Mobilni meni je los** (screenshot klijenta: providan, hero se vidi kroz linkove, sve
  se preklapa). Novi meni:
  - puni ekran, NEPROVIDNA paper podloga (ne glass — ispod je shader, glass je necitljiv)
  - ulaz: podloga klizi odozgo 320 ms, linkovi ulaze stagger 45 ms odozdo (GSAP, ne
    text-reveal — meni je chrome, `data-reveal="off"`)
  - linkovi krupni (28 px), sa brojem u sivom pored Cenovnika ("144") i Shopa ("70")
  - dno: telefon oba lokala kao dugmad, IG/FB ikone, prekidac teme
  - body scroll lock dok je otvoren; zatvara se na klik linka, Escape, i promenu rute/hash-a
  - dugme X animira iz hamburgera (dve linije → X), 44x44 tap target
- Nav logo ostaje wordmark ~30 px (korak 10), na <400 px mark 44 px.

## J. HERO — citljivost teksta
Shader je jak iza pasusa. Iza kolone sa copy-jem (levo) ide mek scrim:
`radial-gradient` od `paper` alfa .55 u centru kolone ka 0 na ivicama, ~120% sirine
kolone. Naslov i pasus moraju da prodju AA na najsvetlijem delu shadera.
Bez tvrdih ivica, bez kutije — treba da izgleda kao da je lak tu tanji.

## K. bbm-24 IZLAZI IZ ShopHighlights
`components/sections/ShopHighlights.tsx:32` — `const WALL = photoById("bbm-24")` je
baner sa promo tekstom "SAJAMSKI POPUST". Klijent: "necu da je vidim na sajtu".
Zameni sa placeholder-om dok ne stigne generisana slika:
- ako postoji `public/photos/zid-lakova-1350.avif` → koristi nju (klijent ce je generisati)
- inace → kompozicija od 12 ProductSwatch kapi (bestselleri, mesano ORLY/ENTITY) na
  mint-wash podlozi, blago rasute kao prosute kapi, sa naslovom sekcije preko.
  Izgleda namerno, ne kao rupa.

## G. PROVERA — 1920, 1440, 390
1. `.pin-spacer` === 0, skrol stize do dna, reveal provera iz MOTION.md === 0
2. na 1920: bocica vidljiva desno, pri skrolu se naginje i pozadina se puni mint bojom
3. na 390: canvas ne postoji, copy puna sirina, nista ne viri
4. `document.querySelectorAll('canvas').length === 1` na desktopu
5. logo putuje u nav bez pin-spacer-a; posle 85% hero wordmark je skriven, nav logo vidljiv
6. /shop: nav ima frosted podlogu, nista ne proviruje kroz nju
7. 390 px: mobilni meni neprovidan, linkovi ulaze stagger, body ne skroluje dok je otvoren
8. bbm-24 se ne pojavljuje NIGDE: `grep -rn "bbm-24" components app` vraca samo komentare
9. typecheck, lint, test, build; bundle delta prijavljen
