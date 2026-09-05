# STATUS

Stanje posle koraka **11 — cenovnik kao ulaz u zakazivanje + swatch kao kap laka**
(ispod je i zatečeno stanje posle koraka 08).
Ovo je lista za jutro: šta radi, šta ne radi, i svaki `[POTVRDITI]` sa putanjom fajla.

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
