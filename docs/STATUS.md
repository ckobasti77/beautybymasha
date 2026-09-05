# STATUS

Stanje posle koraka **04 — javni sajt: landing sa hero shaderom i čarobnjak za zakazivanje**.
Ovaj fajl je za sledeći korak: šta radi, šta još nije podešeno, šta treba pitati vlasnicu.

## Provera koja prolazi

```
npx convex dev --once   ✓
npm run typecheck       ✓
npm run lint            ✓  (nula upozorenja)
npm test                ✓  79 testova, 4 fajla
npm run build           ✓
```

Provera reveal-a iz `docs/MOTION.md` vraća **prazan niz** — provereno u Playwright-u na
1440 px i na 390 px, posle skrola s kraja na kraj, i pri brzom i pri sporom skrolu.
`[data-reveal-state="pending"]` je prazan, `.reveal-word` je 0, horizontalnog skrola nema
(0 px na obe širine).

Produkcija https://beautybymasha-mu.vercel.app je bila HTTP 200 na početku koraka.
Korak 03 nije ostavio ništa slomljeno (typecheck i lint su prošli bez izmena).

**Napomena o `npm run build` (i dalje važi):** na Windows-u ume da padne sa
`build worker exited with code: 3221226356`. To je pad radnog procesa, ne greška u kodu.
`rm -rf .next && npm run build` prolazi. Dogodilo se jednom i u ovom koraku.

## Šta korak 04 dodaje

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

## Šta još NIJE podešeno

1. **`/shop` i `/nalog` su privremene strane.** Postoje samo da dugmad „Ceo katalog" i
   „Registrujte se" ne vode u 404 na demou. **Korak 05 ih briše i piše prave.**
   Obe imaju to napisano u zaglavlju fajla.
2. **Korpa i ikona korpe u navigaciji ne postoje** — nema `cart-context`, to je korak 05.
   Navigacija za sada ima temu, telefon, nalog i CTA.
3. Produkcijski Convex deployment i dalje nema ništa (vidi korak 03 ispod).

## [POTVRDITI] kod vlasnice — novo u ovom koraku

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
