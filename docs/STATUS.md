# STATUS

Stanje posle koraka **06 — admin panel**.
Ovaj fajl je za sledeći korak: šta radi, šta još nije podešeno, šta treba pitati vlasnicu.

## Provera koja prolazi

```
npx convex dev --once   ✓
npm run typecheck       ✓
npm run lint            ✓  (nula upozorenja)
npm test                ✓  116 testova, 6 fajlova
npm run build           ✓  80 strana; /admin je dinamičan (ƒ), kako i treba
```

Provera reveal-a iz `docs/MOTION.md` vraća **prazan niz** na svih 12 tabova panela,
na 390 px i na 1440 px. `[data-reveal-state="pending"]` je prazan, `.reveal-word` je 0,
horizontalnog prekoračenja nema (0 px na svakom tabu).

Produkcija https://beautybymasha-mu.vercel.app je bila HTTP 200 na početku koraka
(`/`, `/shop`, `/nalog`). `/zakazivanje` vraća 404 — to je ispravno, čarobnjak je
sidro na landingu (`/#zakazivanje`), ne zasebna ruta. Korak 05 nije ostavio ništa
slomljeno: `typecheck` i `lint` su prošli pre ijedne izmene.

**Napomena o `npm run build` (i dalje važi):** na Windows-u ume da padne sa
`build worker exited with code: 3221226356`. To je pad radnog procesa, ne greška u kodu.
`rm -rf .next && npm run build` prolazi.

## Šta korak 06 dodaje

| Fajl | Šta radi |
| --- | --- |
| `app/admin/page.tsx`, `layout.tsx` | Ruta panela. `robots: noindex, nofollow`, `force-dynamic`, `data-reveal="off"` na celom podstablu. |
| `components/admin/AdminApp.tsx` | Ulaz, provera pristupa, raspored tabova. Tab stoji u hash-u (`/admin#kalendar`), pa osvežavanje i dugme „nazad“ ostaju gde je bila. |
| `components/admin/AdminNav.tsx` | Donja traka od pet dodira na telefonu, leva kolona sa mint pilulom (`layoutId`) na desktopu. Bedž na „Zahtevi“ i „Porudžbine“. |
| `components/admin/ui.tsx` | `useSave` + „Sačuvano“, toast sa `Poništi` (8 s), `Stepper`, `Toggle`, `InlineNumber`, `Segmented`, `ConfirmButton`, prazna stanja. |
| `components/admin/AdminReveal.tsx` | Ulaz liste pri otvaranju taba (`useGSAP`, samo transform i opacity, `clearProps`, `matchMedia`). |
| `components/admin/tabs/*` | Svih 12 tabova iz `docs/ADMIN.md`. |
| `components/admin/tabs/importFormat.ts` | Prevod ćelija iz njene tabele u redove za `products.bulkUpsert`. 18 testova. |
| `convex/gallery.ts` | Galerija radova: upload, redosled, „Istaknuto“, brisanje (i zapisa i fajla iz storage-a). |
| `convex/admin.ts` → `me`, `today`, `badges` | Ko sam ja, današnji dan u jednom čitanju, brojevi za bedževe. |
| `convex/products.ts` → `bulkAction`, `attachImageByName`, `purgeBySku` | Grupne izmene, masovni upload slika po nazivu fajla, čišćenje probnih artikala. |
| `convex/loyalty.ts` → `members` | Svi članovi, poslednja poseta prva. |
| `convex/blocks.ts` → `listRange` | Pauze cele nedelje u jednom upitu (kalendar). |

### Četiri taba koja nose posao

1. **Danas** — traka „N termina · M čeka potvrdu · K novih porudžbina“, prekidač
   `Ljubicica | Mimoza | Oba`, dan grupisan po resursu (Nokti / Kozmetika / Masaža),
   dodir na termin otvara sheet sa `Pozovi`, `Viber`, `Pomeri`, `Otkaži`. Promet dana
   u tri brojke, bez grafikona.
2. **Kalendar** — nedelja jednog lokala, **traka po resursu**. Termini koji se preklapaju
   dele širinu trake (tri manikira u 10:00 su tri uska bloka, ne jedan preko drugog).
   Na telefonu se gleda jedan dan uz traku nedelje i prevlačenje levo/desno; na `lg+`
   cela nedelja. Dodir na prazno mesto upisuje termin ili pauzu.
3. **Proizvodi** — mreža sa swatch-om, filteri, grupne radnje (cena za %, popust,
   vidljivost), `Izvezi CSV` (tačka-zarez + BOM, za Excel na srpskom), masovni upload
   slika po nazivu fajla, i **uvoz iz tabele**: fajl → mapiranje kolona (pogađa se samo)
   → pregled prvih 20 → izveštaj `3 ažurirano · 1 novo · 1 preskočeno` sa razlogom.
4. **Loyalty** — pretraga po broju kartice, imenu, telefonu ili imejlu; skener QR-a
   (`BarcodeDetector` + `getUserMedia`) sa ručnim unosom kao punopravnom zamenom
   tamo gde skenera nema; kartica člana sa istorijom i dugmetom `Iskoristi 10%`.

### Provereno u browseru, kraj do kraja

Protiv živog dev Convex deployment-a, na 390 px i 1440 px. Uvoz je proveren pravom
tabelom sa srpskim zaglavljima i cenama u obliku `2.190,00`: mapiranje je pogodilo
svih pet kolona, cene su ušle kao 2190 / 2290 / 1850, popust 10% je primenjen, red
bez cene je preskočen uz poruku „Nov proizvod mora imati cenu.“, a **prazna ćelija za
stanje nije pregazila postojeću vrednost** (CUPCAKE je zadržao 11). Probni podaci su
obrisani (`products:purgeBySku`, `bookings:purgeByPhone`); katalog je vraćen na 70
proizvoda sa polaznim cenama, a probni termini su uklonjeni.

### Zamke koje su se pojavile i rešene su

1. **`xlsx` je gutao srpske cene.** Sa `raw: true` biblioteka sama pretvara `2.190,00`
   u broj po američkim pravilima i dobije **2,19**. Ceo cenovnik bi tiho postao
   dvocifren. Rešeno sa `raw: false` — ćelija stiže onako kako je napisana, pa je
   `parseNumber` čita po srpskom zapisu. Pokriveno testovima.
2. **Ulaz kataloga je trajao 1,5 s.** Razmak po kartici puta 70 kartica probija
   granicu iz `docs/MOTION.md` (~1,2 s), pa su poslednje kartice ostajale na
   `opacity: 0`. `AdminReveal` sada koristi `stagger: { amount }` — ceo niz uvek
   staje u isti prozor, bez obzira na broj kartica.
3. **Magnetni omotač dugmeta probijao je 390 px.** Primarno dugme je podrazumevano
   magnetno, a omotač ima negativnu marginu. U panelu je magnet ugašen svuda —
   ovo se koristi palcem, ne mišem.
4. **Prekidači su bili 40 px.** `Segmented` je podignut na 44 px, po pravilu iz
   `docs/ADMIN.md`.

### Odstupanje od specifikacije — pročitati

`docs/ADMIN.md` traži da je `/admin` **server-side zaštićen** (nema role → redirect
na `/nalog`). Isporučeno je: `robots: noindex, nofollow` iz servera, klijentska
kapija koja nudi prijavu, i — što je jedina granica koja stvarno drži — `assertAdmin`
/ `assertStaff` na **svakom** upitu i **svakoj** izmeni u Convex-u. Bez uloge se ne
dobija nijedan podatak, ni kad bi neko zaobišao taj ekran.

Prava SSR zaštita traži zamenu `ConvexAuthProvider` sa `ConvexAuthNextjsProvider`
plus `convexAuthNextjsMiddleware`, što premešta token iz `localStorage` u kolačiće i
dira prijavu na celom sajtu — onu koja je u koraku 05 provereno proradila. Nisam to
radio usput u istom koraku. **Ako se želi, to je zaseban korak sa sopstvenom
proverom prijave, korpe i naloga.**

### Otvoreno / za vlasnicu

- **`[POTVRDITI]` kanal potvrde termina.** Panel čuva tekst poruke uz potvrdu
  (Podešavanja → „Poruka uz potvrdu termina“, sa `{ime} {usluga} {datum} {vreme} {lokal}`),
  ali je **ne šalje** — nije dogovoreno da li ide imejlom, Viberom ili SMS-om.
  Potvrda i dalje uredno upisuje termin u kalendar.
- **Imena lokala u `data/site.json` su bez dijakritika** — „Ljubicica“ umesto
  „Ljubičica“. To se vidi i na javnom sajtu, ne samo u panelu. Nisam dirao
  `data/*.json` (te fajlove menja i drugi tok rada); popravka je jedno slovo u
  `locations[].name`.
- **Radno vreme nije potvrđeno** (`hoursConfirmed: false`) — baner u tabu
  „Radno vreme“ upravo to i traži.

### Izmene u zajedničkim fajlovima, pažljivo pri merge-u

- `convex/schema.ts` — nova tabela `gallery`; `settings` je dobio `shippingFlatRsd`,
  `shippingFreeOverRsd`, `loyaltyPercent` i `confirmMessage` (sva **opciona**, pa
  stariji dokument radi bez migracije).
- `lib/shop.ts` — `shippingFor`, `loyaltyDiscountFor` i `cartTotals` primaju opcioni
  `ShopConfig`. Bez argumenta važi `data/site.json`, pa javni sajt i postojeći testovi
  rade nepromenjeno; `orders.quote` i `orders.create` sada prosleđuju ono što stoji u
  bazi, da tab „Podešavanja“ zaista nešto menja.
- `convex/bookings.ts`, `blocks.ts`, `schedules.ts`, `services.ts` — čitanja i izmene
  koje radnica sme (Danas, Zahtevi, Kalendar, Loyalty) prešle su sa `assertAdmin` na
  `assertStaff`. Promet, proizvodi i podešavanja ostaju samo za admina.
- `vitest.config.mts` — dodat `@` alias, isti kao u `tsconfig.json`.

### Kako ući u panel

Dok u bazi nema nijednog admin naloga važi `ADMIN_KEY` (`/admin` → „Prvo podizanje
panela“). Čim se vlasnica registruje imejlom iz `OWNER_EMAIL`, dobija `role: "admin"`
i ključ prestaje da važi. **`OWNER_EMAIL` nije postavljen ni na dev ni na prod** —
postaviti ga pre nego što joj se preda panel:

```
npx convex env set OWNER_EMAIL <njen imejl> [--prod]
```
