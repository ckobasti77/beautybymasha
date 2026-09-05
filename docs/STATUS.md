# STATUS

Stanje posle koraka **13 — hero zona sa zadržavanjem, boje laka, kap i razlivanje, navigacija
uvek ispred + Instagram nav** (ispod: korak 12, pa 11, pa zatečeno stanje posle koraka 08).
Ovo je lista za jutro: šta radi, šta ne radi, i svaki `[POTVRDITI]` sa putanjom fajla.

## Korak 13 — šta je dodato

### Hero zona (`components/hero/Hero.tsx`, `lib/heroChoreography.ts`, `lib/logoTravel.ts`)

- Sekcija je **zona od 170 vh** (mobilni 130 vh, uz `prefers-reduced-motion` 100 vh) sa
  `position: sticky` stage-om od 100 vh. Do `HOLD_END = (H − vh) / H` (izmereno: 0.41 na 1440,
  0.23 na 390) hero **fizički miruje** — CSS, ne pin; `.pin-spacer` je 0, nema lock-a skrola
  (jedini lock na sajtu ostaje otvoren mobilni meni), nema `preventDefault` na wheel/touch.
- **Jedan ScrollTrigger** (`top top → bottom top`, `scrub`) daje `p`; sve je čista funkcija
  tog broja (`lib/heroChoreography.ts`, 26 testova): logo put 0.04–0.30 (expo.out) + crossfade
  i frost 0.30–0.36, nagib 0.06–0.30, kap raste 0.18–0.30 i pada 0.30–0.40, razlivanje
  0.36–0.78, copy kontejner 0.55–0.85 (CTA prestaju da hvataju klik od 0.55, `hidden` od 0.85),
  bočica izlazi 0.60–1, stage zaostaje HOLD_END–1 do +40 % svoje visine ispod `.hero-overlap`
  (neprovidan omotač sledećih sekcija, zaobljen vrh 28 px, senka nagore).
- Merenje (wordmark relativno na stage, slot relativno na traku, HOLD_END iz `offsetHeight`)
  ide u `onRefreshInit`; `apply(p)` se zove i iz `onRefresh` (na p = 0 `onUpdate` ne okida).
  DOM se vozi kroz quickSetter-e PO SVOJSTVU; ono što se retko menja (visibility,
  pointer-events, `hidden`) piše se samo na promenu. Reload usred zone daje isto stanje.
- `window.__bbmHero` (samo dev) → `{ p, pour, color, captured }`.

### Boje laka (`lib/heroColors.ts`, `lib/products.ts` → `hexesForSlugs`, `app/page.tsx`)

- Pet bestselera, naizmenično ORLY / Entity: Vintage `#6ECFC0` → Kaleidoscope Eyes `#E88BC0`
  → Red Rum Rouge `#C61F35` → Modern Minimalist `#D9C3AC` → Crawford's Wine `#7B2233` → mint.
  Hex se čita na serveru u `app/page.tsx` (katalog ne ulazi u klijentski JS), test u
  `lib/data.test.ts` pada ako slug nestane iz kataloga.
- Ciklus (hold 3,5 s, crossfade 1 s sine) vozi `gsap.ticker` u `Hero.tsx` za sve tri grane:
  3D bočica (≥ 1024), shader bez bočice (769–1023) i CSS kap (≤ 1023). Pauza kad je tab
  sakriven; `prefers-reduced-motion` = statična boja.
- Prvi pomak skrola (p > 0.01) **hvata** boju koja se vidi (i usred prelaza — tačno to);
  p < 0.01 pušta ciklus dalje od tog mesta. Uhvaćena boja ide u `sessionStorage`, pa reload
  usred zone daje istu boju (bez toga bi ciklus krenuo od minta).
- Three strana (`components/three/liquidColor.ts`) pretvara hex par u `THREE.Color` kroz
  ColorManagement, sa kešom po hex-u; `HeroDrivers` nosi samo brojeve i stringove.

### Kap, razlivanje, nivo tečnosti (`liquidShader.ts`, `HeroBottle.tsx`, `BottleModel.tsx`, `liquidLevel.ts`, `bottleGeometry.ts`)

- Kap: sfera (y × 1,3) u boji tečnosti raste na **vrhu zatvarača** 0.18–0.30 (vrh vrata je
  ispod zatvarača — tamo ne bi ni virila), otkači se i pada do NDC y = −1,15. Mesh je uvek
  nacrtan (skala ~0 kad je nema) da se program kompajlira na prvom frejmu, ne usred skrola.
- Shader: stari dijagonalni front je uklonjen; **radijalni front** iz `uPourOrigin` (x vrha
  zatvarača iz poze koja zavisi samo od p, bez lebdenja/pointera — reload daje isti centar),
  ivica iskrivljena warp poljem, na `uPour = 0` front je 0,3 iza ishodišta (bez mrlje u miru),
  na 1 0,35 iza najdaljeg ugla. Boja = 75 % uhvaćena + 25 % mint. Odsjaj ispod copy kolone je
  prigušen (svetle pruge preko tamnog laka obarale su kontrast svetlog teksta ispod AA).
- **Nivo tečnosti = svetska horizontalna clipping ravan** (`gl.localClippingEnabled`,
  `Liquid` mesh je sada puna unutrašnjost stakla): dok se bočica naginje, površina ostaje
  ravna. Zapljuskivanje: prigušena opruga (~1,2 Hz, damping 0,9, ±8°) iz ugaone brzine.
  `DoubleSide` + `onBeforeCompile` koji zadnjim stranama podmeće normalu ravni — bez toga
  presek izgleda kao šuplja činija. Ista ravan i na zidu shopa (`BottleScene`).
- Gamifikacija: hover kursor + skala 1,03, klik/tap wobble (±6°, tri puta, 0,7 s) +
  zapljuskivanje. Raycast ide na nevidljivu kapsulu, ne na 12k trouglova.
- Ink: `--hero-ink` ide na papir kad razlivena TAMNA boja pokrije centar copy kolone
  (kontrastno pravilo, vidi odluke), scrim menja papirni veo za ink veo (300 ms). CTA
  zadržavaju svoje tokene.

### Navigacija (`components/site/SiteNavClient.tsx`, `lib/heroProgress.ts`, `app/globals.css`)

- **Z-skala:** nav `z-[100]`, `Sheet` i lightbox galerije `z-[110]` (lightbox sada ide kroz
  portal u `body`), toast `z-[120]`, skip-link `z-[130]`; ostalo ≤ 40 (`grep -rn "z-\[\|z-50"
  components app` → samo ovi + AdminNav z-30, StickyBar/admin tabovi z-20, ShopHighlights z-10).
  `<nav>` je direktno pod `<body>`, lanac predaka bez transform/filter/backdrop/contain.
- **Instagram nav:** sakrij na dole (≥ 24 px, scrollY > 120, hero van kadra, meni zatvoren,
  fokus van nav-a), pokaži na gore (≥ 4 px), blizu vrha, na otvaranje menija, na `focusin`,
  dok je hero u kadru. Samo `transform` na UNUTRAŠNJOJ traci (`.nav-bar[data-hidden]`,
  320 / 240 ms) — ne na `<nav>`, jer je panel menija `fixed` unutar njega. Bez React state-a
  po skrolu (atribut). Skokovi > 200 px (reload, deep link) se ne računaju kao skrol.
- `lib/heroProgress.ts`: store `{ p, color }` iz `onUpdate`/`onRefresh`; nav čita BOOLEAN
  snapshot-e (frost od p ≥ 0.30, senka od p ≥ 1) kroz `useSyncExternalStore`. IO za frost
  (`useHeroPassed`) je uklonjen. Strane bez heroja i dalje šalju `alwaysSolid`.
- `.nav-frost` = blagi glass: 72 % podloge, `blur(14px) saturate(1.4)`, hairline, unutrašnji
  highlight; tranzicija hvata i backdrop-filter da glass ne „pukne" preko wordmark-a u slotu.
- `--nav-h` (64 / 80 px) u `:root`, traka `h-[var(--nav-h)]`, `:is(section, footer)[id]`
  ima `scroll-margin-top: calc(var(--nav-h) + 8px)` (`#kontakt` je footer); `Section` više
  nema `scroll-mt-24`, `StickyBar` cenovnika koristi `top-[var(--nav-h)]`.

### Mobilni (`components/hero/HeroDrop.tsx`)

- WebGL ≤ 768 ostaje isključen (ADR-005). Bez bočice (≤ 1023 px, i preko shadera na 769–1023):
  velika `ProductSwatch` kap (80 / 96 px) desno od naslova ciklira iste boje (`--sw`), hvata
  boju na prvi skrol, pada do dna stage-a 0.30–0.40 pa se „prosipa" 0.36–0.78 kao unapred
  nacrtan krug (`transform: scale`, bez repaint-a gradijenta po frejmu). Montira se posle
  hidratacije (media query), apsolutno — CLS 0. `ProductSwatch` je dobio `ref` prop.
- Ispod 400 px logo se ne vozi (nav pokazuje mark): zamena na 0.30. Reduced motion: zona
  100 vh, hold 0, bez laga, zamena na 0.50, bez pada i prosipanja.

### Odluke koje odstupaju od slova speca

| # | Odluka | Zašto |
| --- | --- | --- |
| 1 | `--nav-h` = 64 / 80 px, ne 72 / 60 | korak 12 je zamrznuo visinu trake (h-16 / md:h-20); logo put se meri živo |
| 2 | hide/show transform na `.nav-bar`, ne na `<nav>` | panel menija je `fixed` unutar `<nav>`; transform na pretku mu postaje containing block |
| 3 | ink po KONTRASTU, ne po luminanci 0.45; tokeni `--ink`/`--paper`, ne `--fg`/`--bg` | luminanca `#E88BC0` je 0.39 → spec bi dao beo tekst na roze sa 2,4:1; hero je svetao i u tamnoj temi |
| 4 | ink se prebacuje kad front pokrije centar copy kolone, ne na `uPour ≥ .35` | na .35 front još nije stigao do teksta |
| 5 | copy izlazi kao KONTEJNER, na p ≥ 0.85 `display: none` | opacity tekstualnih čvorova drži reveal sistem; provera iz MOTION.md ostaje poštena |
| 6 | DOM se vozi iz `onUpdate` kroz quickSetter-e, ne tweenima sa `yPercent` iz 12 | stage je sticky — wordmark tokom holda ne putuje sa stranom; posle holda pomeraj je čista funkcija p |
| 7 | ciklus boja u `Hero.tsx`, ne u canvasu; kap prikazana i na 769–1023 | isti motor za tri grane; hvatanje boje vidljivo i bez bočice |
| 8 | omotač sledećih sekcija je `relative` BEZ `z-10`; lightbox galerije kroz portal | `z-10` pravi stacking context koji zarobi `fixed z-[110]` dijalog ispod nav-a |
| 9 | stage `100vh`, ne `100dvh` | sekcija je u vh, HOLD_END ostaje tačno 70/170; dvh bi menjao visinu dok se URL traka sklapa |
| 10 | uhvaćena boja u `sessionStorage` | reload usred zone daje istu boju kao skrol do te tačke |
| 11 | ScrollTrigger nav-a ima `end` = 8 × maxScroll, ne `"max"` | `"max"` se meri pri stvaranju, strana posle raste (loyalty traka), pa se na samom dnu traka ne bi vratila |
| 12 | R3F `resize={{ scroll: false }}` na oba canvasa | R3F prati položaj omotača na skrol → `gl.setSize` + re-render scene svakog frejma dok se stage pomera (profil: 511 ms setSize u 4 s, p95 21 ms) |
| 13 | GLB se čita malim GLB + Draco čitačem, ne drei `useGLTF` | `useGLTF` = +21,9 KB gzip na lenjem chunku, budžet je +15 KB; ovako +4,4 KB, isti Draco dekoder |

### GLB iz Blendera — urađen kroz Blender MCP (`scripts/bottle.py`, `public/models/bocica.glb`)

- Blender 5.1.1 otvoren, add-on server na localhost:9876; sav bpy kod je izvršen kroz
  `execute_blender_code` i sačuvan kao `scripts/bottle.py` (`build()` → `preview_render()` →
  `export_glb()`; radi i headless). Geometrija po specu 12: zaobljeni kvadrat 3,2 × 3,2 r 0,9,
  telo 5,2, vrat d 1,1 / h 0,8, Solidify 0,12, Subdivision 2; zatvarač d 1,9 → 1,7, h 3,6,
  bevel 0,15, 10 žlebova; ukupno 9,48 (tačno `TOTAL_HEIGHT` iz koda, da anker kapi, nivo i
  raspored ostanu). `Liquid` = puna unutrašnjost; nivo daje clipping ravan (F).
- Silueta proverena Eevee renderom u fajl (snimak viewporta/prozora kroz MCP je bio crn —
  prozor Blendera je zaklonjen; zapisano u memoriji). Modifikatori se primenjuju pre exporta da
  primitivi zadrže imena.
- `gltf-transform inspect`: **69,6 KB**, Glass 29.952 + Liquid 3.968 + Cap 2.240 = **36.160
  trouglova** (≤ 40k), `KHR_draco_mesh_compression`, granice x/z ±1,6, y 0–9,48.
- Učitavanje BEZ drei `useGLTF`: `components/three/bottleGlb.ts` čita GLB kontejner i
  Draco primitive kroz `DRACOLoader` (dekoder u `public/draco/`), React `use()` + Suspense,
  fallback na proceduralnu bočicu (i kroz error boundary). Razlog je budžet J.11: drei
  `useGLTF` je izmereno +21,9 KB gzip na lenjem chunku (GLTFLoader 13,4 + Draco 3,1 +
  suspend-react), ovako **+4,4 KB**. `preloadBottleGlb()` = `useGLTF.preload`. Na mreži:
  GLB 58,6 KB + Draco wasm 63,5 KB + wrapper 11,7 KB (gzip), samo ≥ 769 px.
- Prvi headless pokušaj (pre MCP-a) je bio dobar za budžet fajla, ali je u heroju pokazao bag:
  `HeroBottle` je delio jedan ref između svoje grupe i grupe modela, pa se posle Suspense
  zamene transform primenjivao dvaput (bočica 2× udesno) — sada model ima svoj ref.

### Provera

```
npm run typecheck   ✓
npm run lint        ✓  (nula upozorenja)
npm test            ✓  191 testova, 13 fajlova (+22: koreografija zone, put loga, boje/ink, store, katalog)
npm run build       ✓  83 strana, tri builda zaredom bez Windows flake-a 0xC0000374 (pre GLB-a, sa drei, sa čitačem)
```

Bundle (`scripts/measure-bundle.mjs` + gzip lenjog three chunka, pre → posle):

| Šta | Pre (korak 12) | Posle | Razlika |
| --- | --- | --- | --- |
| `/` početni JS | 323,3 KB | 326,8 KB | **+3,5 KB** (granica +5 KB: store, boje, hero DOM koreografija, IG nav) |
| `/shop` početni JS | 299,2 KB | 300,0 KB | **+0,8 KB** |
| lenji WebGL chunk (three + hero + DRACOLoader + GLB čitač) | 232,2 KB | 236,0 KB | +3,8 KB |
| lenji hero chunk | u zbiru 237,0 KB iz koraka 12 | 5,4 KB | ukupno lenjo 241,4 KB = **+4,4 KB** (granica +15 KB; sa drei `useGLTF` bilo bi +21,9) |

U browseru (Playwright MCP, `page.mouse.wheel`, dev server http://localhost:3001 — pripada
paralelnoj sesiji, nije gašen; Chromium na ekranu od 146 Hz, `page.bringToFront()` pre merenja):

| Provera J | 1440×900 | 390×844 |
| --- | --- | --- |
| 1. `elementFromPoint` u centru svakog nav linka (scrollY 0 / 200 / 900 / dno posle 1 pomaka gore) | 11/11 u `<nav>` na sva 4 mesta; lanac predaka `BODY, HTML` bez transform/filter/backdrop/contain | mark 44 px, linkovi u meniju |
| 2. `.pin-spacer`; `body.overflow`; `html.lenis-stopped` tokom zone | 0; `clip visible`; nema | 0; isto |
| 3. Hold: skrol 0 → 40 vh | stage top 0 i copy top 434,4 px nepromenjeni do y 362 (p 0.236); reload na y 539 (p 0.352) → isti p, ista uhvaćena boja, nav logo 0.87 pre i posle | stage top 0 do y 247 (p 0.225 = HOLD_END 30/130) |
| 4. Nav IG van heroja: 3 × 200 px dole → sakriven; 40 px gore → vidljiv | atribut 137 ms, `translateY(−81px)` za 200 ms; prikaz atribut 32 ms, na 0 za 188 ms; unutar zone (p 0.56) nikad sakriven; fokus (Tab) vraća traku; na samom dnu 45 px gore vraća | sakriven `−65px`, vraćen; otvoren meni: traka vidljiva, panel neprovidan `rgb(250,246,241)`, 390 px |
| 5. Logo / frost | p 0: nav logo 0, wordmark (144, 209, 540); p 0.25: wordmark na slotu (144, 26, 90 vs slot 144, 25, 88); frost `none` na 0.288, `blur(14px) saturate(1.4)` na 0.308; p 0.33: wordmark 0.48 / logo 0.52; p 0.36: logo 0.97; p 0.5: wordmark `hidden` | zamena na 0.308: logo 1, wordmark `hidden`, frost od 0.31 |
| 6. `window.__bbmHero` | p 0 → pour 0; pour 0.27 @0.50, 0.61 @0.60, 1 @0.78; `captured` = boja u trenutku hvatanja; nazad na 0 → `captured` null, ciklus nastavlja od iste boje | isto, `--pour-color #C498BA` (roze + mint) |
| 7. Ink / kontrast h1 (kompozitni screenshot, percentili pozadine) | wine → `data-ink=light`, tekst `rgb(250,246,241)`, kontrast 7,7 / 6,6 / 6,0 / 4,6 (p 0.62, pour 0.67); mint/nude → taman, 10,4–13,3 | roze → taman |
| 8. Kap | screenshot p 0.27: kap na vrhu zatvarača; p 0.36: kap pri dnu, front kreće iz te tačke; u miru nema mrlje (`pourFront(0) < 0`) | kap pada y 4 → 389 (0.31–0.38), `hidden` od 0.40, krug prosipanja scale = pour |
| 9. Reveal na dnu (posle 4,3 s) | `pending` 0 / sakriven copy 0 / `.reveal-word` 0 / `data-reveal-state=pending` 0 | isto |
| 10. 390 | — | `scrollWidth === clientWidth` (375); kap ciklira (mint → roze za 4,6 s); deep link `/#zakazivanje?usluga=manikir` → vrh sekcije 72 px ≥ `--nav-h` 64 px, traka vidljiva |
| 11. Perf: skrol kroz celu zonu (1530 px, 5,5 s, 146 Hz) | proceduralna: 637 / 672 frejmova, medijana 7 ms, **p95 14 ms**, najduži 27,9 / 20,7 ms, 0 preko 33 ms; **GLB (36k trouglova): p95 14 ms**, najduži 34,8 / 27,9 ms, 1 / 0 preko 33 ms (dva prolaza) | — |
| GLB | `bocica.glb` + Draco stižu, bočica se zamenjuje bez rupe (Suspense fallback = proceduralna), hover kursor radi, nivo ravan pri nagibu (screenshot) | — |
| 12. Reduced motion (1440) | zona 900 = stage, canvas 0, zamena loga na 0.50 (0 @0.45 → 1 @0.55), stage bez laga, boja statična | — |
| Konzola | 0 grešaka; jedino upozorenje `THREE.Clock` iz R3F-a (od ranije) | 0 grešaka |

`/shop` na 1440: 1 canvas, frost, logo 1, ista GLB bočica sa ravnim nivoom dok se vrti.

Perf pre popravki (isti prolaz): faza izlaska p95 20,7 ms, 7–8 frejmova preko 33 ms. CDP
profil: `WebGLRenderer.setSize` 511 ms u 4 s (R3F pratio položaj omotača na skrol) i
`quickSetter(el, "css")` koji je čitao computed style po frejmu — oba uklonjena (odluke 6, 12);
kompajliranje programa kapi na p 0.18 (42 ms) rešeno stalno nacrtanom kapi skale ~0.

### Šta čeka / napomene

| Šta | Zašto |
| --- | --- |
| **[POTVRDITI]** pet boja ciklusa (`lib/heroColors.ts` → `HERO_COLOR_SLUGS`, `docs/BRIEF.md` §8 #9) | naš predlog bestselera; Ivana bira |
| **[POTVRDITI]** 3D bočica na telefonu (`docs/BRIEF.md` §8 #10, ADR-005) | sada nikad ispod 769 px — baterija, srednji telefoni; umesto nje kap laka |
| `data/site.json` → oba lokala isti telefon | iz koraka 12, i dalje **[POTVRDITI]** |
| Traka cenovnika (`StickyBar`) stoji na `--nav-h` i kad je nav sakriven | iznad nje se tada vidi sadržaj strane, ne prazan pojas; ako smeta — pratiti `data-hidden` |
| Klik na sidro u nav-u (Lenis) sakrije traku dok skroluje dole | Instagram ponašanje; naslov ipak sleće 8 px ispod mesta trake (`scroll-margin-top`) |
| Boja razlivanja = 75 % uhvaćena + 25 % mint (spec E) | tamne boje (wine) u linearnom prostoru ispadnu mutnije; ako Ivana hoće čistiju boju, jedan broj u `liquidShader.ts` i `POUR_MINT_SHARE` |
| Naslov na ≤ 1023 px ima `max-lg:pr-24` zbog kapi | na 390 px lomi se u 4 reda |
| `docs/MOTION.md` → „Hero v2", „Z-skala", „Navigacija" | prepisano; stari „Hero — scroll scenario (korak 12)" uklonjen |

---

Stanje posle koraka **12 — 3D bočica u heroju, logo koji putuje u navigaciju, nova
navigacija** (ispod: korak 11, pa zatečeno stanje posle koraka 08).

## Korak 12 — šta je dodato

### ⚠ Spec je promenjen usred rada — model iz Blendera NIJE rađen

`.nightrun/specs/12-hero-bocica.md` i `.nightrun/prompts/12-hero-bocica.md` su na disku
prepisani DOK je ovaj korak trajao (pri startu su bili jednaki HEAD-u): novi tekst dodaje
sekciju „MODEL IZ BLENDERA" (`scripts/bottle.py`, headless `blender -b`, Draco GLB ≤ 500 KB,
`useGLTF` + dekoder u `public/draco/`, provera 4b). Prompt sa kojim je ova sesija pokrenuta
je starija verzija (proceduralna bočica iz koraka 08), a i novi spec kaže „Hero ne sme da
čeka na Blender" i dozvoljava proceduralnu bočicu kao fallback uz zapis ovde. **Zato je u
heroju proceduralna bočica** (`components/three/bottleGeometry.ts` — telo je već zaobljen
kvadrat kroz superelipsu, ne čist lathe). GLB iz Blendera je zaseban posao: skripta, budžet,
dekoder, zamena `BottleModel` unutrašnjosti; `HeroBottle`/`BottleScene` ne bi menjali API.

### Hero (`components/hero/`, `components/three/HeroBottle.tsx`, `lib/heroChoreography.ts`)

- **Jedan canvas, jedna scena, perspektivna kamera** (fov 30, z 28). Shader ravan ide pravo
  u NDC iz vertex shadera (puni kadar bez obzira na kameru, `renderOrder -1`, bez dubine);
  bočica je običan objekat ispred nje. Staklo refraktuje mint pozadinu jer su u istoj sceni;
  `gl.transmissionResolutionScale = 0.5` da taj drugi prolaz fBm-a ne udvostruči cenu.
- Bočica: desna polovina kadra, 62 % visine, tečnost `#57BFA8`, `RoomEnvironment` (0 bajtova
  mreže, intenzitet 0.6) + jedno key svetlo; idle lebdenje (±1,5 %, 6 s) i yaw (±7°, 11 s),
  pointer parallax ±6° (samo `hover: hover` + `pointer: fine`). Samo ≥ 1024 px; shader sam
  od 769 px; ispod — gradijent, copy puna širina.
- Skrol, **bez pina**: jedan ScrollTrigger (`top top → bottom top`, `scrub: true`) → 0–35 %
  nagib ka copy-ju (+55° z, +12° x), 25–70 % `uPour` (mint front gore-desno → dole-levo,
  ivica iskrivljena warp poljem), 55–100 % skala 1 → 0.7, drift ka centru, opacity → 0.
  Brojevi su čista funkcija u `lib/heroChoreography.ts` (testirano). Stari CSS parallax +
  `scale(1.2)` na omotaču canvasa su uklonjeni (upskejlovali su raster; dubinu daje `uScroll`).
- Bleđenje bočice: tečnost i zatvarač ostaju NEPROVIDNI i blede kroz `alphaHash` — three
  crta transmisivno staklo iz render targeta u koji ulaze samo neprovidni objekti, a
  `transparent` tečnost bi bila odbačena iza prednje površine stakla (prvi pokušaj je tako
  „izgubio" tečnost: bočica je bila mlečna). Staklo bledi običnim `opacity`.
- **Scrim** iza copy kolone (`HeroScrim.tsx`): radijalni veo papira .55 → 0, 120 % kolone.

### Logo putuje u navigaciju (`lib/logoTravel.ts`, `Hero.tsx`)

- Isti scrub trigger; samo `transform` po izmerenim SVG pravougaonicima (wordmark u heroju
  i onaj prikazani u `#nav-logo-slot`). **Bez Flip-a, bez pina.** Do 70 % put, 70–85 %
  crossfade (wordmark → 0 + `visibility: hidden`, nav logo → 1).
- Dva tweena na istom elementu: put na ekranu ide `expo.out` (naslov ide za wordmark-om
  brzinom strane; linearni put bi mu se preklopio preko naslova ~200 px skrola), a
  `yPercent` linearno vraća ono što strana odnese, pa se skrol član tačno skrati.
  Izmereno na 1440: 10 % → wordmark dno 184 px, naslov vrh 345 px; 35 % → wordmark u zoni
  trake (30–64 px); 70 % → tačno na slotu (145, 25, 88 px).
- Ranije zamke koje su otklonjene u proveri: slot ima DVA SVG-a (mark ispod 400 px) —
  meri se onaj sa širinom > 0; timeline traje tačno 1 (inače scrub razvuče crossfade).

### Navigacija (`components/site/SiteNav.tsx` → server omotač + `SiteNavClient.tsx`)

- Frosted traka (`.nav-frost`: 82 % podloge + blur 12 + linija ispod) kad prođe 85 % heroja
  (IntersectionObserver, `ratio < .15`) i na svakoj strani bez heroja. Frost nosi unutrašnja
  traka, ne `<nav>` (backdrop-filter na pretku bi zarobio fixed panel menija).
- **Nađen pravi uzrok „proviruje kroz nav" na /shop:** Tailwind v4 iz `@utility` bloka
  ISPUŠTA `backdrop-filter` — `.glass` je od početka bio samo 72 % papir bez blura (provereno
  u isporučenom CSS-u). `.glass` i `.nav-frost` su sada obične klase u `@layer components`;
  `getComputedStyle(bar).backdropFilter === "blur(12px)"` na /shop i na landingu posle 85 %.
- Brojevi uz Cenovnik (144) i Shop (70) se broje na serveru iz `lib/services` i
  `lib/products` — dva JSON-a ne ulaze u klijentski JS zbog dva broja.
- **Mobilni meni ispočetka:** pun ekran, NEPROVIDNA podloga teme, 28 px linkovi sa brojevima,
  „Zakažite termin", Korpa, Moj nalog, telefoni oba lokala, IG/FB (inline SVG — lucide 1.x
  nema brend ikone), prekidač teme. GSAP: podloga klizi odozgo 320 ms, stavke stagger 45 ms;
  izlaz 150 ms. Body + Lenis zaključani; zatvara: link, Escape, promena rute (izvedeno stanje
  „otvoren na kojoj ruti", bez setState u efektu), hash, prelazak na ≥ 1024 px. Fokus na prvi
  link, nazad na dugme; Tab kruži. Hamburger → X čistim CSS transformom, 44×44.
- Ispravka usput: ikona naloga je na 390 px imala i `hidden` i `inline-flex` (pobedio
  `inline-flex`), pa je dugme menija bilo van trake (369–413 px na 375 px širine).

### ORLY sekcija (`components/sections/ShopHighlights.tsx`, `lib/swatchSpill.ts`)

- `bbm-24` (promo „SAJAMSKI POPUST") je van sajta: `grep -rn "bbm-24" components app`
  vraća samo dva komentara. `public/photos/zid-lakova-1350.avif` ne postoji → zaglavlje je
  panel „prosutih kapi": 12 `ProductSwatch` kapi (bestseleri, naizmenično ORLY/Entity) na
  mint-wash podlozi, naslov sekcije preko, desno na desktopu / traka ispod naslova na
  telefonu. Kad slika stigne: zameniti `<SpillPanel>` sa `next/image` u istom omotaču.

### Provera

```
npm run typecheck   ✓
npm run lint        ✓  (nula upozorenja)
npm test            ✓  169 testova, 11 fajlova (+25: koreografija, put loga, prosute kapi)
npm run build       ✓  83 strane (dva pokušaja pre toga — baseline merenja — pala su na
                        poznatom Windows flake-u 0xC0000374 u generisanju strana; kod nije
                        uzrok, vidi korak 08; chunkovi su i tada bili kompletni)
```

Bundle (`scripts/measure-bundle.mjs` + gzip lenjih chunkova, pre → posle):

| Šta | Pre | Posle | Razlika |
| --- | --- | --- | --- |
| `/` početni JS | 321,2 KB | 323,3 KB | **+2,1 KB** (meni + panel kapi) |
| `/shop` početni JS | 297,7 KB | 299,2 KB | **+1,5 KB** |
| lenji WebGL (three + hero shader + bočica) | 236,0 KB | 237,0 KB | **+1,0 KB** (granica 60 KB) |

U browseru (Playwright, dev server na http://localhost:3001 — pripada paralelnoj sesiji,
nije gašen — pravi točkić miša, svetla tema):

| Provera G | 1920 | 1440 | 390 |
| --- | --- | --- | --- |
| `.pin-spacer` | 0 | 0 | 0 |
| dno strane: sakriven copy / `pending` / `.reveal-word` / `data-reveal-motion=pending` | 0/0/0/0 | 0/0/0/0 | 0/0/0/0 |
| `canvas` | 1 (1905×1080) | 1 (1425×900) | **0**, copy 20–355 od 375 px, bez prekoračenja |
| bočica desno, nagib + mint pri skrolu | ✓ screenshot | ✓ screenshot | — |
| logo: 0 % nav logo 0 · 70 % na slotu · 92 % wordmark `hidden`, nav logo 1 | ✓ | ✓ | klasa (nav logo 1 kad hero prođe) |
| frost posle 85 % | ✓ | ✓ blur(12px) | ✓ |

- `/shop` na 1440: `nav-frost`, `backdrop-filter: blur(12px)`, podloga alfa .82, linija
  1 px, 1 canvas (bočica zida shopa radi i posle refaktora u `BottleModel`).
- 390 meni: podloga `rgb(250,246,241)` neprovidna, 390×844; posle 110 ms prva stavka .34, srednja 0,
  poslednja 0 (stagger), posle 1 s sve 1; `body.overflow=hidden` + `lenis-stopped`; točkić
  600 px → `scrollY` 0; Escape zatvara i vraća fokus na dugme; klik „Shop" → `/shop`, meni
  zatvoren, lock skinut.
- **60 fps** na 1440 tokom skrola kroz ceo hero (nagib + razlivanje + izlazak + logo):
  174 frejma u 2,88 s, medijana 16,7 ms, p95 16,9 ms, najduži razmak 17,0 ms, 0 preko 33 ms.
  (Merenje vredi samo kad je prozor vidljiv: zaklonjen Chromium guši rAF na 1 Hz — prvo
  `page.bringToFront()`.)
- Konzola: 0 grešaka; jedino upozorenje je `THREE.Clock` deprecation iz R3F-a (bilo i ranije).

### Šta čeka / napomene

| Šta | Zašto |
| --- | --- |
| **Model iz Blendera** (novi spec, sekcija „MODEL IZ BLENDERA") | nije rađen u ovom koraku — vidi upozorenje gore; proceduralna bočica je fallback koji spec dozvoljava |
| `public/photos/zid-lakova-1350.avif` | klijent generiše; dok ne stigne, panel kapi |
| `data/site.json` → oba lokala imaju ISTI telefon `064 145 1064` | u mobilnom meniju su dva dugmeta (Ljubičica / Mimoza) sa istim brojem — **[POTVRDITI]** da li Mimoza ima svoj broj |
| Nav je providna dok hero ne prođe 85 % (spec I) | copy prolazi ispod providnih linkova između ~40 i 85 % — isto kao pre koraka 12; ako smeta, prag je jedan broj (`HERO_LEFT_RATIO` u `SiteNavClient.tsx`) |
| `docs/MOTION.md` → „Hero — scroll scenario" | prepisan na stvarno stanje (bez pina/Flip-a/kruga) |

---

Stanje posle koraka **11 — cenovnik kao ulaz u zakazivanje + swatch kao kap laka**
(ispod je i zatečeno stanje posle koraka 08).

## Korak 11 — šta je dodato

### Cenovnik (`components/pricelist/`, `lib/priceList.ts`, `lib/serviceSearch.ts`, `lib/priceListView.ts`)

- **Šest čipova grupa** u lepljivoj traci ispod navigacije (Nega ruku · Nega nogu ·
  Depilacija · Masaža · Trepavice i obrve · Ostalo); Depilacija ima pod-čipove za četiri
  vrste. Klik je filter, ne skok. Na 390 px traka čipova se skroluje vodoravno.
- **Pretraga sa sinonimima**: „gel" nalazi trajni lak i ORLY gel, „obrve" nalazi kanu,
  lift i korekciju obrva, „šećer" i „secer" daju isto. Više reči je presek. Pogodak se boji
  u naslovu. Pretraga i čip se isključuju (kucanje briše čip, pa nema skrivenih pogodaka).
- **Bez filtera**: blok „Najčešće se zakazuje" (6 usluga) + prvih 5 redova svake grupe i
  dugme „Sve usluge u grupi … (n)". Svih 144 stavki je uvek u HTML-u (skrivene nose
  `hidden`), pa pretraživači vide ceo cenovnik.
- **Red usluge**: naziv · trajanje · cena · **„Zakažite"**. Ispod 768 px cela kartica je
  dodirljiva. Dodaci (`addon`) su čipovi ispod grupe („French +300"), paketi nose oznaku
  „paket od 10" i „Raspitajte se" (poziv), stavke bez cene pišu „na upit" i nude „Pozovite".
- Ispod Nege ruku i Nege nogu: red **„Lakovi koje koristimo"** → `/shop`, sa četiri kapi.
- Krugovi iz sekcije Usluge (`PriceGroupLink`) uključuju čip svoje grupe i doskroluju
  do naslova (`#cenovnik-<grupa>` radi i kao direktan link i bez JS-a).

### „Zakažite" → čarobnjak (`lib/sectionIntent.ts`, `lib/useHashIntent.ts`, `components/booking/`)

- Klik postavlja `#zakazivanje?usluga=<key>` (bez novog unosa u istoriju), šalje `bbm:book`
  i glatko skroluje do čarobnjaka; čarobnjak upiše uslugu, ostane na koraku Lokacija
  (ili ode pravo na Dan i vreme ako je lokal već izabran) i **preskače korak Usluga**.
  Tačka „Usluga" nosi ✓, u formi stoji „Zakazujete: Manikir · 45 min · 2.300 RSD" i
  dugme „Promenite uslugu" (i u rezimeu).
- Isti URL radi direktno (`/#zakazivanje?usluga=manikir`), a nepoznat ili nebookable
  ključ samo doskroluje do čarobnjaka, bez greške. Posle poslatog zahteva ili
  „ispočetka" hash se briše, pa reload ne vraća izbor.

### Swatch kao kap laka (`components/shop/ProductSwatch.tsx`, `SwatchDefs.tsx`, `lib/swatch.ts`, `app/globals.css` → `.sw…`)

- Čist CSS + tri SVG filtera (`feTurbulence`, `feColorMatrix`, `feDisplacementMap`) u
  **jednom `<defs>`** u `app/layout.tsx`; 70 kapi ga deli po id-u. Bez ijedne slike — radi i
  za 20 Entity nijansi bez fotografije.
- Po finišu: creme glatko · sheer providno · shimmer fino zrno · glitter konfeti · holo
  duga preko glitera · metallic vrtlog · duochrome dvobojni preliv · base/top/treatment
  providna kap. Oblik i okret teksture su hash hex-a (isti hex → ista kap, SSR-bezbedno).
- Svuda ista komponenta: zid shopa, strana proizvoda (velika kap za Entity, mala uz
  naslov), ORLY sekcija na landingu, admin (kartica i izmena), korpa, fallback bočice u
  zaglavlju shopa. Gloss sweep ostaje i klizi preko reljefa; hover podiže kap 2 px i
  produbljuje senku (samo `transform`, bez repaint-a filtera).

### Provera

```
npm run typecheck   ✓
npm run lint        ✓  (nula upozorenja)
npm test            ✓  144 testa, 8 fajlova (+19 novih: čipovi, sinonimi, pregled, hash, kap)
npm run build       ✓  83 strane
```

U browseru (Playwright, dev server na http://localhost:3001, 1440 px i 390 px):
pretraga „gel" → 27 pogodaka uključujući „Manikir + trajni lak"; čip Nega ruku → 22 usluge
i 13 dodataka; „Zakažite" na Manikir → hash `#zakazivanje?usluga=manikir`, naslov
„U kom lokalu?", Manikir u rezimeu, tačka Usluga ✓, posle lokala „Dalje" vodi na „Kada vam
odgovara?"; direktan URL radi; krug „Masaža" uključuje čip i doskroluje. Na 390 px: čipovi se
skroluju (754 od 375 px), 0 px prekoračenja, dodir na naslov reda otvara čarobnjak.
Zid shopa: 70 kapi, svih 10 finiša; 60 fps tokom skrola (144 frejma u 2,4 s, najduži
razmak 34 ms). Provera otkrivanja teksta iz `docs/MOTION.md`: prazan niz, 0 `pending`,
0 `.reveal-word`, 0 `.pin-spacer` — na `/` (390 i 1440) i na `/shop`.

### Šta čeka / napomene

| Šta | Zašto |
| --- | --- |
| `lib/priceList.ts` → `MOST_WANTED_KEYS` | šest „najčešćih" usluga je iz spec-a — **[POTVRDITI kod vlasnice]** koje se zaista najčešće zakazuju |
| Dugme se zove **„Zakažite"**, ne „Zakaži" | vi-forma kao ostatak sajta (nav „Zakažite", „Pošaljite zahtev"); menja se na jednom mestu: `components/pricelist/strings.ts` → `book` |
| iOS Safari i SVG filteri | WebKit filtere crta softverski; na iPhone-u nije mereno (nema uređaja). Ako zid zapne, tekstura se prebacuje na `background-image` sa data-URI SVG šumom (jedan raster po veličini), bez promene komponente |
| Dev server na portu 3001 | pripada paralelnoj sesiji (Next 16 odbija drugi `next dev` u istom dir-u); provere su rađene protiv njega preko HMR-a, nije gašen |

---

Stanje posle koraka **08 — 3D bočica laka** (nadograđuje korak 07: SEO, demo podaci,
pristupačnost, performanse, priprema za deploy).

## Provera koja prolazi

```
npx convex dev --once   ✓
npm run typecheck       ✓
npm run lint            ✓  (nula upozorenja)
npm test                ✓  125 testova, 7 fajlova
npm run build           ✓  83 strane; /admin dinamičan (ƒ), sitemap.xml i robots.txt statični
```

Sve pet provera su pokrenute jedna za drugom, u ovom redosledu, na ovom kodu.

Provera otkrivanja teksta iz `docs/MOTION.md` vraća **prazan niz** — na `/` i `/shop`,
na 1440 px i na 390 px. `[data-reveal-state="pending"]` je 0, `.reveal-word` je 0,
horizontalnog prekoračenja nema (0 px). Shader se na 1440 px pojavljuje (1 `<canvas>`),
na 390 px ga nema (0) — kako i treba.

## Popravka posle koraka 08 — šta je stvarno bilo slomljeno

Prijava je glasila „pada build". Build **nije** bio uzrok; padale su dve različite
stvari, a jedna od njih se uopšte nije pojavljivala u izveštaju jer nije ni pokretana.

### 1. `npx convex dev --once` — `@convex-dev/auth` nije bio instaliran

Prava, ponovljiva greška. Convex nije mogao da spakuje funkcije:

```
✘ [ERROR] Could not resolve "@convex-dev/auth/server"     convex/auth.ts:2
✘ [ERROR] Could not resolve "@convex-dev/auth/server"     convex/schema.ts:1
✘ [ERROR] Could not resolve "@convex-dev/auth/providers/Password"
```

Paket je i u `package.json` (`^0.0.95`) i u `package-lock.json`, ali ga nije bilo u
`node_modules/@convex-dev/` — prekinuta ili nepotpuna instalacija. Nije greška u kodu:
`convex/auth.ts` i `convex/schema.ts` su ispravni, samo im je zavisnost nedostajala.

Popravka: `npm install`. Posle toga `npx convex dev --once` prolazi
(„Convex functions ready!").

Zašto ovo nije ranije primećeno: korak 08 je zapisao da „nije dirao Convex, pa provera
iz koraka 07 i dalje važi", pa `convex dev --once` nije ni pokrenut. Provera koja se
ne pokrene ne važi — `node_modules` se u međuvremenu promenio, a fajl sa statusom nije.

`npm install` je usput ispravio i `package-lock.json`: sa nekoliko `sharp` i `@emnapi`
opcionih zavisnosti skinuta je oznaka `"dev": true`, jer ih sada preko `@convex-dev/auth`
povlači i produkciono stablo. Metapodatak, ne promena verzije.

### 2. `npm run build` — pad radnog procesa je stvar mašine, ne koda

`build worker exited with code: 3221226356` (`0xC0000374`, oštećenje hipa u radnom
procesu). Reprodukovano jednom na hladnom `.next`-u, pa **22 uzastopna hladna builda
bez ijednog pada** na istom kodu — uključujući merenu seriju od 10/10.

Nije vezano za korak 08: log koraka 07 ga već zove „poznata Windows flake iz ranijih
koraka". Provereno je i da nisu krive `next/og` rute (`opengraph-image`, `icon`,
`apple-icon`, jedini nativni/WASM posao u generisanju strana) — 6 hladnih buildova bez
njih i 6 sa njima prošlo je isto, pa ta veza ne stoji.

Šta se sa padovima poklapa: Next pokreće **15 radnih procesa** (`os.cpus() - 1`) na
mašini sa 16,8 GB ukupno i ~6,4 GB slobodno. Oba pada su se desila dok je mašina bila
opterećena drugim poslom. Ako se vrati, `next.config.ts` → `experimental.cpus` obara
broj procesa; namerno **nije** postavljeno sada, jer trenutno nema šta da popravi —
22/22 prolazi sa podrazumevanom vrednošću.

Ako padne: `rm -rf .next && npm run build` prolazi.

### 3. Zamka u redosledu: `typecheck` posle `rm -rf .next`

Vredi zapisati jer savet iz tačke 2 vodi pravo u nju. `npm run typecheck` odmah posle
brisanja `.next` prijavi tri greške koje **nisu** stvarne:

```
app/layout.tsx(74,50): error TS2304: Cannot find name 'LayoutProps'.
app/shop/[slug]/page.tsx(36,52): error TS2304: Cannot find name 'PageProps'.
app/shop/[slug]/page.tsx(62,55): error TS2304: Cannot find name 'PageProps'.
```

`PageProps` i `LayoutProps` su globalni tipovi koje Next 16 generiše u `.next/types`.
Obrisan `.next` znači da ih nema. `npm run build` ih vrati i `typecheck` prolazi —
kod se ne dira. Zato provere idu **build pre typecheck-a** kad je `.next` obrisan.

Nijedan test nije menjan: 125/125 prolazi i prolazilo je sve vreme.

## Prethodni korak (07) nije ostavio ništa slomljeno

`typecheck` i `lint` su prošli pre ijedne izmene u koraku 08, a produkcija
https://beautybymasha-mu.vercel.app je bila HTTP 200 na `/`, `/shop` i `/nalog`.
Jedna stvar **jeste** bila pokvarena i popravljena je — vidi „Fotografija proizvoda je
bila nevidljiva do prvog skrola" niže.

## Prethodni korak (06) nije ostavio ništa slomljeno

`typecheck` i `lint` su prošli pre ijedne izmene. Produkcija
https://beautybymasha-mu.vercel.app je bila HTTP 200 na `/`, `/shop` i `/nalog`.
`/kontakt` vraća 404 — to je ispravno, kontakt je podnožje landinga (`/#kontakt`),
ne zasebna ruta.

---

# ⚠ Blokira predaju — pročitati prvo

## 1. Produkcija nema ključeve za prijavu

`npx convex env list --prod` pokazuje samo `ADMIN_KEY`, `OWNER_EMAIL` i `SITE_URL`.
**Nedostaju `JWT_PRIVATE_KEY` i `JWKS`.** Bez njih Convex Auth ne može da potpiše token,
pa se na produkciji **niko ne može prijaviti ni registrovati** — ni kupac, ni vlasnica.
Na dev deployment-u su oba postavljena i prijava tamo radi (provereno u koraku 05).

Nisam ih postavio: to je izmena na produkciji, a zadatak je bio pripremiti, ne deployovati.

Ključ se generiše i postavlja **iz Bash-a, ne iz PowerShell-a** — PowerShell preseče
višelinijsku vrednost na prvom prelomu reda i ostane samo prva linija:

```bash
npx @convex-dev/auth --prod        # generiše i postavi oba ključa
# ili ručno, ako ključ već postoji:
npx convex env set JWT_PRIVATE_KEY "$(cat kljuc.pem)" --prod
npx convex env get JWT_PRIVATE_KEY --prod | wc -c   # mora biti ceo ključ, ne ~30 znakova
```

Posle toga proveriti registraciju na produkciji imejlom iz `OWNER_EMAIL` — taj nalog
odmah dobija `role: "admin"`.

## 2. Produkciona baza je prazna

Sve što je večeras naseljeno je na **dev** deployment-u (`grand-bandicoot-904`).
Produkcija (`good-swordfish-571`) nema ni katalog ni demo podatke. Pre prikaza:

```bash
npm run seed -- --prod        # katalog + demo saobraćaj
```

A **pre nego što panel ode vlasnici**:

```bash
npm run seed:clear -- --prod  # skida demo termine i porudžbine; katalog ostaje
```

---

# Šta korak 08 dodaje — 3D bočica laka

**3D je ušao.** Model se pravi proceduralno u kodu, nema `.glb` fajla, i početni JS
nijedne strane nije porastao ni za 3 KB gzip.

## Provera

```
npm run typecheck   ✓
npm run lint        ✓  (nula upozorenja)
npm test            ✓  125 testova, 7 fajlova
npm run build       ✓  83 strane
```

### Bundle — mereno pre i posle, istim alatom

Novi `scripts/measure-bundle.mjs` čita `<script src>` iz sagrađenog HTML-a i gzip-uje
svaki chunk. Tabela iz `next build` meša deljene chunkove i ne kaže koliko je porasla
baš jedna ruta.

| Ruta | Pre | Posle | Razlika |
| --- | --- | --- | --- |
| `/` | 305,7 KB | 306,2 KB | **+0,5 KB** |
| `/shop` | 294,2 KB | 296,7 KB | **+2,5 KB** |
| `/shop/[slug]` | 283,4 KB | 285,7 KB | **+2,3 KB** |

Granica iz zadatka je bila 150 KB gzip. Ostali smo na **2,5 KB** jer u početni JS ulazi
samo kapija i `next/dynamic` kukica — `three` nije unutra, provereno grepom po
chunkovima koje sagrađeni `/shop` zaista traži (`WebGLRenderer` se ne pojavljuje ni u
jednom). Lenji chunk sa `three` je 230 KB gzip i stiže tek pošto kapija propusti; taj
isti chunk je već postojao zbog hero shadera.

## Model — `components/three/bottleGeometry.ts`

Nema `.glb` fajla. Mreža je nula bajtova na mreži: sve je u kodu, pa nema ni skidanja
ni Draco dekodera ni promašenog keša.

Tri mreže sa imenima koja traži `docs/3D-ASSETS.md`:

| Mesh | Materijal | Trouglova |
| --- | --- | --- |
| `Glass` | `MeshPhysicalMaterial`, `transmission` 1.0, `roughness` 0.05, `ior` 1.45, `thickness` 0.15 | ~3.400 |
| `Liquid` | `MeshStandardMaterial`, boja iz `hex` proizvoda, `roughness` 0.15 | ~2.700 |
| `Cap` | `MeshStandardMaterial`, `#161311`, `roughness` 0.4 | ~1.400 |

Ukupno ispod 8.000 trouglova — budžet je 40.000. Dno je u `y = 0`, centrirano po X i Z,
ukupna visina 9,48 jedinice, nivo tečnosti na 80% visine tela. **Nema logotipa ni teksta
na modelu**, kako traže i brief i `docs/3D-ASSETS.md`.

**Presek nije krug.** `LatheGeometry` po definiciji daje okruglo telo, a bočica laka je
zaobljen kvadrat. Zato se posle vrtnje svako teme gurne po superelipsi
(`1 / (|cosθ|^n + |sinθ|^n)^(1/n)`), sa `n` koje pada sa visinom: kvadratasto pri dnu,
okruglo u vratu, gde zatvarač naleže. Isti profil, isti broj temena, tačan oblik.

Okruženje je `RoomEnvironment` provučen kroz PMREM — jednom, u kodu, bez ijednog fajla.
Bez njega `transmission` staklo izgleda kao siva plastika. Kači se direktno na materijale
kroz ref, ne na `scene.environment`: scena je tuđi objekat, a `setState` iz efekta bi bio
jedan bespotreban prolaz kroz render.

Bez postprocessinga, bez senki, jedno usmereno svetlo — kako traži `docs/3D-ASSETS.md`.

## Gde se vidi

| Mesto | Šta radi |
| --- | --- |
| zaglavlje `/shop` | tečnost prati nijansu nad kojom je kursor u zidu swatch-eva; kad kursor ode sa zida, vraća se na podrazumevanu (prvi bestseler iz kategorije „lakovi") |
| `/shop/[slug]` | bočica u nijansi tog proizvoda, ispod fotografije |

Hover ide kroz mali spoljni store (`components/shop/hoveredShade.ts`) i **jedan**
delegirani `pointerover` na omotaču zida — `<li>` nosi hex u `data-shade`. Bez toga bi
podizanje state-a ponovo renderovalo svih 70 kartica na svaki prelaz mišem.

Fotografija proizvoda **ostaje glavni prikaz** i ono što ide u Google Images. Bočica je
dodatak ispod nje, ne zamena.

## Kapija — nikad na mobilnom, nikad uz „smanji kretanje"

`lib/webgl.ts` (`useWebGLAllowed`, `useCanvasActive`). Ta dva hooka su bila lokalna u
`components/hero/Hero.tsx`; sad su na jednom mestu i hero ih uvozi odatle. Druga kopija
istog pravila značila bi da se „nikad na mobilnom" jednog dana promeni na jednom mestu a
na drugom ne.

Provereno u browseru:

| Uslov | `<canvas>` na `/shop` | na `/shop/vintage` |
| --- | --- | --- |
| 1440 px, bez reduced-motion | 1 | 1 |
| 390 px | **0** | **0** |
| 1440 px + `prefers-reduced-motion: reduce` | **0** | **0** |

Kad 3D ne sme: na `/shop` ostaje krug boje, na strani proizvoda ostaje fotografija koja
ionako stoji iznad. Nula grešaka u konzoli. Nema horizontalnog prekoračenja ni na 390 px.

Provera otkrivanja teksta iz `docs/MOTION.md` je **prazna** na `/`, `/shop` i
`/shop/vintage`, na 1440 px i na 390 px: 0 sakrivenog copy-ja, 0
`[data-reveal-state="pending"]`, 0 `.reveal-word`.

---

# Popravljeno iz ranijih koraka

## Fotografija proizvoda je bila nevidljiva do prvog skrola

**Bilo je i na produkciji**, ne samo lokalno. Na `/shop/[slug]` je glavna fotografija
dočekivala gosta kao prazno mesto; pojavila bi se tek kad se strana pomeri.

Uzrok je u `components/motion/Reveal.tsx`. `start: "clamp(top 85%)"` gura start koji bi
pao pre vrha strane na tačno 0, pa element koji je već u prvom ekranu stoji **na** startu,
a ne iza njega. `onEnter` traži prelazak i nikad ne okine, a `Reveal` je u međuvremenu
sam sakrio sadržaj (`clipPath: inset(100% 0 0)`) — ko krije, taj i otkriva, a ovde niko
nije otkrio.

Popravka je `onRefresh` koji pusti timeline kad je start već dostignut:

```ts
onRefresh: (self) => {
  if (self.scroll() >= self.start) tl.play();
}
```

Dodat je i `trigger.kill()` u čišćenju — ranije je trigger ostajao živ kad se komponenta
ukloni pre nego što uđe u kadar.

Ovo važi za **svaki** `Reveal` iznad preloma, ne samo za fotografiju proizvoda.

---

# Šta korak 07 dodaje

## Demo podaci — `convex/seedDemo.ts`

`npm run seed` / `npm run seed:clear`.

| Šta | Koliko |
| --- | --- |
| Termini kroz **tekuću nedelju** | 14, oba lokala, sva tri resursa, mešano `nov` i `potvrdjen` |
| Porudžbine | 5 — po jedna u svakom statusu (`nova`, `u_obradi`, `poslata`, `zavrsena`, `otkazana`), jedna sa loyalty popustom |
| Loyalty članovi | 3, sa 3 zapisa iskorišćenog popusta |
| Poruke sa kontakt forme | 2 (jedna nova, jedna odgovorena) |

Dva pravila koja ovo drže:

- **Datumi se računaju od „danas".** Termini kreću od `startOfWeek(belgradeNow().date)`,
  porudžbine i loyalty istorija od `Date.now()`. Ništa nije zakucano — seed jednako
  izgleda i za mesec dana.
- **Demo se prepoznaje po kontaktu, ne po zastavici u shemi.** Telefon iz opsega
  `0641230xxx` i imejl na `demo.beautybymasha.rs`. Oba se čitaju kroz postojeće
  indekse (`bookings.by_phone`, `orders.by_phone`), pa `clear` briše tačno ono što je
  seed napravio i nijedan pravi podatak. Zato je i `run` idempotentan: prvo obriše
  prethodni demo, pa upiše nov. Provereno: `run` → `run` → `clear` → `run` daje isto
  stanje, `clear` je vratio tačno 14 / 5 / 3 / 3 / 2.

Utorak u Ljubičici namerno ima **tri manikira u 10:00** — kapacitet noktiju je 3, pa se
u kalendaru mora videti kao tri uske trake jedna do druge. Ponedeljak nema nijedan
termin u Mimozi, jer Mimoza ponedeljkom ne radi.

## SEO

| Fajl | Šta radi |
| --- | --- |
| `lib/jsonLd.ts` | + `localBusinessJsonLd`, `organizationJsonLd`, `websiteJsonLd`. `productJsonLd` / `catalogJsonLd` / `breadcrumbJsonLd` su već postojali. |
| `app/page.tsx` | 4 JSON-LD bloka na naslovnoj: `Organization`, `WebSite`, i **dva odvojena `BeautySalon`** entiteta. |
| `app/sitemap.ts` | `/`, `/shop`, 70 stranica proizvoda. Panel, nalog, korpa, plaćanje i praćenje porudžbine nisu unutra. |
| `app/robots.ts` | `Disallow` za `/admin`, `/nalog`, `/korpa`, `/placanje`, `/porudzbina` + `Sitemap` i `Host`. |
| `app/opengraph-image.tsx` | 1200×630, crta se iz `LogoMark` (iste SVG putanje kao logo) — ne zavisi ni od jednog fajla u `public/`. |
| `app/layout.tsx` | + `twitter: summary_large_image`, `robots`, `applicationName`, `formatDetection`. |
| `lib/jsonLd.test.ts` | 9 testova — struktuirani podaci se ne vide na ekranu, pa greška u njima ostaje tiha mesecima. |

**Dva lokala = dva entiteta**, sa različitim `@id`, adresom i radnim vremenom. Provereno
u sagrađenom HTML-u:

```
BeautySalon | Beauty by Masha — Ljubičica | .../#lokal-ljubicica
    Monday 09:00 - 21:00
BeautySalon | Beauty by Masha — Mimoza    | .../#lokal-mimoza
    Monday 00:00 - 00:00      ← Schema.org zapis za „zatvoreno"
```

Zatvoren dan se **ne preskače** nego se piše kao `00:00–00:00`. Preskočen dan Google
čita kao „ne znamo", što nije isto što i „ne radi".

`generateMetadata` / `metadata` postoji na svakoj ruti, sa srpskim naslovom i opisom.
`/nalog` je prebačen sa `index: true` na `index: false` — iza prijave nema šta da se
rangira. Sve slike na `/shop` (50 komada) imaju `alt`, `sizes` i stižu kao AVIF.

## Pristupačnost

- **Skip-link** — `components/site/SkipLink.tsx`, montiran u `app/layout.tsx`.
  Provereno: prvi `Tab` na stranici ga fokusira, visok je 44 px, vidljiv (ink na paper,
  kontrast ~15:1), meta `#sadrzaj` postoji. `<main id="sadrzaj">` je dodat na **svaku**
  rutu, uključujući oba ekrana panela.
- **Mint nikad kao tekst** — `grep` za `text-mint` u `app/`, `components/`, `lib/` je prazan.
  Fokus prsten koristi `--mint-deep` u svetloj temi, `--mint` u tamnoj.
- `prefers-reduced-motion` je već gasio shader, parallax, magnetic i clip-reveal
  (korak 04) — provereno da i dalje važi.

## Performanse

| Mereno posle `npm run build` | gzip |
| --- | --- |
| Početni JS naslovne strane | **305 KB** (958 KB nekompresovano, 14 chunkova) |
| `/shop` | 293 KB |
| `/shop/[slug]` | 283 KB |

**`three` / R3F nisu u početnom bundle-u.** Dva chunka koja sadrže `three`
(870 KB i 424 KB nekompresovano) ne pojavljuju se u `<script>` listi sagrađene
naslovne strane — učitava ih `dynamic(() => import("./LiquidCanvas"), { ssr: false })`
tek kad `useHeroWebGL` odluči da sme (WebGL2, širina preko 768 px, bez
`prefers-reduced-motion`). Na 390 px u browseru: 0 `<canvas>` elemenata.

305 KB je pošteno za ono što nosi (GSAP + ScrollTrigger + Flip, Convex klijent, Motion,
Lenis), ali nije malo. Ako zatreba obaranje, tu su najveći kandidati.

## Sitne ispravke

- **`Ljubicica` → `Ljubičica`** u `data/site.json` (`name`, `fullName`, `building`).
  Videlo se na javnom sajtu i u panelu. `fullName` oba lokala sada koristi crtu
  „—" umesto „-". `seedCore` sada i **ažurira** ime lokala u bazi kad se razlikuje
  od `data/site.json` — naziv se u panelu ne menja (tamo se lokal samo pali i gasi),
  pa je JSON jedini izvor. Bez toga bi ispravka ostala samo na sajtu.
- **`convex/lib/seed.ts`** — logika iz `admin.init` / `admin.seedShop` je izvučena u
  `seedCore` / `seedShopCore`, pa je zovu i panel (uz ključ) i `seedDemo` (iz komandne
  linije, bez ključa). Ranije bi to postojalo u dve verzije koje se razilaze.
  Ponašanje `admin.init` i `admin.seedShop` je nepromenjeno.
- `README.md` je bio `create-next-app` boilerplate — sada ima pokretanje, komande,
  tabelu env promenljivih i uputstvo za seed.

---

# Šta ne radi / nije napravljeno

| Šta | Zašto |
| --- | --- |
| **Prijava na produkciji** | nedostaju `JWT_PRIVATE_KEY` i `JWKS` — vidi blokadu 1 gore |
| **Potvrda termina se ne šalje gostu** | kanal nije dogovoren (imejl / Viber / SMS). Panel čuva tekst poruke, potvrda uredno upisuje termin u kalendar, ali ništa ne odlazi. `RESEND_API_KEY` nije postavljen. |
| **IPS QR plaćanje** | broj računa salona nije poznat. Kod je gotov i testiran; dok je `IPS_RECIPIENT_ACCOUNT` prazan, sajt nudi samo pouzeće. |
| **`geo` u JSON-LD** | tačne koordinate oba ulaza nisu potvrđene i nisu izmišljene. `hasMap` (Google Maps pretraga po `mapsQuery`) radi isti posao dok koordinate ne stignu. Postoji test koji pada ako neko ubaci `geo`. |
| **SSR zaštita `/admin`** | i dalje kao u koraku 06: `noindex` sa servera + klijentska kapija + `assertAdmin`/`assertStaff` na **svakom** upitu i izmeni. Bez uloge se ne dobija nijedan podatak. Prava SSR zaštita traži zamenu `ConvexAuthProvider` sa `ConvexAuthNextjsProvider` i diranje prijave na celom sajtu — zaseban korak sa sopstvenom proverom. |
| **`alt` na swatch slikama u katalogu** | namerno prazan: slika sedi u `<span aria-hidden>`, a naziv proizvoda stoji odmah ispod. Puni `alt` ima slika na stranici proizvoda — ta ide u Google Images. |
| **Google Business povezivanje** | schema je spremna, ali NAP mora da se poklopi sa profilom koji ona ima. Ne može bez pristupa njenom Google nalogu. |

## Secrets u gitu

Čisto. `.env*` je u `.gitignore`, `git ls-files` ne vraća nijedan `.env`, a skeniranje
praćenih fajlova na obrasce API ključeva, privatnih ključeva i lozinki daje jedan
pogodak — `convex/auth.ts:18`, poruka o validaciji `"Lozinka mora imati bar 8 znakova."`.
Nije tajna.

---

# Svaki `[POTVRDITI]` koji je ostao, sa putanjom

## Vidi se gostu na sajtu

| Fajl | Šta čeka |
| --- | --- |
| `app/shop/page.tsx:55` | „Cene proizvoda su okvirne dok ih ne potvrdi vlasnica." — tekst na `/shop` |
| `components/sections/ShopHighlights.tsx:92` | ista rečenica na landingu |
| `components/sections/ReviewsSection.tsx:52` | da li smemo da prikazujemo ocene sa 011info |
| `components/cart/CheckoutView.tsx:107` | poruka da IPS QR ne postoji dok nema broja računa |

## Podaci o salonu — `data/site.json`

| Linija | Šta čeka |
| --- | --- |
| `:9` `urlNote` | domen. Sad je Vercel adresa; kad kupi domen menja se ovde **i** u Vercel podešavanjima **i** u `SITE_URL` na oba Convex deployment-a |
| `:97` `capacityNote` (Ljubičica) | koliko ljudi istovremeno radi nokte / kozmetiku / masažu. Sada: 3 / 1 / 1 |
| `:172` `capacityNote` (Mimoza) | isto. Sada: 2 / 1 / 1 |
| `:192` `shipping.note` | poštarina 400 RSD, besplatno preko 6.000 — uskladiti sa njenim kurirom |
| `:202` `ips.accountNote` | **tekući račun salona**, 18 cifara. Nije poznat, ne izmišljati |
| `:203–204` `ips.recipientName` | naziv primaoca tačno kako stoji u banci (verovatno pun naziv iz APR-a) |
| `:205–206` `ips.recipientAddress` | ulica i broj sedišta firme |
| `:207–208` `ips.recipientCity` | poštanski broj i grad sedišta |
| `:210` `ips.paymentCodeNote` | da li njena banka traži šifru drugu od `289` |

Sve iz `ips` bloka se u produkciji prebrisuje Convex env promenljivama
(`IPS_RECIPIENT_ACCOUNT` i ostale) — račun ne treba da uđe u git.

## Cene i usluge

| Fajl | Šta čeka |
| --- | --- |
| `data/products.json:7` `priceNote` | **sve cene proizvoda.** Preračunate iz USD, okvirne. Treba njena maloprodajna lista |
| `lib/products.ts:6`, `:64` | isto, u komentarima tipa |
| `data/services.json` (18 mesta) | 15 „paket" stavki — sadržaj paketa nije poznat; 4 stavke bez cene: `brow-lamination`, `kana-obrve`, `sminkanje`, `detox-paket` (postoje kao Instagram highlight, nema ih u cenovniku) |
| `lib/services.ts:104` | isti nepocenjeni artikli, kroz `unpricedServices` |
| `lib/serviceCategories.ts:5` | `BRAND.md` traži peti krug „Nega lica", a u cenovniku nema takve grupe |

## Poslovna pravila

| Fajl | Šta čeka |
| --- | --- |
| `convex/lib/availability.ts:77` | podrazumevani kapaciteti — isto pitanje kao `capacityNote` gore |
| `convex/lib/loyalty.ts:12` | pravila loyalty ciklusa: koliko traje, da li se popust obnavlja po poseti ili po vremenu |
| `docs/ADMIN.md:45` | kanal potvrde termina: imejl / Viber / SMS |
| `docs/BRIEF.md:9` | prezime vlasnice i da li njeno ime uopšte ide na sajt |
| `docs/BRIEF.md:37` | nedelja 10–17 (Instagram) ili 10–20 (011info)? Sada je u sistemu 10–20 |
| `docs/BRIEF.md:102` | da li smemo da objavimo fotografije radova sa Instagrama |
| `docs/BRAND.md:128` | isto pitanje o recenzijama sa 011info |

## Nije `[POTVRDITI]`, ali čeka nju

- **Radno vreme nije potvrđeno** (`hoursConfirmed: false`). Baner u tabu „Radno vreme"
  upravo to traži. Sve zavisi od ovoga — sajt nikad ne nudi vreme van radnog vremena.
- **Trajanja usluga su procena.** Cene su verbatim iz cenovnika i ne diraju se; trajanja
  su naša i menjaju se kroz admin. Ako je trajanje pogrešno, gost stiže u pogrešno vreme.

---

# Ako se nastavlja

Redosled po tome koliko boli ako se ne uradi:

1. `JWT_PRIVATE_KEY` + `JWKS` na produkciji, pa provera registracije (blokada 1).
2. `npm run seed -- --prod`, pa obilazak produkcije kao gost.
3. Kanal potvrde termina — jedina rupa u toku zakazivanja koju gost oseti.
4. Prave cene proizvoda i sadržaj paketa, od nje.
5. SSR zaštita `/admin`, kao zaseban korak sa sopstvenom proverom prijave, korpe i naloga.

---

# Dodatak — potpun popis `[POTVRDITI]` u kodu

Iznad su grupisana po pitanju. Ovde su **sva pojavljivanja**, da se ništa ne izgubi.
Ona označena „komentar" nisu novo pitanje — objašnjavaju neki od markera odozgo.

| Putanja i linija | Vrsta |
| --- | --- |
| `app/shop/page.tsx:55` | tekst na sajtu |
| `components/sections/ShopHighlights.tsx:92` | tekst na sajtu |
| `components/sections/ShopHighlights.tsx:17` | komentar (upućuje na `products.meta.priceNote`) |
| `components/sections/ReviewsSection.tsx:52` | tekst na sajtu |
| `components/sections/ReviewsSection.tsx:14` | komentar (dozvola za citiranje 011info) |
| `components/cart/CheckoutView.tsx:107` | tekst na sajtu |
| `lib/ips.ts:10` | komentar (prazan račun) |
| `lib/ips.ts:69` | **kod** — `"[POTVRDITI]"` u vrednosti se tretira kao prazno polje |
| `lib/jsonLd.ts:146` | komentar (nema `geo`, vidi „Šta ne radi") |
| `lib/products.ts:6`, `lib/products.ts:64` | komentar (okvirne cene) |
| `lib/serviceCategories.ts:5` | otvoreno pitanje (peti krug „Nega lica") |
| `lib/services.ts:38` | komentar (`priceRsd: null`) |
| `lib/services.ts:104` | komentar (`unpricedServices`) |
| `lib/site.ts:4`, `lib/site.ts:87` | komentar (pravilo: `[POTVRDITI]` ostaje u JSON-u) |
| `convex/lib/availability.ts:77` | otvoreno pitanje (kapaciteti) |
| `convex/lib/loyalty.ts:12` | otvoreno pitanje (loyalty ciklus) |
| `convex/schema.ts:349` | komentar (`priceRsd: null`) |
| `convex/shop.test.ts:399` | komentar — test pada onog dana kad broj računa uđe u `data/site.json`, i to je namerno |
| `data/site.json` — `:9 :97 :172 :192 :202 :203 :204 :205 :206 :207 :208 :210` | otvorena pitanja (tabela gore) |
| `data/products.json:7` | otvoreno pitanje (sve cene proizvoda) |
| `data/services.json` — 18 mesta (`:102–:106`, `:117–:118`, `:133–:137`, `:147–:148`, `:175–:178`) | sadržaj 15 paketa + 4 usluge bez cene |
| `docs/BRIEF.md:4` | legenda oznake, ne pitanje |
| `docs/BRIEF.md:9` | prezime vlasnice, da li ime ide na sajt |
| `docs/BRIEF.md:37` | nedelja 10–17 (Instagram) ili 10–20 (011info) |
| `docs/BRIEF.md:60` | 4 usluge sa Instagrama kojih nema u cenovniku |
| `docs/BRIEF.md:92` | sve cene proizvoda |
| `docs/BRIEF.md:102` | dozvola za objavu fotografija radova |
| `docs/BRIEF.md:107` | imena radnica i raspored (zato model kapaciteta ne traži imena — ADR-001) |
| `docs/BRAND.md:128` | dozvola za citiranje recenzija |
| `docs/ADMIN.md:45` | kanal potvrde termina |
| `docs/PLAN.md:40` | pravilo projekta, ne pitanje |
