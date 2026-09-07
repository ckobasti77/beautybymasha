# STATUS

Stanje posle koraka **18 — hero se pušta jednim skrolom, 3D na telefonu, žiroskop, dugme za vrh**
(ispod: korak 16, 15, 14, 13, 12, 11, pa zatečeno stanje posle koraka 08). Ovo je lista za jutro:
šta radi, šta ne radi, i svaki `[POTVRDITI]` sa putanjom fajla.

## Korak 18 — hero v4: jedan skrol pušta uvod, bočica i na telefonu, žiroskop, „nazad na vrh"

Četiri zahteva. Koreografija iz koraka 13–16 je **netaknuta** — nijedna vrednost u
`lib/heroChoreography.ts`, `lib/logoTravel.ts`, `lib/logoSignature.ts` ni `lib/heroColors.ts`
nije promenjena. Menja se samo KO vozi `p`, na kojim uređajima se crta, odakle dolazi nagib, i
dodaje se jedno dugme.

### 1. Uvod se pušta jednim skrolom (`lib/heroPlayback.ts`, novo)

`p = max(timeP, scrollP)`. Stanja `armed → playing → handoff → done`; naoružavanje na
`scrollY ≤ 2` zadržano 350 ms, okidač prvi `wheel` naniže / `touchmove` > 6 px /
`Space`/`PageDown`/`ArrowDown`, tween `{v:0} → 0.75` za `PLAY_MS = 2200` (`power2.inOut`), pa
`lenis.scrollTo(vrh .hero-overlap, 0.9 s, easeInOutCubic)`.

**Odstupanje od specifikacije, sa razlogom.** Specifikacija traži da skrol stoji zaključan na 0
dok vreme vozi `p`. To ne može: `p` nije samo izgled. `stageLag(p)` i `shelfEdgeInStage(p)`
prevode napredak u PIKSELE rasporeda i oba pretpostavljaju `p === scrollP` (sticky stage miruje
do HOLD_END = 0.41, posle zaostaje za stranom). Na `p = 0.75` uz `scrollY = 0` model računa vrh
stage-a na −0.29 vh, a stvarni je +0.29 vh — razlika je 0.58 vh: pojas prazne pozadine na vrhu
kadra i bočica koja lebdi 29 % kadra iznad police. Zato reprodukcija vozi VREME I SKROL u
koraku: tween piše `timeP` i istim brojem programski postavlja poziciju strane. `max(timeP,
scrollP)` je i dalje ono što se izvršava (štiti kad ScrollTrigger kasni frejm i kad korisnik
skoči napred), lock i dalje postoji i traje najviše 3 s, a mereno je da se model i DOM slažu:
na `p = 0.75` `stageTop` iz modela = −300 px, izmeren `getBoundingClientRect().top` = −297 px.
Na kraju `playing` se `timeP` **otpušta** (ne zamrzava na 0.75) — skrol je već tu gde treba, pa
nema skoka ni tada ni kad se korisnik vrati nagore.

**Lock** je `lenis.stop()` (Lenis tada `preventDefault`-uje wheel i touch) +
`html[data-hero-play] { overscroll-behavior: none }`. `overflow: hidden` iz `.lenis-stopped` se
u tom prozoru poništava (`app/globals.css`) — na delu motora zaključava i programski skrol.
`body` se ne dira nigde.

**Indikator „Preskoči" — odstupanje.** Specifikacija traži da POSTOJEĆI indikator skrola na dnu
heroja promeni tekst. Indikatora nema i nikad ga nije bilo (poziv da se skrola nosi bočica koja
na hover podigne zatvarač). Umesto novog overlay-a dodat je `components/hero/HeroSkip.tsx`: dugme
44 px, `aria-label="Preskoči uvod"`, `fixed` na dnu kadra, u DOM-u SAMO dok traje `playing`.
`fixed` i van `.hero-stage` jer stage ima `will-change: transform` (containing block) i u drugoj
polovini reprodukcije odlazi iznad kadra.

### 2. 3D bočica i na telefonu (ADR-005 povučen → ADR-005b)

`lib/webgl.ts` više ne gleda širinu nego sposobnost: `webgl2` + ne-reduced-motion +
(`deviceMemory ≥ 4` ILI `hardwareConcurrency ≥ 4`, polje kojeg nema prolazi) + prvi frejm ispod
120 ms (`gl.finish()` na probnom platnu 64×64). Poslednja odbrana je merenje u radu: prosek
frejma u prve 2 s > 26 ms → platno se demontira, vraća se `HeroDrop`, razlog u
`window.__bbmHero.downgrade`.

Širina više ne odlučuje DA LI se crta, nego dve druge stvari:

| | upit | šta menja |
| --- | --- | --- |
| BUDŽET (`useMobileBudget`) | `(max-width: 767px), (pointer: coarse)` | `dpr` 1.25 (desktop 1.5), `antialias: false`, `powerPreference: "low-power"`, `uOctaves` 3 → 2, staklo bez `transmission` (`MeshStandardMaterial`, `opacity` 0.4, `envMapIntensity ×2`) |
| RASPORED (`useNarrowLayout`) | `(max-width: 1023px)` | bočica u donjem pojasu: 25 % visine kadra, centrirana, baza na 99 % |

Dva upita, ne jedan: tablet u landscape-u ima grubu kazaljku i skroman GPU, ali širok kadar —
zaslužuje jeftin render i desni raspored. `uOctaves` je uniform sa `break` u petlji (GLSL ES 1.00
traži konstantnu gornju granicu), pa se treći sloj šuma na telefonu zaista ne računa.

**Odstupanja, sa razlogom.**

| specifikacija | urađeno | zašto |
| --- | --- | --- |
| bočica 44 % visine kadra | **25 %**, baza na 99 % | hero copy na 390×844 ide do y = 605 i posle zbijanja (`pt` 112→80, `gap` 40→20, wordmark 78vw→58vw, razmaci 24→16 px). Slobodan pojas je 239 px = 28 % kadra, a bočici treba i vazduh iznad zatvarača. Sa 44 % bi zatvarač presekao dugmad; „copy ostaje čitljiv" je jači uslov od broja. |
| desktop `dpr` 2 | **ostaje 1.5** | 1.5 je izmeren budžet iz koraka 12 za fBm shader; podizanje na 2 udvostručuje trošak fragmenta na desktopu, a nijedan od četiri zahteva to ne traži. |
| `transmissionResolutionScale` se ne koristi na telefonu | tako je | bez transmisije drugog prolaza nema, pa podešavanje ni ne postoji. |

Merenje (390×844, Chrome, 4× CPU throttle, 2,5 s kroz celu reprodukciju): **prosek frejma
11,1 ms, p95 18,9 ms** (prag 26 ms), bez downgrade-a. Sopstveno merenje komponente
(`FrameBudget`, prve 2 s posle prva tri frejma): **8,0 ms**. Put pada je proveren tako što je
prag privremeno spušten na 0,1 ms — platno se demontiralo, `HeroDrop` i `.hero-pour` su se
montirali, `window.__bbmHero.downgrade` = „prosek frejma 8.0 ms > 0.1 ms". Lenji chunk se nije
menjao (isti `LiquidCanvas` + `HeroBottle`).

### 3. Žiroskop (`lib/tilt.ts`, novo)

Jedan modul, isti izlaz `{x, y}` u −1..1 za `uPointer` i nagib bočice; `pointermove` za finu
kazaljku, `deviceorientation` inače. iOS `requestPermission()` se zove IZ ISTOG gesta koji pušta
animaciju (`onGesture` u `heroPlayback`), nikad na učitavanju; odbijena dozvola = tišina.
Kalibracija na prvo očitavanje, mrtva zona 1.5°, lerp 0.12 po događaju, amplituda **pola**
desktopske, odjava kad hero izađe iz kadra ili se tab sakrije.

### 4. „Nazad na vrh" (`components/site/BackToTop.tsx`, novo)

48 px, `.nav-frost` + mint-deep strelica, `z-40`, `fixed right-5 bottom-[calc(1.25rem+safe-area)]`,
opacity+scale 200 ms, `aria-label`/`title` „Nazad na vrh", `lenis.scrollTo(0, 0.8 s)`, posle
dolaska fokus na nav logo. Sakriveno dok je `body` zaključan (meni ili dijalog) i u `/admin`.
Dolazak na vrh naoružava hero bez ijedne posebne linije — `heroPlayback` gleda samo `scrollY`.

### Provera (Playwright, dev, 1440×900 i 390×844)

| # | šta | rezultat |
| --- | --- | --- |
| 1 | jedan `wheel` od 40 px sa vrha | `p` raste bez daljeg skrola; `p = 0.75` na 2,2 s; strana sama stigne do `.hero-overlap`, `rect.top = 0 px` ✅ |
| 2 | trajanje okidač → mirovanje | **≈ 2,9 s** (2,2 s reprodukcija + 0,9 s handoff), traženo 2,0–3,4 ✅ |
| 3 | prekid: `wheel` 300 px posle 400 ms | otključano za **45 ms** (prag 150), tween na kraju, strana se pomera normalno ✅ |
| 4 | sakriven tab 5 s | po povratku strana nije zaključana (`data-hero-play` skinut, `lenis-stopped` skinut), skrol radi ✅ |
| 5 | `Escape` i klik; „Preskoči" tastaturom | `Escape` → `handoff`, otključano ✅; dugme fokusabilno, `click` → `handoff` za 30 ms ✅ |
| 6 | ponovno naoružavanje preko dugmeta za vrh | `scrollY = 0`, fokus na nav logo, posle 350 ms stanje `armed`, novi mali skrol ponovo pušta uvod ✅ |
| 7 | deep link `/#cenovnik` | `scrollY = 7579`, nema locka, stanje `done`, `wheel` ne pušta animaciju ✅ |
| 8 | telefon 390 | `touchmove` od 12 px pušta uvod; canvas 375×844 px, `HeroDrop` nije montiran; prosek frejma 11,1 ms uz 4× throttle ✅ |
| 9 | žiroskop (simulirani `deviceorientation`) | kalibracija → 0; 1° → 0 (mrtva zona); `gamma +20°` → `uPointer.x = 0.370` = (20−1,5)/25 × 0,5; `gamma +90°` → 0,500 i nikad preko; `beta +20°` → `y = −0.370`, `x = 0` ✅ |
| 10 | `prefers-reduced-motion` | nema canvasa, nema reprodukcije, nema locka, nema žiroskopa; `wheel` odmah skroluje ✅ |
| 11 | dugme za vrh | 48×48, `z-40`, opacity 0 na 2 ekrana − 10 px i 1 na +50 px, `aria-label`, fokus posle dolaska ✅ |
| 12 | regresije (obe teme, 360/390/430/900/1024/1440) | `.pin-spacer` = 0, `[data-reveal-state="pending"]` = 0, elemenata sa `opacity: 0` = 0, `.reveal-word` van `#hero` = 0, `body.style.overflow` prazno, horizontalno prekoračenje 0 ✅ |

`npm run typecheck` ✓ · `npm run lint` (0) ✓ · `npx vitest run` (**224**, +9 novih u
`lib/heroPlayback.test.ts`) ✓ · `npm run build` ✓

### Šta NIJE urađeno

- **Merenje na pravom telefonu.** Svi brojevi su Chrome desktop sa emulacijom i CPU throttle-om;
  GPU je desktopski. Budžet od 26 ms i put pada su tu baš zbog toga, ali pravi telefon treba
  izmeriti pre puštanja u rad.
- **iOS `requestPermission()` na pravom uređaju.** Grana je pisana po Apple specifikaciji i zove
  se iz gesta, ali headless Chromium taj API nema — provereno je samo da se žiroskop kači tek
  POSLE gesta (`window.__bbmHero.tilt`: `none` pre, `gyro` posle).


## Korak 16 — hero shader: ređe polje i dublji mint; CTA ne skaču na izlazu

Fino podešavanje „tečnog laka" (`components/hero/liquidShader.ts`): manja gustina (ređe, krupnije
mrlje, manje uvijanja) i mirnija boja u miru (dublji mint umesto skoro-belog). Usput ispravljen bug:
CTA dugmad su na kraju hero zone „silazila skroz dole".

### Shader — konačni parametri (u okvirima iz specifikacije)

| šta | HEAD | korak 16 |
| --- | --- | --- |
| prostorna frekvencija polja (`p` množilac) | 1.15 | **0.80** (krupnije mrlje) |
| domenski warp — prolaz 2 (`q`) | 1.35 | **0.85** |
| domenski warp — završni (`r`) | 1.25 | **0.80** |
| fBm oktave | 4 | **3** (nema finih nabora, jeftinije) |
| spec pojas `pow(ridge, …)` | 8.0 | **12.0** (uži) |
| spec jačina (miran kadar) | 0.55 | **0.35** (ređe/tiše „prelamanje") |
| pragovi palete mint→mint-soft | `smoothstep(0.35,0.82)` | **`(0.45,0.90)`** |
| papir | `smoothstep(0.92,1.00)` | **`(0.96,1.00)`** |
| dublji mint u niskom polju | — | **`mix(--mint-deep, col, smoothstep(0,0.45,n))`** |
| ivični fade u papir | `edge*0.30` | **`edge*0.22`** |
| završni kontrast | 1.12 | **1.06** |

`--mint-deep` (#2E8E7B iz `app/globals.css`) dodat kao **5. boja** u `uPalette` (kroz `THREE.Color`,
linearni prostor) — nije hardkodovan u GLSL. `uPour` logika, `uPourOrigin`, hvatanje boje, ink
pravilo, kap, bočica i koreografija su **netaknuti**. Globalni `col *= 0.92` nije bio potreban —
merenje je dalo −13,7 % bez njega. Razlivena boja (`uPour → 1`) i njen odsjaj ostaju kao pre.

### Merenje (Playwright, 1440×900, svetla tema, `p = 0`, prosek 3 snimka u razmaku 1 s)

Snimak PRE = HEAD verzija shadera (isti `git`, samo taj fajl vraćen), POSLE = korak 16, na
bounding boxu `#hero canvas`. „Polje" = isti box sa maskiranim tekstom i bočicom (identični u oba,
razlika je pozadina — kako specifikacija i traži).

| metrika | PRE | POSLE | Δ | cilj | prošlo |
| --- | --- | --- | --- | --- | --- |
| srednja luminanca — polje | 0.829 | 0.716 | **−13,7 %** | −10…−15 % | ✅ |
| varijansa Laplasijana — polje (gustina) | 9,79e−4 | 2,30e−4 | **−76,5 %** | ≥ −30 % | ✅ |
| srednja luminanca — ceo box | 0.780 | 0.720 | −7,6 % | (razblaženo tekstom/bočicom) | — |
| varijansa Laplasijana — ceo box | 7,81e−3 | 6,65e−3 | −14,8 % | (isto) | — |
| kontrast h1 (`--hero-ink` na pozadini, tekst sakriven) | — | **14,46 : 1** | — | ≥ 4,5 : 1 | ✅ |
| p95 frame, 3 s skrola kroz zonu | — | **14 ms** (mean 8,2) | — | ≤ 17 ms | ✅ |

Ceo box je razblažen NEPROMENJENIM tekstom i bočicom (tamna kapica, svetla bočica) i njihovim
ivicama — one dominiraju Laplasijanom i identične su u oba snimka, pa je pošteno merilo polje
(pozadina). Screenshotovi na `p = 0.5` (pour 0.26, delimično) i `p = 0.8` (pour 1, boja pokriva
kadar) potvrdili razlivanje kao pre; ink pravilo radi (uhvaćena boja #D9C3AC je svetla → `data-ink`
ostaje `dark`, kako i treba). Tamna tema: hero i dalje svetao, bez sive mrlje vela (korak 14 C).

### CTA bug — uzrok i popravka

**Uzrok:** CTA red i strip su reflow-om podignuti za `−copyShift` (visina wordmarka) preko `y`
transforma. Izlazni pisac (`ctaY`/`stripY`) je od `p ≥ 0.55` pisao **preko** tog istog `y` (dva
quickSetter-a na istom svojstvu), pa je reflow offset nestao i red je skočio ceo `copyShift` naniže
— „sišao skroz dole". (Naslov i lead nisu imali problem: njihov reflow je na kontejneru, a izlaz na
reč-spanovima — različiti čvorovi.)

**Popravka (`components/hero/Hero.tsx`):** CTA i strip izlaze **samo opacity-jem**; `y` drži jedino
reflow petlja (uklonjeni `ctaY`/`stripY`). Dok su vidljivi, pomera ih isključivo stage lag. Kontejner
copy-ja ostaje `display:none` (potrebno da provera iz MOTION.md ostane poštena — nulira `offsetParent`),
ali tek na `p ≥ 0.90` (`COPY_HIDDEN_P`, bilo 0.85); `copyFade` za reduced motion odvojen u
`COPY_FADE_END = 0.85` da se prozor ne razvuče.

**Provera** (bounding rect CTA reda relativno na stage, `p = 0.50…1.00` korak 0.05): `relTop`
konstantan **391.9 px** dok je opacity > 0 (najveći skok između susednih koraka **0 px**, prag 4 px);
opacity 0 od `p = 0.78`; `display:none` tek od `p ≥ 0.90`; reload na `p = 0.90` daje isto stanje
(391.9 / opacity 0). Provera na dnu strane: 0 elemenata sa `opacity:0`, 0 `reveal-state="pending"`,
0 `.reveal-word` van `#hero`.

### Provera (gotovo)

`npm run typecheck` ✓ · `npm run lint` (0) ✓ · `npx vitest run` (215) ✓ · `npm run build` ✓
(prvi pokušaj pao uz native heap-corruption na 62/83 stranica — sudar sa paralelnim `next dev` nad
istim `.next`-om; drugi pokušaj čist).

## Korak 15 — brze akcije u korpu sa kartice

Cena je sada **pilula** ispod svake kartice proizvoda; iz nje se dodaje/skida komad bez odlaska
na stranu proizvoda. Radi svuda gde ide `ProductCard` (zid `/shop`, „slično" na strani proizvoda,
filtrirani rezultati) i na landingu (`ShopHighlights`).

### Šta je dodato

- **`components/shop/CartPill.tsx`** (`"use client"`) — pilula cene sa „−"/„+". STALNO mint
  (`bg-brand`), na stvarni hover potamni (`bg-brand-hover`). CSS grid `0px auto 0px` →
  `var(--cart-btn) auto var(--cart-btn)` (globals.css, `@layer components`) širi je simetrično oko
  centra; tranzicija `grid-template-columns 240ms`. Prošireno = hover ∨ focus-within ∨ qty > 0 ∨
  dodir. „+" odmah `add(slug,1)`; „−" `decrement(slug)`, na 0 uklanja liniju. Centar `1.990 RSD`,
  u korpi `2 × 1.990 RSD` (crossfade brojke 160 ms), popust = precrtana stara cena. Mikro-feedback:
  centar scale-bump 180 ms; na max po liniji „+" `aria-disabled` + shake; jedan globalni
  `aria-live` region objavljuje „{ime}: {qty} u korpi".
- **`ProductCard`** ostaje serverska; cena izvučena iz `<Link>` (dugmad u `<a>` su nevalidna) —
  `<CartPill>` je sibling ispod linka. Prop `quickAdd` (default `true`; `false` = stara statička
  cena, npr. za nekupovne kontekste). Admin `ProductsTab` ima **svoju** lokalnu karticu, pa pilule
  tamo i nema (provera D9 zadovoljena bez izmene admina).
- **`ShopHighlights`** (landing) — svaka kap je sada `<Link>` na proizvod, ispod ime + kompaktna
  pilula (`compact`, 32 px dugmad na desktopu).
- **`lib/cartStore.ts`** — dodat `decrement(slug)` koji čita **živu** korpu (kao `add`), pa
  uzastopni klikovi „−" pre re-rendera ne rade sa ustajalim brojem (nađeno u proveri: `setQty`
  je računao `qty−1` iz zatvarača i gubio dupli klik).
- **`components/site/SiteNavClient.tsx`** — badge korpe „bumpuje" (scale 1.25→1, WAAPI) na svaku
  promenu; ikona se zaljulja (±8°) kad korpa iz 0 pređe u 1. `prefers-reduced-motion` se poštuje.
- **`lib/cart.test.ts`** — dodati testovi: `setQty` preko granice se svodi na `MAX_QTY_PER_LINE`,
  negativno uklanja liniju, uzastopni `addToCart` ne prelazi granicu.

### Odluke i odstupanja (zašto nije bukvalno kao u specu)

- **390 px / dodir (spec D4).** Dve fiksne 44 px kontrole + čitljiva cena **ne stanu** u kolonu
  2-kolonskog zida (~160 px). Odluka po screenshotu: na dodir je pilula puna širina kolone, cena
  (centar `auto`) ima prednost i **nikad se ne seče**, a bočne trake flex-uju (`minmax(0,44px)`) —
  dugmad su **44 px visoka** (tap-visina), a široka koliko preostane (≈30–34 px na najužem telefonu,
  do punih 44 px na tabletu/širim kolonama). Bez horizontalnog prekoračenja (provereno, `docOverflow
  = 0`). Cena je `text-xs` na telefonu, `md:text-sm` naviše, da dugmad dobiju još prostora.
- **Tastatura (spec A/D6).** Spec je tražio `tabindex=-1` na skupljenoj pil: to bi značilo da
  keyboard korisnik **nikad** ne može da doda sa zida (dugmad van tab-reda, a pilula se širi tek na
  fokus). Zato dugmad **ostaju u tab-redu**; fokus na „+" širi pilulu (focus-within) pa Enter dodaje.
  Skupljena traka je 0 px (klip), pa slučajan klik mišem svejedno ne pogađa dugme.
- **`ShopHighlights` imena.** Pošto je kap sada u `<Link>`, ime (unutar `<a>`) više **ne** ulazi
  reč-po-reč — isto kao imena na zidu (koja su oduvek u linku). Reveal ugovor netaknut: pilula je
  `data-reveal="off"`, provera na dnu i dalje vraća prazno.
- **JS budžet (`/shop` +≤ 3 KB).** `CartPill` je jedini novi klijentski kod; sve što uvozi
  (`Minus`/`Plus`, `useCart`, `useSyncExternalStore`, `formatRsd`, `MAX_QTY_PER_LINE`) već je u
  zajedničkom chunk-u (koriste ih nav i `AddToCartForm`), pa je neto dodatak samo logika komponente
  — daleko ispod 3 KB. (Next 16 više ne štampa po-rutne veličine u build tabeli.)

### Provera (Playwright 1440 + Browser pane mobile 375, obe teme)

| # | Provera | Rezultat |
| --- | --- | --- |
| D1 | „+" → `bbm.korpa.v1 {slug,qty:1}`; drugi klik → 2; badge 2 + bump | ✓ |
| D2 | „−" na 0 `aria-disabled`; na 1 → uklanja liniju, pilula se skuplja | ✓ |
| D3 | hover desktop → `grid-template-columns` `36px 93px 36px`, potamni; mouseleave uz qty 0 → skupljanje | ✓ |
| D4 | 390/dodir: uvek prošireno, cena bez sečenja, bez horizontalnog prekoračenja | ✓ (v. odluka) |
| D5 | `/korpa` u drugom tabu → zid se ažurira (`storage` event, već postojao) | ✓ (nepromenjeno) |
| D6 | Tab do „+", Enter dodaje, `aria-live` „Vintage: 1 u korpi", fokus ostaje | ✓ |
| D7 | Rasprodato → neutralna pilula bez „+" | ✓ (grana u kodu; nema stock 0 u devu) |
| D8 | Max po liniji → „+" `aria-disabled` + shake, qty ostaje 20 | ✓ |
| D9 | Admin `ProductsTab` bez pilule | ✓ (druga kartica) |
| D10 | Hidratacija bez skoka (isti SSR oblik, `[data-ready]` gasi prvu tranziciju) | ✓ |
| D11 | Reveal ugovor: 0 nevidljivih, `.reveal-word` van heroja = 0, pilula `data-reveal="off"` | ✓ |
| D12 | `typecheck` + `lint` (0) + `test` (215) + `build` | ✓ |

## Korak 14 — šta je dodato

Arhitektura iz koraka 13 (zona 170 vh + sticky stage, jedan scrub, `p` čista funkcija, boje,
IG nav) **nije dirana**; promenjeno je samo šta se dešava. Tvrda pravila važe: bez pina, bez
Flip-a, bez zaključavanja skrola, `.pin-spacer` 0, reload usred zone = isto stanje.

### A — logo se prepisuje (`lib/logoTravel.ts`, `lib/logoSignature.ts`, `components/hero/Hero.tsx`, `components/brand/Logo.tsx`, `LogoSignature.tsx`, `components/site/SiteNavClient.tsx`)

- **Slovo po slovo.** Svaki od 6 glifova BEAUTY (`data-glyph="b0..b5"`, samo u `animate` /
  `writable` varijantama loga) dobija svoj `transform` atribut iz izmerenih pravougaonika (hero glif
  → nav glif, merenje u `onRefreshInit`, px → SVG jedinice kroz `viewBox`): prozor 0.06 + 0.015·i →
  0.24 + 0.015·i, expo.inOut, kvadratni bezier sa kontrolnom tačkom podignutom 12 % dužine puta,
  overshoot skale 1.04 → 1 u poslednjih 15 %. Nav glif se pali u istom frejmu kad hero glif sleti —
  nav wordmark se sastavlja s leva na desno; fini prolaz 0.05–0.34 (korak 0.005) nema nijedan frejm
  sa istim slovom dvaput vidljivim. Hero SVG je `overflow: visible` (`.hero-wordmark svg`) — bez toga
  glif izvan sopstvenog viewBox-a nestaje (nađeno u proveri).
- **Potpis.** Hero rukopis se briše 0.10–0.20 (glifovi s6 → s0, `stroke-dashoffset 0 → L`, popuna
  nestaje u prvih 30 % glifa); tačka tinte (6 px, `--rose`, `#nav-ink-dot` u nav traci — iznad
  frosta) jaše na frontu brisanja, 0.20–0.24 leti bezier-om na glavu nav „b", 0.24–0.36 jaše na
  frontu pisanja (`getPointAtLength(L − offset)`, 1 poziv po frejmu; CTM oba potpisa izmereni u
  `onRefreshInit`), nestaje na 0.36. Nav wordmark na landingu je `writable` (stroke atributi bez
  `pending` skrivanja). Intro ispis (`LogoSignature`) dobija `introRef.finish()` i prekida se čim `p`
  preuzme putanje — nikad dva pisca.
- **Frost iz slota.** Podloga frosta je `.nav-frost::before` sa `clip-path: var(--frost-clip)`;
  hero piše `inset(0 X% 0 0)` 100 → 0 (0.30–0.42, power2.out). Blur ispod isečenog dela je aktivan.
- **Reflow.** h1, lead, CTA red i strip klize nagore za `copy.top − wordmark.top` (0.12–0.30 h1,
  +0.02 po elementu, power3.inOut); ništa ne bledi do 0.55. Bez puta (mark ispod 400 px) reflow ide
  0.30–0.48, posle zamene.
- **Izlaz reč po reč.** `revealWords` u introu više ne `settle`-uje — `.reveal-word` spanovi ostaju
  i `apply(p)` ih vozi: strip 0.55–0.65, reči lead-a 0.56–0.72, CTA 0.60–0.78, reči h1 0.62–0.80,
  od poslednje ka prvoj (`y +18`, opacity 0, power2.in). Kontejner `hidden` na 0.85 kao pre.
  docs/MOTION.md: hero poseduje izlaz reči; provera na dnu = `.reveal-word` VAN `#hero` = 0.

### B — bočica se otvara i spušta (`scripts/bottle.py`, `lib/bottleDims.ts`, `components/three/{bottleGeometry,bottleGlb,BottleModel,HeroBottle}.tsx`)

- **Model (Blender MCP).** `build()` u `scripts/bottle.py` dodaje `BrushStem` (cilindar r 0,14,
  2,0 → 6,2) i `BrushHair` (zarubljena kupa r 0,25 → 0,09, eliptičan presek 1,35× po x, vrh na 92 %
  dubine tečnosti = y 0,503) kao DECU `Cap`-a; materijal bela baza, roughness 0,25, coat 0,6.
  Modifikatori se primenjuju kroz depsgraph (`apply_modifiers`, bez operatora), export u
  `temp_override` sa pravim prozorom — MCP kontekst nema `active_object`, pa je `convert` ćutke
  preskakao a glTF exporter padao. `gltf-transform inspect`: **72,5 KB**, Glass 29.952 + Liquid
  3.968 + Cap 2.240 + BrushHair 336 + BrushStem 64 = **36.560 trouglova** (≤ 40k), Draco, čvor `Cap`
  ima decu `[BrushHair, BrushStem]`, svi čvorovi bez translacije/rotacije. Provera siluete: Eevee
  render u fajl (zatvoreno + zatvarač podignut 5,8).
- **Mere na jednom mestu:** `lib/bottleDims.ts` (bez three) — `CAP_LIFT_OUT = NECK_TOP + 0,3 −
  BRUSH_TIP_Y = 5,80`, `CAP_PIVOT_Y 7,68`; Blender skripta ponavlja iste formule. `bottleGlb.ts` čita
  četkicu opciono (stari GLB → proceduralna četkica iz `createBrushGeometries`).
- **Zatvarač je grupa sa pivotom u svojoj sredini** (`capRef`), pa se odvrće oko ose bočice
  (720° 0.04–0.22), diže dok dlačice ne izađu iz vrata + 0,3 (telo pada za ½ lifta), odlazi 2 %
  ulevo i naginje se −25° oko SVETSKE z ose o pivotu (kvaternioni: `capLocal = inv(body)·tilt·
  body·spin`), vraća se 0.58–0.64 i zavrće 360° 0.64–0.74. Nivo tečnosti −3 % dok je stem napolju.
  Dlačice i stem su u boji tečnosti (clearcoat 0,5 na dlačicama).
- **Kamera** fov 30 → 34 (0.04–0.22) → 30 (0.42–0.58), `updateProjectionMatrix` samo na promenu.
- **Kap** raste na vrhu dlačica 0.24–0.32 (mesh uvek nacrtan), otkači se sa x/z iz determinističke
  poze (scratch `Object3D` par, ista `applyPose`, bez idle/pointer/hover/wobble), pada t² do NDC −1,15
  do 0.42; `uPourOrigin` = vrh na 0.32 projektovan kamerom kakva je bila na 0.32 (zamrznuta
  `PerspectiveCamera`), pa dolly nazad ne pomera centar razlivanja. Stara kap sa zatvarača uklonjena.
- **Idle:** rim `directionalLight` kruži −60° → +60° oko prednje strane sa intenzitetom `sin(π·s)`
  za fazu ciklusa 0.70 → 1 (crossfade boje je 0.78 → 1), jednom po holdu (izmereno: pali se u fazi
  0.72–0.99, max 1,8); key svetlo prati pointer ±15 %; hover diže zatvarač 0,15 oprugom (2,5 Hz,
  ζ 0,45) — izmereno 0,15 na hoveru, 0 posle. Pointer parallax i hover skala se gase do 0.20.
- **Razlivanje** kao u 13 + `envMapIntensity` 0,6 → 0,9 (0.40–0.50) → 0,6 (0.78) kroz
  `envIntensityRef` na svih pet materijala.
- **Polica:** `bottleScreen(p)` (`lib/heroChoreography.ts`) je jedina istina o mestu bočice na
  ekranu: baza 0.62–0.70 sleće na ivicu `.hero-overlap` (u stage-u `stageH − lag(p)`, na ekranu
  `H·(1 − p)`), skala 1 → 0,55 O BAZI i x 75 % → 70 % do 0.78; od 0.70 baza je tačno ivica i bočica
  odlazi sa sekcijom kroz vrh, bez fade-a. Kontakt senka `#hero-shelf-shadow` (DOM elipsa u
  `.hero-overlap`, opacity 0.70–0.80) — vozi je `HeroBottle` iz istih brojeva.
- Izlazni `alphaHash`/opacity fade je uklonjen; materijali tečnosti i zatvarača su neprovidni.

### C — veo u tamnoj temi (`components/hero/Hero.tsx`, `app/globals.css`)

Uzrok: između `HeroFallback` (svetao) i prvog frejma lenjog `LiquidCanvas` omotač nije imao
podlogu, pa se videla tamna `--bg` strane, a papirni veo preko nje bio je siva mrlja. Sada je
`HeroFallback` UVEK ispod canvasa — podloga heroja je svetla u sve tri grane i obe teme (screenshoti
1440 / 900 / 390 u tamnoj temi). Usput: u tamnoj temi je nav preko svetlog heroja (bez frosta) imao
svetla slova na svetlom laku — `:root[data-theme="dark"] .nav-bar:not(.nav-frost)` sada daje
`--fg: var(--ink)` (izmereno `rgb(18,16,15)` na sva tri ekrana), a kad frost stigne vraća se tema.

### Odluke koje odstupaju od slova speca

| # | Odluka | Zašto |
| --- | --- | --- |
| 1 | kamera **dolly-OUT** fov 30 → 34 (0.04–0.22) i nazad 34 → 30 (0.42–0.58), ne 30 → 27; telo pada za ½ lifta | vrh dlačica na 92 % dubine (y 0,50) → lift 5,80; bočica 9,48 + 5,80 = 15,3 jed. ne staje u 15 jed. kadra na fov 30, a na fov 27 (13,5) zatvarač izlazi iz kadra; na 34 sa spuštenim telom ostaje ~1 jed. margine gore i dole (mereno na 0.22) |
| 2 | potpis se briše 0.10–**0.20** (ne 0.26); tačka jaše na frontu brisanja od 0.10, leti 0.20–0.24, piše 0.24–0.36 | jedna olovka — spec je imao brisanje do 0.26 i pisanje od 0.24 istovremeno; tačka koja „pokupi" tintu objašnjava zašto potpis nestaje. D.2 i dalje važi (0.18: 80 % izbrisano, nav 0; 0.30: 50 % napisano) |
| 3 | reflow copy-ja 0.**12**–0.30 (h1), +0.02 po elementu, ne 0.06–0.30 | sa 0.06 h1 na 0.18–0.22 ulazi u prostor gde „U T Y" još stoje (expo.inOut prvih 40 % skoro miruje); sa 0.12 margina ≥ 20 px; h1 završava tačno na 0.30, pa D.4 ostaje tačan |
| 4 | izlaz: strip 0.55–0.65 → reči lead-a 0.56–0.72 → CTA 0.60–0.78 (spec) → reči h1 0.62–0.80 | obrnut redosled čitanja; reči idu od poslednje ka prvoj |
| 5 | CTM oba potpisa meri se u `onRefreshInit`, ne po frejmu | stage miruje dok se briše (0.20 < HOLD_END 0.23 i na 130 vh), traka nije sakrivena dok je hero u kadru — 0 CTM poziva po frejmu, `getPointAtLength` 1 |
| 6 | frost clip na `.nav-frost::before`, ne na `.nav-bar` | clip na traci bi sekao i linkove desno; pseudo-element nosi samo podlogu, hairline i blur |
| 7 | kontakt senka je DOM elipsa u `.hero-overlap`, vozi je `HeroBottle` | canvas je u stage-u ISPOD omotača — ravan u sceni bi bila pokrivena, a uz kameru u nivou horizontalna ravan je linija; u `HeroBottle`-u (lenji chunk) da matematika bočice ne uđe u početni JS |
| 8 | baza prati ivicu od kontakta: 0.62–0.70 blend rest → ivica, od 0.70 tačno ivica | ivica u stage-u je `stageH − lag(p)` i bazu (81 % vh) dostiže tek na p ≈ 0.70; „spuštanje" 0.62–0.70 je sletanje na ploču koja se diže; D.7 je egzaktan (≤ 1 px) |
| 9 | bočica čita **sirov** `p`, bez lerp-a 0.12 | polica mora da prati DOM ivicu frejm za frejmom; shader zadržava svoj lerp |
| 10 | pointer parallax i hover skala gase se 0.04–0.20; njihanje ±2° samo dok je zatvarač NAD vratom | ishodište razlivanja i tačka otkačenja moraju biti deterministički (reload = isto); sa njihanjem je kap na 0.32 skakala 11 px u stranu (izmereno) |
| 11 | zatvarač ide **2 %** kadra ulevo (spec 12 %) + nagib −25° o pivotu | nagib sam nosi vrh dlačica ~11 % kadra ulevo; sa 12 % + nagib stem i vrh su prelazili preko lead pasusa (mereno 1440: vrh 693 px, tekst do 816). Sada vrh 840 px, 24 px desno od teksta, i dalje „ka copy koloni" |
| 12 | izlazni fade uklonjen za obe varijante (GLB i proceduralna) | proceduralna bočica dobija istu četkicu, pa ista koreografija radi bez GLB-a; neprovidni materijali = jeftiniji transmission prolaz |
| 13 | `.reveal-word` spanovi u heroju ostaju (`settle: false`) | izlaz reč po reč traži spanove; provera iz MOTION.md: `.reveal-word` van `#hero` = 0 |
| 14 | tamna tema: `--fg` na `.nav-bar:not(.nav-frost)` = `--ink` | traka je providna preko svetlog heroja; svetla slova tamne teme na svetlom laku nisu bila čitljiva (pre koraka 14 takođe) |
| 15 | atributi loga kroz uslovni spread, `data-glyph` samo u `animate`/`writable` | satori (icon/OG rute) na `prop={undefined}` pada BEZ odgovora (`ERR_EMPTY_RESPONSE`, reprodukovano A/B sa `git stash`); posle popravke `/icon` 200 (117 B), `/opengraph-image` 200 (35 KB) |
| 16 | početni JS `/` +3,2 KB umesto ≤ +3 KB — **isporučeno sa prekoračenjem od 0,2 KB** | jedina preostala ušteda bi bila lenjo učitavanje matematike slova/potpisa (~1 KB), a ona mora da bude tu već u `onRefresh` (reload na p 0.5 bi jedan frejm pokazao hero bez slova u nav-u — krši „reload = isto stanje"). Ako je granica tvrda, kandidat za sečenje je tačka tinte + let (`lib/logoSignature.ts` dot/fly, ~0,3 KB) — odluka za jutro |

### Provera D (Playwright, pravi točkić, dev server http://localhost:3001 paralelne sesije — nije gašen)

| # | Provera | 1440×900 | 390×844 (+ 900×700) |
| --- | --- | --- | --- |
| 1 | slova | 0.12 sva u miru (t ≤ 0.34); 0.20 B/E/A uz slot, U/T/Y u luku; 0.28 BEA sletela (hero 0 / nav 1), U/T/Y t 0.97/0.89/0.80; 0.32 svih 6; fini prolaz 0.05–0.34 korak 0.005: **0** frejmova sa istim slovom dvaput, sletanje s leva | 390: bez puta, zamena 0.29 → 0.31 (wm `hidden`, mark 1); 900: 0 prekršaja, na 0.33 svih 6 sletelo |
| 2 | potpis + tačka | 0.18 hero 80 % izbrisan / nav 0; 0.30 nav 50 % napisan; tačka vidljiva 0.12–0.34, razdaljina do DOM fronta pisanja **0,03 px** (0.26 / 0.28 / 0.30 / 0.34); 0.36 tačka `hidden` | 390: mark, nema potpisa; 900: nav potpis 75 % na 0.33 |
| 3 | frost | `::before` clip `inset(0 99.8% 0 0)` na 0.30, `24.8 %` na 0.36, `0 %` na 0.42; `backdrop-filter: blur(14px) saturate(1.4)` | 390/900: isto pravilo, 900 na 0.33 `55.7 %` |
| 4 | reflow | h1 top 434,4 (p 0) → **209,3 = wordmark top** (p 0.30); pomeraj 225,1 = 185,1 + 40 | 390: 237,3 → −38,0 = wordmark top na 0.48 |
| 5 | otvaranje | 0.22: spin **720,0°**, lift 5,80, vrh dlačica y −1,31 > vrat −1,61 (+0,30); 0.74: spin 360, lift 0 | — |
| 6 | kap | 0.30 kap na vrhu dlačica (screenshot), vrh na x 840 px, lead pasus do 816; `uPourOrigin.x` 0,595 stalan od 0.32 | 390: DOM kap pada 0.32–0.42 (220 → 377 → 728 px, `hidden` na 0.42), prosipanje 0.06 @0.42, 0.61 @0.60, 1 @0.78 |
| 7 | polica | baza (stage px) + stageTop vs ivica `.hero-overlap`: 0.70 458,9 / 458,8; 0.85 229,4 / 229,2; 0.95 76,2 / 75,6 → **≤ 1 px** | — |
| 8 | reload 0.5 i 0.8 | 17 polja identična pre/posle (slova, potpis, captured, spin, lift, baza, fov, frost, h1 top, pour, origin, ink, reč) | — |
| 9 | struktura | `.pin-spacer` 0; `body.overflow` ''; bez `lenis-stopped`; dno posle 4,5 s: pending 0, `data-reveal-motion=pending` 0, `.reveal-word` van heroja 0 (u heroju 25), sakriven tekst 0; IG nav: gore → vidljiva, 2×200 px dole → sakrivena, 60 px gore → vidljiva | 390: `scrollWidth − clientWidth` = 0 |
| 10 | tamna tema | screenshot: podloga svetla, bez mrlje, nav linkovi `rgb(18,16,15)` | 900 (shader bez bočice) i 390 (CSS): isto |
| 11 | perf, 146 Hz, `bringToFront`, `visibilityState` visible; točkić kroz zonu (30 × 55 px / 100 ms) | prolaz 1: 501 frejmova / 4,66 s, medijana 7 ms, **p95 14 ms**, najduži 21 ms, 0 > 33; prolaz 2: 619 / 4,34 s, medijana 6,9, **p95 7,1 ms**, najduži 41,8 (1 > 33 — isto kao GLB prolaz u 13) | — |
| 12 | interakcija | hover: zatvarač 0,15 → 0 (opruga), kursor pointer; rim sweep u fazi 0.72–0.99 svakog perioda, max 1,8; `/shop`: 1 canvas, bočica sa cap grupom, frost, nav potpis pun | — |

Konzola: 0 grešaka; upozorenja `THREE.Clock` (R3F, od ranije) i jedno D3D `X4122` (konstantno
sklapanje u shaderu tečnosti, bezopasno).

```
npm run typecheck   ✓
npm run lint        ✓  (nula upozorenja)
npm test            ✓  212 testova, 14 fajlova (+21: v3 segmenti, slova, potpis, polica, reflow, izlaz reči)
npm run build       ✓  83 strane, icon / apple-icon / opengraph-image generisani
```

Bundle (`scripts/measure-bundle.mjs` + gzip lenjih chunkova; „pre" je HEAD koraka 13 izgrađen
istim alatom u istoj sesiji — 326,8 KB, tačno kao u tabeli koraka 13):

| Šta | Pre (korak 13) | Posle | Razlika |
| --- | --- | --- | --- |
| `/` početni JS | 326,8 KB | 330,0 KB | **+3,2 KB** (granica +3 KB — 0,2 KB preko, vidi odluku 16) |
| `/shop` početni JS | 300,0 KB | 300,1 KB | +0,1 KB |
| lenji three chunk (three + hero shader + bočica + četkica + GLB čitač) | 236,5 KB | 236,9 KB | +0,4 KB |
| lenji hero chunk | 5,4 KB | 6,9 KB | +1,5 KB (ukupno lenjo 243,7 KB = **+1,9 KB**, granica +10 KB) |
| `public/models/bocica.glb` | 69,6 KB, 36.160 △ | 72,5 KB, 36.560 △ | +2,9 KB, +400 △ (granica 500 KB / 40k) |

Šta je probano za tih 0,2 KB: senka police preseljena u lenji chunk (−0,2 KB), matematika bočice
izdvojena u `lib/bottleScreen.ts` da mere ne uđu u početni JS (−0,4 KB), neiskorišćeni exporti
(Turbopack ih ionako baca — 0), dev snimak iza runtime guard-a (+0,1 KB, vraćeno na
`process.env.NODE_ENV`). Ostatak su slova, potpis, tačka, reflow i izlaz reči — sve mora u početni
JS jer `apply(p)` radi već iz `onRefresh` (reload usred zone), pre nego što bilo koji lenji chunk stigne.

### Šta čeka / napomene

| Šta | Zašto |
| --- | --- |
| **[POTVRDITI]** pet boja ciklusa, 3D na telefonu, telefon Mimoze — iz koraka 13 | nepromenjeno |
| Frost se širi tvrdom ivicom (`clip-path: inset`) | spec traži inset; meka ivica bi tražila `mask-image` preko `backdrop-filter`-a — jedan CSS red ako zatreba |
| Zatvarač u fazi 0.22–0.58 ulazi pod nav traku (vrh na ~20 px) | od 0.30 je pod frostom (blur) — namerno ostavljeno; ako smeta, `CAP_AWAY_Y_RATIO` u minus ili fov 35 |
| Kap na 390 pada 0.32–0.42 (bilo 0.30–0.40) | isti `fall` kao 3D kap; prosipanje i dalje od 0.36 |
| `docs/MOTION.md` → „Hero v3" | prepisano; provera na dnu sada dozvoljava `.reveal-word` unutar `#hero` |

---

Stanje posle koraka **13 — hero zona sa zadržavanjem, boje laka, kap i razlivanje, navigacija
uvek ispred + Instagram nav** (ispod: korak 12, pa 11, pa zatečeno stanje posle koraka 08).

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

Korak 19 preskocen: spec nije stigao (`.nightrun/specs/19-uiux.md` ne postoji, provereno 2026-09-07).
