# STATUS

Stanje posle koraka **05 — shop, korpa, plaćanje i nalog**.
Ovaj fajl je za sledeći korak: šta radi, šta još nije podešeno, šta treba pitati vlasnicu.

## Provera koja prolazi

```
npx convex dev --once   ✓
npm run typecheck       ✓
npm run lint            ✓  (nula upozorenja)
npm test                ✓  98 testova, 5 fajlova
npm run build           ✓  80 strana, od toga 70 na /shop/[slug]
```

Provera reveal-a iz `docs/MOTION.md` vraća **prazan niz** na `/`, `/shop`, strani
proizvoda, `/korpa` i `/nalog`, posle skrola s kraja na kraj, na 390 px i na 1440 px.
`[data-reveal-state="pending"]` je prazan, `.reveal-word` je 0, horizontalnog skrola
nema (0 px).

Produkcija https://beautybymasha-mu.vercel.app je bila HTTP 200 na početku koraka.
Korak 04 nije ostavio ništa slomljeno — `typecheck` i `lint` su prošli pre ijedne izmene.

**Napomena o `npm run build` (i dalje važi):** na Windows-u ume da padne sa
`build worker exited with code: 3221226356`. To je pad radnog procesa, ne greška u kodu.
`rm -rf .next && npm run build` prolazi.

## Šta korak 05 dodaje

| Fajl | Šta radi |
| --- | --- |
| `app/shop/page.tsx` | Zid swatch-eva; svih 70 kartica je u serverskom HTML-u. `ItemList` i `BreadcrumbList` JSON-LD. |
| `app/shop/[slug]/page.tsx` | 70 statički generisanih strana, `generateMetadata`, `Product` + `Offer` JSON-LD, srodni proizvodi. |
| `app/korpa`, `app/placanje`, `app/porudzbina` | Korpa, naplata, i praćenje porudžbine brojem i telefonom. |
| `app/nalog/page.tsx` | Registracija, prijava, članska kartica sa QR kodom, istorija termina i porudžbina. |
| `components/shop/*` | `ProductSwatch` (gloss sweep + crossfade), `ProductCard`, `ShopWall`, `ShopFiltersBar`, `AddToCartForm`. |
| `components/cart/*` | `CartView`, `CartTotals`, `CheckoutView`, `OrderReceipt`, `OrderTracker`. |
| `components/nalog/*` | `AccountView`, `AuthPanel`, `MemberCard`. |
| `components/ui/QrCode.tsx` | Crtanje QR koda na klijentu (`qrcode`, dinamički uvoz). |
| `lib/cart.ts`, `lib/cartStore.ts` | Korpa: čista aritmetika, pa spoljni store nad `localStorage`. |
| `lib/shopFilters.ts` | Filteri i njihov zapis u URL-u. |
| `lib/jsonLd.ts`, `components/site/JsonLd.tsx` | Struktuirani podaci za katalog. |
| `convex/orders.ts` → `quote` | Serverski zbir korpe: cene, popust, poštarina, loyalty. |
| `convex/bookings.ts` → `mine` | „Moji termini". `create` sada upisuje `customerId` za prijavljene. |
| `convex/notify.ts` → `newOrder` | Mejl vlasnici o novoj porudžbini, isti ugovor kao za termine. |

### Tri stvari koje su bile izričit zahtev

1. **Dva brenda, jedno pravilo za slike.** ORLY (50) ima fotografiju: hover pusti gloss
   sweep preko kruga boje (600 ms), pa se posle njega slika crossfade-uje preko boje
   (zadrška 300 ms, trajanje 300 ms). Entity (20, `swatchOnly`) nema fotografiju, pa
   tamo ostaje samo boja i sweep. Provereno u browseru: na `?brend=entity` kartice
   sadrže **nula** `<img>` elemenata. Hover je iza `@custom-variant can-hover`
   (`(hover: hover) and (pointer: fine)`), pa na telefonu slika ne ostaje zalepljena
   posle tapa; tamo se swatch samo blago uveća.
2. **Cenu računa server, uvek.** Korpa u `localStorage` nosi isključivo `{ slug, qty }` —
   `lib/cart.ts` odbacuje sve ostalo, uključujući cenu koju bi neko ručno dopisao.
   Zbir dolazi iz `orders.quote`, a `orders.create` ga pre upisa ponovi iz baze.
   Loyalty popust je **zaseban red** u zbiru, ne niža cena stavke; to drži test
   „članu je popust ZASEBAN red" u `convex/shop.test.ts`.
3. **Članska kartica na telefonu.** QR sadrži samo `loyaltyNumber` (`loyalty.myCard` →
   `qrValue`), ništa lično. Broj je ispisan i slovima ispod koda, za slučaj da kamera
   ne uhvati. Provereno na 390 px, bez horizontalnog prekoračenja.

### Zamke koje su se pojavile i rešene su

1. **Hidratacija je pucala na `/shop`.** `ShopWall` je iza `Suspense`, pa se hidratira
   kasnije nego što `TextRevealGlobal` prođe kroz DOM. Global je stigao da obeleži
   `<li>` kartice sa `data-reveal-state="pending"`, a React ih posle nije prepoznao.
   Rešeno sa `revealOff` na mreži kartica: ceo tekst kartice je ionako unutar `<a>` i
   mora da bude čitljiv istog trena.
2. **Potvrda porudžbine je nestajala čim se korpa isprazni.** `CheckoutView` je gasio
   formu kad `items` postane prazan, a broj porudžbine je živeo u toj formi. Stanje
   potvrde je podignuto iznad provere prazne korpe.
3. **`qrcode` razbija raspored.** `toCanvas` upisuje i `style.width` u punoj rezoluciji
   (336 px za `size` 168), pa je članska kartica pravila 47 px prekoračenja na 390 px.
   `QrCode` posle crtanja vraća CSS veličinu na `size`.
4. **Ikona naloga je gurala dugme za meni van ekrana.** Uz novu ikonu korpe navigacija
   se na 390 px prepunila. Nalog je sada `lg:inline-flex`; u mobilnom meniju i dalje stoji.

### Popravljeno usput, van zadatka

**`JWT_PRIVATE_KEY` na dev deployment-u je bio slomljen.** U bazi je stajao samo prvi red
PEM-a (`-----BEGIN PRIVATE KEY-----`, 28 znakova), pa je svaka prijava padala sa
`invalid RSA PrivateKeyInfo`. Do sada se to nije videlo jer nijedna strana nije koristila
prijavu. Ključevi su regenerisani i upisani u obliku koji `@convex-dev/auth` očekuje
(PEM sa razmacima umesto preloma reda). **Isti problem će se ponoviti na `--prod` ako se
ključ postavlja iz PowerShell-a** — postavljati ga iz Bash-a ili kroz
`npx @convex-dev/auth --prod`.

### Provereno u browseru, kraj do kraja

Protiv živog dev Convex deployment-a, na 390 px: proizvod → „Dodajte u korpu" → korpa
(zbir sa servera, poštarina 400 RSD, poruka o pragu za besplatnu dostavu) → naplata
(IPS opcija je vidljiva ali **isključena**, sa napomenom da čeka podatke) → porudžbina
`BM-2609-0001` → praćenje po broju i telefonu. Zatim registracija → članska kartica
`BM 951 523` → korpa istog korisnika prikazuje red `Loyalty popust 10% − 398 RSD`.
Probni podaci su obrisani: `orders:purgeByPhone`, `admin:purgeUserByEmail`.

### Izmene u zajedničkim fajlovima, pažljivo pri merge-u

- `components/site/SiteNav.tsx` — ikona korpe sa brojem; svi unutrašnji linkovi su sada
  `next/link` i apsolutni (`/#usluge`, ne `#usluge`), jer ista navigacija stoji i na
  stranama bez sidara. Nalog je skriven ispod `lg`.
- `components/sections/LoyaltyBar.tsx` — dugme za zatvaranje, pamćenje 30 dana u
  `localStorage` (`bbm.loyalty-traka.v1`), i `bare` varijanta za korpu.
- `app/globals.css` — `@custom-variant can-hover`, i gloss sweep je sada iza
  `hover: hover`. Fokus tastaturom radi na svakom uređaju.
- `convex/orders.ts` — `ORDER_MESSAGES.emailRequired` više ne obećava potvrdu na imejl.
- `convex/schema.ts` — nov indeks `bookings.by_customer`.

## Šta još NIJE podešeno

1. **Kupcu se ne šalje nikakav mejl.** `notify.newOrder` obaveštava vlasnicu. Resend bez
   verifikovanog domena isporučuje samo na adresu vlasnika naloga, pa bi poruka kupcu
   bila obećanje bez pokrića. Sav copy je usklađen sa tim: nigde ne piše da potvrda
   stiže na imejl. Kad domen bude verifikovan, dodati i mejl kupcu.
2. **IPS QR i dalje čeka podatke** (vidi [POTVRDITI] iz koraka 03). Naplata prikazuje
   opciju kao isključenu, sa objašnjenjem. Račun se ne izmišlja.
3. **Popust na proizvod (`discountPercent`) nema gde da se unese.** Polje postoji u bazi
   i u `products.update`, kartica i strana proizvoda ga prikazuju kao precrtanu staru
   cenu, ali admin ekran za to je korak 06.
4. Produkcijski Convex deployment i dalje nema ništa (vidi korak 03 niže).

## [POTVRDITI] kod vlasnice — novo u ovom koraku

| Šta | Gde |
| --- | --- |
| **Dijakritika u `data/products.json`.** Isti problem koji korak 04 prijavljuje za `site.json` i `services.json`: opisi proizvoda su ASCII, pa na strani proizvoda piše „nijansa najbliza boji brenda salona" umesto „najbliža". Vidi se na svih 70 strana. Nije dirano jer taj fajl u paralelnom radu menja druga sesija, pa bi se ispravke sudarile. | `data/products.json` → `products[].description` |
| **Cene proizvoda su okvirne** i to piše na dnu `/shop`. Preračunate su iz USD; `priceUsdRef` u podacima čuva original radi provere. | `data/products.json` → `meta.priceNote` |
| **Rok isporuke i kurirska služba.** Nigde ne pišemo za koliko dana stiže paket, jer ne znamo. Kupac vidi samo „javljamo se telefonom pre slanja". | `components/cart/OrderReceipt.tsx` |
| **Da li se roba može vratiti i pod kojim uslovima.** Nema strane o reklamacijama, a zakon je za webshop traži. | strana ne postoji |

---

## Nasleđeno iz koraka 04 — landing i zakazivanje

### Šta korak 04 dodaje

| Fajl | Šta radi |
| --- | --- |
| `components/hero/liquidShader.ts` | GLSL: simplex fBm, domain warping u dva prolaza, paleta iz design-dna, klizeći specular. Pun ciklus ~24 s. |
| `components/hero/LiquidCanvas.tsx` | R3F Canvas, `dpr [1,1.75]`, `antialias false`, `frameloop` „always" u kadru / „demand" van njega i na skrivenom tabu. Uniformi žive na materijalu. |
| `components/hero/HeroFallback.tsx` | Statični CSS radial-gradient u istim bojama. Namerno bez animacije. |
| `components/hero/Hero.tsx` | Odluka o WebGL-u, ulazna koreografija copy-ja, pin + Flip + skupljanje u krug. |
| `components/site/SiteNav.tsx` | Lepljiva navigacija, frosted tek kad hero izađe iz kadra. `#nav-logo-slot` je odredište Flip-a. |
| `components/site/SiteFooter.tsx`, `Section.tsx` | Kontakt/podnožje i omotač sekcije. |
| `components/sections/*` | Loyalty traka, Usluge (5 krugova), Zakazivanje, Radovi, ORLY, Cenovnik, Lokacije, Recenzije. |
| `components/booking/*` | Čarobnjak: Lokacija → Usluga → Dan i vreme → Podaci → Potvrda. |
| `lib/dates.ts` | Srpski datumi, latinica, bez `Intl`. |
| `lib/serviceCategories.ts` | Pet krugova nad postojećim grupama + `foldSerbian` (pretraga bez dijakritike). |

### Provereno u browseru, kraj do kraja

Čarobnjak je odrađen do kraja protiv **živog dev Convex deployment-a**: lokal → pretraga
„secer" (nalazi „šećernom") → 45 slobodnih termina za današnji dan → izbor → podaci →
`Zahtev je primljen. Javljamo se u roku od 24 h`. Test zahtev je obrisan sa
`npx convex run bookings:purgeByPhone '{"phone":"0600000000"}'`.

Skrol scenario na desktopu je izmeren: hero se pinuje (`position: fixed`), wordmark
Flip-om sleti u navigaciju (scale 1 → 0,067), logo u navigaciji se pojavi tek tada,
shader se skupi u krug (140% → 13%), pin se otpusti.

### Izmene u zajedničkim fajlovima (pažljivo pri merge-u)

- `components/motion/Reveal.tsx` — nova opcija `revealOff`. Bez nje `<li>` koji sadrži
  samo sliku ostane nevidljiv: `hideCss()` ga sakrije, `TextRevealGlobal` ga preskoči
  (nema teksta), a `variant="clip"` ne dira `opacity`. Koristi je galerija.
- `components/providers/TextRevealGlobal.tsx` — dodat `flushPassed`. Brz skrol je umeo
  da element ubaci i izbaci iz kadra između dve isporuke IntersectionObserver-a i copy
  bi ostao sakriven zauvek (reprodukovano: 12 elemenata na 390 px). Sve što je otišlo
  iznad kadra a nije okinulo, sada se pušta odmah.
- `app/globals.css` — `overflow-x: clip` na `body` (ne `hidden`, da sticky i pin rade),
  i `swatch-gloss` utility za gloss sweep preko swatch kruga.
- `components/ui/Card.tsx`, `components/ui/Input.tsx` — popravljene dve latentne greške
  tipova koje su isplivale tek kad je `tsconfig.tsbuildinfo` bio nevažeći (`ElementType`
  presek → `never`, i `prefix` kao HTML atribut `<input>`).
- `lib/gsap.ts` — registrovan `Flip`.
- Obrisan `components/dev/` (kontrolna tabla iz koraka 1, kako je i planirano).

### Šta još NIJE podešeno

1. **`/shop` i `/nalog` su privremene strane.** Postoje samo da dugmad „Ceo katalog" i
   „Registrujte se" ne vode u 404 na demou. **Korak 05 ih briše i piše prave.**
   Obe imaju to napisano u zaglavlju fajla.
2. **Korpa i ikona korpe u navigaciji ne postoje** — nema `cart-context`, to je korak 05.
   Navigacija za sada ima temu, telefon, nalog i CTA.
3. Produkcijski Convex deployment i dalje nema ništa (vidi korak 03 ispod).

### [POTVRDITI] kod vlasnice — novo u ovom koraku

| Šta | Gde |
| --- | --- |
| **Dijakritika u podacima.** `data/site.json` i `data/services.json` su ASCII: sajt prikazuje „Ljubicica" umesto „Ljubičica", „Depilacija secernom pastom" umesto „šećernom". Kod je ispravan, podaci nisu. Ovo je najvidljivija greška na demou. | `data/site.json` (`locations[].name`, `address`), `data/services.json` (`groups[].title`, `services[].title`) |
| **Peti krug nije „Nega lica".** `docs/BRAND.md` §7 traži „Nega lica", ali u cenovniku nema nijedne usluge nege lica. Peti krug zato nosi grupu `ostalo` (brow lamination, kana, šminkanje, detox paket) — sve četiri bez cene. | `lib/serviceCategories.ts` |
| **Fotografije za Depilaciju i Masažu ne postoje.** Njena galerija je nokti, pedikir i trepavice. Ta dva kruga sada nose fotografiju pedikira i nail arta; `alt` je tačan, ali motiv nije. Traže se originali. | `lib/serviceCategories.ts` → `photoId` |
| **Recenzije se ne citiraju.** Prikazani su samo broj (28) i link na 011info. Treba dozvola da se ocene sa 011info uopšte prikazuju na sajtu. | `components/sections/ReviewsSection.tsx` |
| Cene ORLY i Entity proizvoda su i dalje okvirne i to piše u sekciji. | `data/products.json` → `meta.priceNote` |

### Kako je rešen ugovor o dva sistema animacije

Hero je jedino mesto gde je site-wide reč-po-reč prolaz isključen (`data-reveal="off"`),
jer njegov `opacity` drži ulazna koreografija. Dug iz `docs/MOTION.md` je vraćen:
naslov i uvod i dalje stižu reč po reč, ali kroz `revealWords` iz `lib/textReveal.ts`,
u hero timeline-u. Nema lokalnog splittera.

Dve zamke koje su se pojavile i rešene su:

1. **Copy u flex kontejneru gasi se kao blok.** `lib/textReveal.ts` namerno preskače
   reč-po-reč kad bi reč-spanovi postali flex stavke. Hero copy je zato blok kontejner
   sa `space-y-*`, ne `flex flex-col gap-*`. Isto pravilo važi za svaku novu sekciju.
2. **Povučeni hero copy je padao na proveri.** Skrol ga svede na `opacity: 0`, a
   `visibility: hidden` ne prazni `offsetParent`, pa ga provera prijavi kao „sakriven
   copy koji niko nije vratio". Rešeno tako što ga `onUpdate` sklanja iz rasporeda
   (`display: none` preko 55% napretka) i vraća pri skrolu nagore.

---

## Nasleđeno iz koraka 03 — backend za shop, naloge i loyalty

### Stanje dev deployment-a

`grand-bandicoot-904` (dev) je zaseđen: 2 lokala, 13 rasporeda, 144 usluge,
4 kategorije, 70 proizvoda. Postavljene env promenljive:
`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `ADMIN_KEY`.

**`ADMIN_KEY` (dev): `bm-dev-9be538a5c01448631e`** — panel ga traži dok ne postoji
prvi admin nalog.

### Produkcijski Convex deployment nema ništa od ovoga

Pre demoa treba:

```
npx convex deploy
npx convex env set JWT_PRIVATE_KEY <pkcs8 pem> --prod
npx convex env set JWKS <json> --prod
npx convex env set SITE_URL https://beautybymasha-mu.vercel.app --prod
npx convex env set ADMIN_KEY <ključ> --prod
npx convex env set OWNER_EMAIL <njen imejl> --prod
npx convex run admin:init '{"key":"<ključ>"}' --prod
npx convex run admin:seedShop '{"key":"<ključ>"}' --prod
```

Ključeve generiše `npx @convex-dev/auth --prod` ili ručno (RSA 2048, PKCS8 + JWKS).
**`OWNER_EMAIL` nije postavljen ni na dev** — prva registracija sa tim imejlom
automatski dobija `role: "admin"`.

### [POTVRDITI] iz koraka 03

| Šta | Gde stoji |
| --- | --- |
| **Broj računa za IPS QR** — nije poznat, nije izmišljen | `data/site.json` → `payment.ips.account` (prazan) |
| Naziv, adresa i grad primaoca tačno kako su u banci | `data/site.json` → `payment.ips.recipient*` |
| Šifra plaćanja (stavljeno 289 = prenos fizičkog lica) | `data/site.json` → `payment.ips.paymentCode` |
| Poštarina 400 RSD i besplatno preko 6.000 RSD | `data/site.json` → `shipping` |
| **Tačna pravila loyalty programa** | `convex/lib/loyalty.ts` → `computeLoyaltyEligibility` |

Dok `payment.ips.account` stoji prazan, `orders.create` odbija `paymentMethod: "ips"`.
Sajt nudi samo pouzeće. Kad stigne pravi račun, dovoljno je upisati ga u env
(`IPS_RECIPIENT_ACCOUNT`) — kod se ne dira.

### Kako smo razumeli loyalty (ADR-004), do potvrde

1. Registracija donosi pravo na 10% na **sledeći** račun.
2. Popust se troši **jednom**, svejedno da li na sajtu ili u salonu.
3. Posle trošenja član ponovo stiče pravo tek posle sledeće plaćene posete.

Ako vlasnica kaže drugačije, menja se **samo** `computeLoyaltyEligibility` —
i shop i salon zovu istu funkciju.
