# Motion — ugovor o dva sistema

> Sajt ima **dva odvojena sistema animacije**. Ako ih pomešaš, dva koda se biju oko
> istog `opacity` i copy ostane nevidljiv. Ovo je najvažnije pravilo u projektu.

## Sistem 1 — TEKST (site-wide, automatski)

Svaki naslov, pasus, stavka liste i samostalna oznaka stiže **reč po reč, nasumičnim
redosledom, iz blura i odozdo**, kad pređe 15% u vidno polje.

- Portuje se iz `_ref/colorcutchris`: `lib/textReveal.ts` + `constants/textRevealConfig.ts`
  + `components/providers/TextRevealGlobal.tsx`
- Pokriva automatski: `h1`–`h6`, `p`, `li`, `dt`, `dd`, `blockquote`, `figcaption`,
  i `span` koji nije unutar copy elementa / linka / dugmeta / labele
- **Ne piše se ništa po komponenti.** Napišeš semantički markup — pokriveno je.
- Tekst bez taga (broj u golom `<div>`) nije pokriven → daj mu pravi tag,
  ili `data-reveal="text"`. Prvo bolje.
- Preko 60 reči → element se pojavljuje kao blok, ne po rečima
- Reč-spanovi u `flex`/`grid` kontejneru dobijaju `gap` između reči → takav element
  se takođe pojavljuje kao blok. Ako ti treba reveal po rečima, omotaj tekst u `<p>`.

**Zabranjeno:** SplitText, ručni splitter, `gsap.from` na naslovu, `stagger` na pasusu,
`opacity: 0` u CSS-u na tekstu. Sve to već postoji, jednom, za ceo sajt.

**Opt-out `data-reveal="off"`** — samo za: navigaciju, forme, dijaloge, live regione,
ceo `/admin`, i copy čiji `opacity` već drži druga animacija (hero). Ako opt-out-uješ
hero copy, i dalje **duguješ reč-po-reč ulazak** — koristi `splitWords` / `restoreWords`
iz `lib/textReveal.ts`, nikad lokalni splitter.

## Sistem 2 — SVE OSTALO (GSAP ScrollTrigger)

Kartice, slike, swatch-evi, ikone, razdvajači, brojevi, medijski blokovi, cele sekcije.

Jedna komponenta: **`components/motion/Reveal.tsx`** (`useGSAP` + ScrollTrigger).

```tsx
<Reveal>                          {/* jedan element, fade-up 600ms */}
<Reveal stagger>                  {/* deca ulaze redom, 70ms razmaka */}
<Reveal variant="clip">           {/* fotografije: clip-path odozdo + scale 1.06→1 */}
<Reveal variant="count">          {/* brojevi broje od 0 */}
<Reveal delay={0.1}>
```

- Trigger: `start: "top 85%"`, `once: true` — **odigra se jednom i ostaje**
- `scrub` se koristi **samo** za hero i parallax, nikad za ulaze sekcija
- Animiraju se isključivo `transform` i `opacity` (`will-change` se skida posle)
- `gsap.matchMedia()` za responsive i za `prefers-reduced-motion`
- Sve se registruje kroz `useGSAP` sa `scope` — bez ručnog `revert()`

## Pravilo koje spaja oba

> **Ako element sadrži tekst, GSAP animira KONTEJNER (transform), a text-reveal
> animira reči unutra. Nikada oba na istom čvoru.**

```tsx
<Reveal>                       {/* GSAP pomera i pojavljuje karticu */}
  <article className="card">
    <h3>Manikir</h3>           {/* text-reveal razlaže na reči */}
    <p>Klasičan manikir…</p>   {/* text-reveal */}
  </article>
</Reveal>
```

Kartica ulazi kao celina, a unutar nje reči stižu redom. To je „gradualno, redom, a ne
sve odjednom" — na dva nivoa istovremeno.

## Redosled na jednom ekranu

Sve ulazi **redosledom čitanja**, nikad odjednom:

1. Nadnaslov (overline) — 0 ms
2. Naslov — 80 ms, reč po reč
3. Podnaslov / pasus — 160 ms, reč po reč
4. Mreža kartica — 240 ms pa `stagger` 70 ms po kartici
5. CTA — poslednji, 400 ms

Ukupno nikad duže od ~1,2 s od trenutka kad sekcija uđe u kadar. Duže od toga i deluje
kao da sajt ne radi.

## Hero v3 — zona sa zadržavanjem, logo koji se prepisuje, bočica koja se otvara (korak 14)

Hero je **zona od 170 vh** (mobilni 130 vh, uz `prefers-reduced-motion` 100 vh) sa
`position: sticky` stage-om od 100 vh unutra. **Bez pina, bez Flip-a, bez zaključavanja
skrola** — pin je dvaput rušio sajt (`.pin-spacer` pomera sve trigere ispod) i ne vraća se;
jedini lock na sajtu je otvoren mobilni meni. „Zadržavanje" je čist CSS: do
`HOLD_END = (H − vh) / H` (170 vh → 0.41, 130 vh → 0.23) sekcija skroluje, a stage stoji
na vrhu kadra. Posle toga ga sekcija gura naviše, a stage zaostaje do 40 % svoje visine
(transform) ispod `.hero-overlap` omotača sledećih sekcija (neprovidan, zaobljen vrh, senka).

```
<section id="hero" data-reveal="off" class="relative isolate h-[170vh] max-md:h-[130vh]">
  <div class="hero-stage sticky top-0 h-[100vh] overflow-hidden">podloga · canvas · scrim · wordmark · copy</div>
</section>
<div class="hero-overlap">#hero-shelf-shadow · sekcije…</div>
```

**Jedan ScrollTrigger** (`top top → bottom top`, `scrub`) daje napredak `p`, a sve je
**čista funkcija tog broja** (`lib/heroChoreography.ts`, `lib/logoTravel.ts`,
`lib/logoSignature.ts` — testirano): reload usred heroja daje isto stanje kao skrol do te tačke.
Merenje (rect svakog glifa, CTM oba potpisa, pomeraj copy-ja, HOLD_END) ide u `onRefreshInit`;
`apply(p)` se zove i iz `onRefresh` (na p = 0 `onUpdate` ne okida). Bočica čita **sirov** `p`
(bez lerp-a) — polica mora da prati DOM ivicu frejm za frejmom. `bottleScreen(p)`
(`lib/bottleScreen.ts`, samo three strana i testovi — mere bočice ne ulaze u početni JS) je jedina
istina o mestu bočice na ekranu: iz nje bočica vozi i svoj položaj i DOM kontakt senku.

| faza | p | šta |
| --- | --- | --- |
| hvatanje boje | > 0.01 | ciklus boja staje, uhvaćena boja ide u razlivanje (`lib/heroColors.ts`) |
| idle gašenje | 0.00–0.10 | lebdenje, yaw ±7°, rim sweep; pointer parallax i hover skala do 0.20 |
| kamera | 0.04–0.22 / 0.42–0.58 | fov 30 → 34 (dolly-out, izvučena četkica mora da stane u kadar) / nazad 30 |
| yaw | 0.04–0.22 | telo u 3/4 pogled (−25° oko Y), ostaje uspravno; njihanje ±2° dok je četkica nad vratom |
| otvaranje | 0.04–0.22 | zatvarač 720° oko ose + lift dok dlačice ne izađu iz vrata + 0.3 (iz `lib/bottleDims.ts`); telo −½ lifta; nivo −3 % |
| slova BEAUTY | 0.06+0.015·i → 0.24+0.015·i | hero glif i → nav glif i, sopstveni `transform` (bezier, kontrolna tačka −12 %), overshoot 1.04 → 1, zamena u frejmu sletanja; nav se sastavlja s leva |
| potpis | 0.10–0.20 / 0.20–0.24 / 0.24–0.36 | hero rukopis se briše (`dashoffset 0 → L`, s6 → s0) / tačka tinte leti / nav rukopis se piše (s0 → s6, popuna u poslednjih 30 %) |
| reflow | 0.12–0.30 (+0.02 po elementu) | h1, lead, CTA, strip klize nagore za `copy.top − wordmark.top`; ništa ne bledi do 0.55 |
| cap odlazi | 0.22–0.30 | zatvarač + četkica: nagib −25° oko svetske z o pivotu, 2 % ulevo — vrh dlačica ~11 % kadra ka copy-ju, ne preko njega |
| kap | 0.24–0.32 / 0.32–0.42 | raste na vrhu dlačica / pada (t²) do NDC −1.15; `uPourOrigin` = vrh na 0.32 iz determinističke poze, projekcija kamerom sa 0.32 |
| frost | 0.30–0.42 | `.nav-frost::before` `clip-path: inset(0 X% 0 0)` 100 → 0 iz logo slota (`--frost-clip` na `.nav-bar`) |
| razlivanje | 0.36–0.78 | shader radijalno razliva uhvaćenu boju (75 % boja + 25 % mint); `envMapIntensity` 0.6 → 0.9 (0.50) → 0.6 |
| ink | front preko copy-ja | `--hero-ink` po kontrastu (taman ili papir), scrim menja veo |
| copy izlazi | 0.55–0.80 | strip 0.55–0.65, reči lead-a 0.56–0.72, CTA 0.60–0.78, reči h1 0.62–0.80; reči od POSLEDNJE ka prvoj (`y +18`, opacity 0); CTA/strip su blokovi — izlaze SAMO opacity-jem, `y` drži reflow (−copyShift) pa ih dok su vidljivi pomera samo stage lag; klik gasi 0.55, `hidden` (display:none) 0.90 |
| cap se vraća | 0.58–0.64 / 0.64–0.74 | nad vrat / spušta se i zavrće 360° |
| polica | 0.62–0.70 / 0.62–0.78 | baza sleće na ivicu `.hero-overlap` (`stageH − lag(p)` u stage-u) / scale 1 → 0.55 o bazi, x 75 % → 70 %; od 0.70 stoji na ivici i odlazi s njom, bez fade-a |
| kontakt senka | 0.70–0.80 | `#hero-shelf-shadow` (DOM elipsa na omotaču) opacity 0 → 1, x i širina prate bočicu |
| lag | HOLD_END–1 | stage `y` 0 → +40 % visine |

**Hero poseduje i izlaz reči.** Tekstualni čvorovi copy-ja ulaze kroz `revealWords`
(`settle: false` — `.reveal-word` spanovi OSTAJU), a izlaze reč po reč iz `p` (opacity +
transform na spanovima, nikad blur po frejmu). Zato je `.reveal-word` u `#hero` dozvoljen posle
završetka; van heroja i dalje mora da bude 0. Intro (reči, CTA, strip, ispis potpisa) se
prekida (`progress(1)` / `introRef.finish()`) čim `p` preuzme iste čvorove — nikad dva pisca.
Na p ≥ 0.90 kontejner je `display: none` — tada je iznad kadra, a provera na dnu ostaje poštena
(`display:none` nulira `offsetParent`, pa reči s opacity 0 ne uđu u proveru; `visibility:hidden` bi ih ostavio u njoj).

Bočica je GLB iz Blendera (`public/models/bocica.glb`, kroz Blender MCP, zapis u
`scripts/bottle.py`: `Glass`, `Liquid`, `Cap` + `BrushStem` i `BrushHair` kao deca zatvarača),
čitan malim GLB + Draco čitačem (`components/three/bottleGlb.ts`); dok stiže ili ako padne, ista
proceduralna bočica sa četkicom iz `bottleGeometry.ts` (mere u `lib/bottleDims.ts`). Zatvarač je
grupa sa pivotom u svojoj sredini (`capRef`); nivo tečnosti je svetska clipping ravan.

Ispod 1024 px nema bočice (WebGL ≤ 768 px nikad, ADR-005): velika swatch kap ciklira iste
boje, pada 0.32–0.42 i „prosipa" se kao CSS krug (`transform: scale`); slova, potpis, frost i
reflow rade od 400 px. Ispod 400 px logo se ne vozi: zamena na 0.30, reflow 0.30–0.48; uz
`prefers-reduced-motion` zona je 100 vh, bez holda, zamena na 0.50, copy bledi kao kontejner
0.55–0.85, statična boja, bez razlivanja. Podloga heroja je uvek svetla (`HeroFallback` ispod
canvasa) — i u tamnoj temi, i dok lenji chunk stiže; nav bez frosta u tamnoj temi ide u ink.

**Zabranjeno u heroju:** `pin`, Flip, `lenis.stop()` / `overflow: hidden` van menija,
`preventDefault` na wheel/touch, `scrollTo` koji korisnik nije tražio, timeout koji „pušta"
skrol, drugi ScrollTrigger na sekciji, opacity na tekstualnim čvorovima copy-ja iz bilo čega
osim `apply(p)` i reveal sistema, lokalni splitter reči.

## Z-skala

Jedna skala, sve što nije u tabeli je ≤ 40:

| sloj | z-index |
| --- | --- |
| sadržaj (sticky trake, lepljivi tabovi, kartice) | ≤ 40 |
| navigacija `<nav>` | `z-[100]` |
| dijalozi (`Sheet`, lightbox galerije) | `z-[110]` |
| toast | `z-[120]` |
| skip-link | `z-[130]` |

- `<nav>` je `position: fixed` i direktan potomak `<body>`; **nijedan predak** ne sme da ima
  `transform`, `filter`, `backdrop-filter`, `contain` ili `will-change` (to pravi containing
  block i lomi fixed). Ni sam `<nav>` nema transform — sakrivanje i frost nosi unutrašnja
  `.nav-bar` traka, jer je panel mobilnog menija `fixed` unutar `<nav>`-a.
- Dijalozi se **portaluju u `document.body`**: `z-[110]` važi samo u korenskom stacking
  context-u. Omotači sadržaja (`.hero-overlap`, sekcije) zato **ne prave stacking context**
  (bez z-index-a, `isolate`, transforma) — inline dijalog u njima bi završio ispod nav-a.

## Navigacija (Instagram nav)

- **Sakrij** kad: smer dole ∧ akumulirano ≥ 24 px od poslednjeg prikaza ∧ scrollY > 120 ∧
  hero van kadra (`p ≥ 1`, `lib/heroProgress.ts`) ∧ meni zatvoren ∧ fokus nije u nav-u.
- **Prikaži** kad: smer gore ≥ 4 px ∨ scrollY ≤ 8 ∨ meni se otvara ∨ `focusin` u nav ∨ `p < 1`.
  Skok > 200 px u jednom update-u (reload, deep link, `scrollIntoView`) ne računa se kao skrol.
- Samo `transform` na `.nav-bar` (`data-hidden`): 320 ms sakrivanje, 240 ms prikaz,
  `cubic-bezier(.22,1,.36,1)`; uz `prefers-reduced-motion` bez tranzicije.
- Glass `.nav-frost` (72 % podloge, `blur(14px) saturate(1.4)`, linija ispod): na landingu od
  `p ≥ 0.30`, na ostalim stranama uvek (`alwaysSolid`); senka tek kad hero izađe. Klase žive u
  `@layer components` — Tailwind v4 `@utility` ispušta `backdrop-filter`.
- `--nav-h` (64 / 80 px) je jedini izvor visine trake; `:is(section, footer)[id]` ima
  `scroll-margin-top: calc(var(--nav-h) + 8px)`, pa sidra i deep link sleću ispod trake.

## Provera pre nego što kažeš „gotovo"

Skroluj stranicu s kraja na kraj, pa u konzoli:

```js
[...document.querySelectorAll('*')].filter(e => e.offsetParent && e.textContent.trim() && getComputedStyle(e).opacity === '0')
```

Mora da vrati **prazan niz**. Takođe: `[data-reveal-state="pending"]` prazan na dnu
stranice, i `.reveal-word` **van `#hero`** = 0 posle završetka
(`document.querySelectorAll('.reveal-word').length === document.querySelectorAll('#hero .reveal-word').length`);
hero svoje spanove zadržava jer iz njih vozi izlaz reči.
