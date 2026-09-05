# 13 — Hero zona (sticky hold, boje laka, kap i razlivanje) + navigacija uvek ispred + Instagram nav

## Sta postoji (posle koraka 12 — procitaj docs/STATUS.md, sekcija "Korak 12")
- Jedan canvas, shader ravan u NDC + proceduralna bocica (`components/three/HeroBottle.tsx`,
  `BottleModel.tsx`, `bottleGeometry.ts`), koreografija kao cista funkcija p u
  `lib/heroChoreography.ts`, put loga u `lib/logoTravel.ts` (expo.out po ekranu + linearni
  yPercent), `uPour` front gore-desno -> dole-levo, scrim (`HeroScrim.tsx`).
- Hero je 100vh, ScrollTrigger `top top -> bottom top`, scrub, bez pina. Znaci: sve se desava
  DOK hero izlazi iz kadra — copy putuje ispod providne trake (to je screenshot sa CTA preko
  linkova). Nav je `fixed z-40`, frost tek kad hero prodje 85% (IntersectionObserver).
- Mobilni meni je dobar (pun ekran, neprovidan, stagger). Ne rusi ga.
- WebGL nikad ispod 769px (`lib/webgl.ts`, ADR-005). To se u ovom koraku NE menja.

## Sta se menja, jednom recenicom
Hero dobija ZONU od 170vh u kojoj prvih ~70vh skrola MIRUJE (CSS sticky, ne pin, ne lock),
dok jedan scrub vozi: logo u nav, nagib bocice, kap koja pada, razlivanje uhvacene boje po
pozadini; zatim hero izlazi sa zaostajanjem a sledeca sekcija ga prekriva. Bocica dok miruje
ciklira boje bestselera; prvi pomak skrola hvata trenutnu boju. Nav je uvek iznad svega,
sakriva se na skrol dole i izlazi na skrol gore (Instagram), sa blagim glass-om.

## 0. PRAVILA (vaze za ceo korak)
- BEZ pina, BEZ Flip-a, BEZ zakljucavanja skrola. Zabranjeno: `lenis.stop()` / `body
  overflow:hidden` van otvorenog mobilnog menija, `wheel`/`touchmove` preventDefault,
  `scrollTo` koji korisnik nije trazio, timeouti koji "puste" skrol. Pin je dvaput rusio sajt.
- Sve vizuelno je funkcija napretka p iz JEDNOG ScrollTrigger-a (idempotentno: reload usred
  heroja mora da da isto stanje kao skrol do te tacke).
- Samo `transform`/`opacity`/uniformi u `useFrame`. Nula layouta u skrolu.
- Frontend korak: `convex/` se ne dira, nema `convex deploy`.
- Reveal ugovor (docs/MOTION.md) ostaje; hero ostaje `data-reveal="off"`.
- Provera samo pravim tockicem (Playwright `mouse.wheel`, `page.bringToFront()` pre merenja).
  `window.scrollBy` iz konzole daje lazne negativne rezultate uz Lenis.
- Svi tekstovi srpski latinica. Nepoznato = `[POTVRDITI]`.

## A. Z-SKALA — nista sa navigacije nije iza niceg, nikad
Jedna skala, upisana u docs/MOTION.md ("Z-skala"):
  sadrzaj <= 40 | nav `z-[100]` | dijalozi/Sheet `z-[110]` | toast `z-[120]` | SkipLink `z-[130]`
- `grep -rn "z-\[" components app` + `z-50` i vise: sve sto nije u tabeli spustiti na <= 40.
- `<nav>` ostaje `position: fixed`, direktan potomak layout root-a, NIJEDAN predak sa
  `transform`, `filter`, `backdrop-filter`, `contain`, `will-change` (to pravi stacking
  context i lomi fixed/backdrop). Test u J: prodji `nav.parentElement` lanac i proveri computed style.
- Frost i dalje nosi unutrasnja traka, ne `<nav>` (nauceno u 12).

## B. INSTAGRAM NAV + GLASS (`components/site/SiteNavClient.tsx`)
Signal napretka heroja: novi `lib/heroProgress.ts` — modul-store (`useSyncExternalStore`) sa
`{ p: number, color: string | null }`; `Hero` ga puni iz `onUpdate` scrub-a; strane bez heroja
imaju `p = 1`. Nav vise NE koristi IntersectionObserver za frost (`useHeroPassed` ide napolje).

Vidljivost (stanje `hidden`, pocetno false). Izvor smera: `ScrollTrigger.create({ start: 0,
end: "max", onUpdate })` -> `self.direction`, `self.scroll()` (vec sinhronizovan sa Lenis-om).
- SAKRIJ kad: smer dole AND akumulirani pomak dole od poslednjeg prikaza >= 24px AND
  scrollY > 120 AND p >= 1 (hero van kadra) AND meni zatvoren AND fokus nije u nav-u.
- PRIKAZI kad: smer gore (pomak >= 4px) OR scrollY <= 8 OR meni se otvara OR fokus udje u
  nav (`focusin`) OR p < 1.
- Kretanje: `transform: translateY(-100%)`, sakrivanje 320ms `cubic-bezier(.22,1,.36,1)`,
  prikaz 240ms; `will-change: transform`; bez opacity. `prefers-reduced-motion`: bez tranzicije.
- Glass: `.nav-frost` postaje blagi glass: podloga 72% teme, `backdrop-filter: blur(14px)
  saturate(1.4)`, hairline ispod, bez senke dok je hero u kadru. Na landingu frost = `p >= 0.30`
  (fade 0.30-0.36, tacno kad wordmark sleti u slot); ostale strane uvek frost (`alwaysSolid`).
  Proveri isporuceni CSS: Tailwind v4 `@utility` ispusta backdrop-filter (nauceno u 12) — klase
  ostaju u `@layer components`.
- `--nav-h` (72 desktop / 60 mobilni) u `:root`; `section[id] { scroll-margin-top: calc(var(--nav-h) + 8px) }`
  da `#zakazivanje` i deep link `#zakazivanje?usluga=` ne zavrse ispod trake.
- Dok je meni otvoren: hide/show iskljucen, nav prikazan. Postojeci lock menija ostaje jedini lock.

## C. HERO ZONA — sticky hold, jedan scrub (`components/hero/Hero.tsx`)
Struktura:
  <section id="hero" data-reveal="off" class="relative h-[170vh] max-md:h-[130vh]">
    <div class="hero-stage sticky top-0 h-[100dvh] overflow-hidden will-change-transform">
      canvas (z-0) · scrim · copy · CTA · wordmark
    </div>
  </section>
- Sekcija NEMA `overflow:hidden` (stage se u fazi izlaska translira nanize, spec G).
- Jedan ScrollTrigger: `trigger: section, start: "top top", end: "bottom top", scrub: true,
  invalidateOnRefresh: true`. p = progress. HOLD_END = (H - vh) / H = 70/170 = 0.41 desktop,
  30/130 = 0.23 mobilni — racunaj iz izmerenih visina, ne hardkoduj.
- `lib/heroChoreography.ts` se prepravlja na tabelu ispod (cista funkcija, testovi se azuriraju).

Segmenti p (desktop; mobilni koristi isti redosled, HOLD_END manji):
| faza                | p            | sta                                                          |
| hvatanje boje       | > 0.01       | ciklus boja staje, `captured` = trenutna boja tecnosti        |
| logo put            | 0.04 - 0.30  | wordmark -> `#nav-logo-slot` (logoTravel, expo.out kao u 12)  |
| crossfade + frost   | 0.30 - 0.36  | wordmark -> 0 + visibility hidden; nav logo -> 1; `.nav-frost` |
| nagib               | 0.06 - 0.30  | 0 -> TILT (kao 12: +55 z, +12 x), yaw idle se gasi do 0.10    |
| kap raste           | 0.18 - 0.30  | sfera na vratu, scale 0 -> 1, boja tecnosti                   |
| kap pada            | 0.30 - 0.40  | do dna kadra (unproject NDC y=-1.15 na dubini bocice), 0.40 nestaje |
| razlivanje          | 0.36 - 0.78  | `uPour` 0 -> 1 radijalno iz `uPourOrigin`                     |
| ink                 | uPour >= .35 | `--hero-ink` po luminanci uhvacene boje (E)                   |
| copy izlazi         | 0.55 - 0.85  | opacity 1 -> 0, y 0 -> -40px (CTA prvo prestaju da hvataju klik) |
| bocica izlazi       | 0.60 - 1.00  | scale 1 -> 0.7, drift ka centru, opacity -> 0 (kao 12)        |
| parallax lag        | HOLD_END - 1 | stage `y` 0 -> +40vh (G)                                      |
- Do HOLD_END hero fizicki miruje (sticky) — to je "zadrzavanje" koje korisnik trazi, bez otimanja.
- Ulazna animacija copy-ja (revealWords) ostaje kao u 12.

## D. BOJE — ciklus i hvatanje (`lib/heroColors.ts`)
Pet bestselera iz `data/products.json`, redom (naizmenicno ORLY / Entity, razlicite porodice):
  vintage #6ECFC0 (mint, pocetna) -> kaleidoscope-eyes #E88BC0 -> entity-red-rum-rouge #C61F35
  -> entity-modern-minimalist #D9C3AC -> crawfords-wine #7B2233 -> nazad na mint
- Hex se cita na SERVERU (`lib/products`) u `app/page.tsx` i ide u `<Hero colors={...}>` —
  products.json ne ulazi u klijentski JS (isti razlog kao brojevi u nav-u u 12).
- Idle: hold 3.5s po boji, crossfade 1.0s (`THREE.Color.lerp` u useFrame, ease sine), pauza kad
  `document.hidden`, `prefers-reduced-motion` -> staticna prva boja.
- Hvatanje: prvi put kad p > 0.01 -> `captured = current`, ciklus staje, `captured` -> `uPourColor`
  i `heroProgress.color`. Kad p vrati na < 0.01 -> ciklus nastavlja OD uhvacene boje.
- Pazi na color space: boje kroz `THREE.Color` (ColorManagement), ne sirovi hex u uniform.
- `[POTVRDITI]` u docs/BRIEF.md: Ivanin izbor 5 boja (ovo je nas predlog).

## E. KAP I RAZLIVANJE (`liquidShader.ts`, `HeroBottle.tsx`)
- Kap: mala sfera (scale y 1.3) na vrhu vrata u lokalnom prostoru bocice, materijal = tecnost.
  0.18-0.30 raste, na 0.30 se otkaci (prelazi u svetski prostor), 0.30-0.40 pada pravo dole do
  ispod donje ivice kadra, zatim `visible=false`.
- `uPourOrigin` (vec2, uv) = ekranska tacka gde kap napusta kadar (x od vrata, y = 0).
- Shader: radijalni front iz `uPourOrigin` (uzmi u obzir aspect), ivica iskrivljena postojecim
  warp poljem kao u 12; boja = `mix(uPourColor, mintPaleta, 0.25)` — 25% minta ostaje da brend
  ne nestane; pri uPour=1 ceo kadar. Stari front gore-desno -> dole-levo se uklanja.
- Ink: WCAG relativna luminanca uhvacene boje > 0.45 -> `--hero-ink: var(--fg)` (taman tekst),
  inace `--hero-ink: var(--bg)`. Primeni na h1/lead/strip kroz CSS var, tranzicija 300ms.
  CTA zadrzavaju svoje tokene. Scrim ostaje.

## F. GAMIFIKACIJA — malo, ne cirkus
- Raycast hover na bocici: `cursor: pointer`, scale -> 1.03 (lerp). Klik/tap: wobble
  (rotation.z +-6 deg, yoyo x3, 0.7s, sine.inOut) + slosh.
- Nivo tecnosti = svetski horizontalna clipping ravan: `gl.localClippingEnabled = true`,
  materijal `Liquid` dobija `clippingPlanes=[plane]`, ravan na visini 78% tela u SVETSKIM
  koordinatama (racunaj iz world matrix bocice). Kad se bocica nagne, povrsina ostaje ravna —
  to je realizam koji korisnik trazi. `side: DoubleSide` da presek izgleda kao povrsina.
  Slosh: normala ravni prati ugaonu brzinu kroz prigusenu oprugu (+-8 deg, ~1.2Hz, damping .9).
- Za clipping mesh `Liquid` mora biti PUNA unutrasnjost (ne 78%): produzi u `bottleGeometry.ts`.
- alphaHash bledjenje iz 12 ostaje kompatibilno sa clipping-om — proveri vizuelno.

## G. PARALLAX PREKLOP sledece sekcije
- Prva sekcija posle heroja (vidi `app/page.tsx`): omotac `relative z-10 bg-bg
  rounded-t-[28px] shadow-[0_-24px_60px_rgba(0,0,0,.14)]` (tamna tema: senka .4). Neprovidna.
- Stage: `y` 0 -> +40vh preko p HOLD_END..1 (funkcijska vrednost + `invalidateOnRefresh`) —
  hero zaostaje 40%, sekcija ga pokriva. Nista drugo na sledecoj sekciji (reveal je dovoljan).
- Stage `z-0`; deo koji "visi" ispod sekcije heroja pokriva sledeca sekcija (zato neprovidna).

## H. MOBILNI I FALLBACK
- WebGL <= 768px ostaje iskljucen (`useWebGLAllowed`, ADR-005). `[POTVRDITI]` sa Jovanom:
  3D bocica na telefonu je zasebna odluka (baterija, sredni telefoni).
- Mobilni hero (u `HeroFallback`/Hero grani bez canvasa): zona 130vh, isti p. Umesto bocice —
  VELIKA `ProductSwatch` kap (~96px, finish creme) desno od naslova koja ciklira ISTIH 5 boja
  (isti tajming); na p > 0.01 hvata boju; 0.36-0.78 se "prosipa": CSS `--pour` 0->1 i
  `--pour-color` na radial-gradient sa centrom u kapi preko postojeceg gradijenta. Ink isto (E).
- Logo na mobilnom: ispod 400px nav pokazuje mark — zato bez puta, samo class swap na p 0.30;
  400-768 wordmark put kao desktop (transform je jeftin).
- `prefers-reduced-motion` (bilo koja sirina): zona 100vh, bez holda, bez puta (swap na 50%),
  staticna boja, bez razlivanja, nav bez tranzicije.
- SSR: copy i CTA se renderuju na serveru (LCP); canvas `dynamic ssr:false`; rezervisan prostor,
  CLS 0.

## I. GLB IZ BLENDERA — kroz BLENDER MCP, poslednje, vremenski ograniceno
Tek kad A-H prodju proveru. Najvise 60 minuta.

METOD = Blender MCP (alati `mcp__Blender__*`/`execute_blender_code`), NE headless skripta.
Blender 5.1.1 je otvoren na masini, add-on "MCP" (Blender Lab) drzi TCP server na
localhost:9876 — ako MCP alati nisu u sesiji ili ne odgovaraju, upisi to u STATUS i tek onda
fallback: `"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b -P scripts/bottle.py`.

Postupak kroz MCP:
1. Nova scena (`bpy.ops.wm.read_homefile(use_empty=True)`), jedinice cm, Y-up se resava pri exportu.
2. Geometrija tacno po `.nightrun/specs/12-hero-bocica.md` sekcija "MODEL IZ BLENDERA" (zaobljeni
   kvadrat 3.2x3.2, radijus 0.9, visina 5.2, vrat 1.1/0.8, Solidify 0.12, Subdiv 2; Cap 1.9->1.7
   visina 3.6, bevel 0.15, 8-12 zljebova; ukupno ~9.6) sa JEDNOM izmenom: mesh `Liquid` = PUNA
   unutrasnjost stakla (nivo tecnosti daje clipping ravan iz F, ne geometrija). Imena meshova
   TACNO `Glass` / `Liquid` / `Cap`. Bez etikete, teksta, armature, animacija. Apply transforms.
3. Proveri kroz MCP screenshot/render (`render_viewport_to_path` ili viewport screenshot) da
   silueta lici na ORLY bocicu (zdepast kvadratni korpus, visok zatvarac), pa tek onda export.
4. Export GLB: `bpy.ops.export_scene.gltf(filepath=<repo>/public/models/bocica.glb,
   export_format='GLB', export_draco_mesh_compression_enable=True, export_yup=True,
   export_apply=True, export_cameras=False, export_lights=False, export_animations=False)`.
5. Sav bpy kod koji si izvrsio kroz MCP sacuvaj i kao `scripts/bottle.py` (reproducibilno,
   moze i headless kasnije) — to nije zamena za MCP, to je zapis.
6. `npx gltf-transform inspect public/models/bocica.glb`: <= 40k trouglova, <= 500 KB,
   tri mesha pod tim imenima. Ne prolazi -> popravi kroz MCP (decimate/manji subdiv), max 2 kruga.
7. Ucitavanje: drei `useGLTF` + Draco dekoder kopiran u `public/draco/` (iz
   `node_modules/three/examples/jsm/libs/draco/gltf/`), `useGLTF.preload`. `BottleModel`
   menja unutrasnjost; API `HeroBottle`/`BottleScene` se ne menja. Boja tecnosti i clipping
   ravan idu na mesh `Liquid` kao u F.

Ne prodje (vreme, budzet, MCP mrtav) -> proceduralna ostaje, razlog u STATUS.

## J. PROVERA — 1440 i 390 (1920 po zelji), pravi tockic, dev server localhost:3001
Pre svega: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001` (PowerShell:
`(iwr http://localhost:3001 -UseBasicParsing).StatusCode`); ako ne odgovara -> `npm run dev -- -p 3001`.
 1. Z: `document.elementFromPoint` u centru svakog nav linka, na scrollY 0 / 200 / 900 / dno ->
    element je unutar `<nav>`. Lanac `nav.parentElement` bez transform/filter/backdrop/contain.
 2. `.pin-spacer` = 0. Tokom skrola kroz hero `getComputedStyle(body).overflow !== "hidden"`,
    `html.lenis-stopped` odsutan (lock samo dok je meni otvoren).
 3. Hold: skrol 0 -> 40vh: `#hero .hero-stage` `getBoundingClientRect().top === 0` (miruje),
    copy bounding box nepromenjen. Reload na scrollY = 35% zone -> isto stanje kao skrol (p, boja).
 4. Nav IG: van heroja, 3 pomaka tockica dole (ukupno 600px) -> nav `translateY(-100%)` u roku 400ms;
    1 pomak gore 40px -> vidljiv u 300ms. Unutar hero zone: nikad sakriven. Otvoren meni: vidljiv.
 5. Logo: p=0 nav logo opacity 0, wordmark vidljiv; p=0.36 nav logo 1, wordmark `visibility:hidden`;
    ni u jednom trenutku dva loga sa opacity > .5. Frost tacno od 0.30 (`backdropFilter` blur).
 6. `window.__bbmHero` (SAMO u dev): `{p, pour, color, captured}`; p=0 -> pour 0; p>=0.78 -> pour 1;
    `captured` === boja tecnosti u trenutku hvatanja; skrol nazad na 0 -> ciklus nastavlja.
 7. Ink: uhvati svetlu boju (nude) -> `--hero-ink` taman; tamnu (wine) -> svetao. Kontrast h1 >= 4.5.
 8. Kap: screenshot na p=0.25 (kap na vratu) i p=0.36 (kap pri dnu); pour front pocinje iz te tacke.
 9. Reveal: posle skrola do dna pravim tockicem `data-reveal-motion=pending` = 0, sakriven copy = 0
    (isti test kao u 12: 0/0/0/0).
10. 390: bez horizontalnog prekoracenja (`scrollWidth === clientWidth`), swatch kap ciklira i prosipa
    se, meni neprovidan, nav hide/show radi, deep link `/#zakazivanje?usluga=<key>` sleti ispod trake
    (top sekcije >= --nav-h).
11. Perf na 1440 (`page.bringToFront()`): skrol kroz celu zonu 3s — p95 frame <= 17ms, 0 preko 33ms
    kao u 12; lenji WebGL chunk +<= 15KB gzip; pocetni JS `/` +<= 5KB.
12. `npm run typecheck && npm run lint && npm test && npm run build` (Windows flake 0xC0000374 —
    ponovi build jednom pre nego sto ga proglasis padom).
Sve rezultate upisi u docs/STATUS.md kao tabelu (1440 | 390).

## K. DOKUMENTACIJA I GIT
- docs/MOTION.md: "Hero v2" (struktura zone, tabela segmenata iz C, zabrane), "Z-skala" (A),
  "Navigacija" (pravila B). Stari "Hero — scroll scenario" se zamenjuje.
- docs/STATUS.md: novi vrh "Korak 13", sta radi / sta ne / tabela J / `[POTVRDITI]` (boje, 3D na telefonu).
- docs/BRIEF.md: `[POTVRDITI]` boje ciklusa i 3D na telefonu.
- Git: commit na TEKUCOJ grani: `korak 13: hero zona, IG nav, boje laka`; `git push origin <tekuca grana>`.
  Bez `convex deploy`. Ne prebacuj granu sam.
