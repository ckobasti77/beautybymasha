# STATUS

Stanje posle koraka **07 — SEO, demo podaci, pristupačnost, performanse, priprema za deploy**.
Ovo je lista za jutro: šta radi, šta ne radi, i svaki `[POTVRDITI]` sa putanjom fajla.

## Provera koja prolazi

```
npx convex dev --once   ✓
npm run typecheck       ✓
npm run lint            ✓  (nula upozorenja)
npm test                ✓  125 testova, 7 fajlova  (+9 novih za JSON-LD)
npm run build           ✓  83 strane; /admin dinamičan (ƒ), sitemap.xml i robots.txt statični
```

Provera otkrivanja teksta iz `docs/MOTION.md` vraća **prazan niz** — na `/` i `/shop`,
na 1440 px i na 390 px. `[data-reveal-state="pending"]` je 0, `.reveal-word` je 0,
horizontalnog prekoračenja nema (0 px). Shader se na 1440 px pojavljuje (1 `<canvas>`),
na 390 px ga nema (0) — kako i treba.

**Napomena o `npm run build` (i dalje važi):** na Windows-u ume da padne sa
`build worker exited with code: 3221226356`. To je pad radnog procesa, ne greška u kodu —
desilo se i večeras, jednom, na istom kodu koji je odmah zatim prošao.
`rm -rf .next && npm run build` prolazi.

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
