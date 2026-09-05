# STATUS

Stanje posle koraka **03 — backend za shop, naloge i loyalty**.
Ovaj fajl je za sledeći korak: šta radi, šta još nije podešeno, šta treba pitati vlasnicu.

## Provera koja prolazi

```
npx convex dev --once   ✓
npm run typecheck       ✓
npm run lint            ✓  (nula upozorenja)
npm test                ✓  79 testova, 4 fajla
npm run build           ✓
```

Produkcija https://beautybymasha-mu.vercel.app je bila ispravna (HTTP 200) na početku
i na kraju koraka. Korak 02 nije ostavio ništa slomljeno.

**Napomena o `npm run build`:** jednom je pao sa `build worker exited with code:
3221226356` usred „Generating static pages". To je pad radnog procesa na Windows-u,
ne greška u kodu — `rm -rf .next && npm run build` prolazi. Ako se ponovi, obriši
`.next` pa pokreni ponovo.

## Šta korak 03 dodaje

| Fajl | Šta radi |
| --- | --- |
| `convex/auth.ts`, `auth.config.ts`, `http.ts` | Convex Auth, Password provider. Registracija = imejl + lozinka + potvrda lozinke i ništa više. Potvrda lozinke se proverava i na serveru. |
| `convex/lib/emailOtp.ts` | Potvrda imejla kodom preko Resend-a. **Isključena**; pali se sa `AUTH_EMAIL_VERIFICATION=true`. |
| `convex/lib/admin.ts` | `assertAdmin` — uloga `admin` prolazi bez ključa; `ADMIN_KEY` radi SAMO dok u bazi ne postoji nijedan admin nalog. |
| `convex/lib/loyalty.ts` | `computeLoyaltyEligibility` — **jedina** funkcija koja zna pravila popusta. |
| `convex/loyalty.ts` | `status`, `myCard`, `findMember`, `redeem`, `history`. |
| `convex/products.ts` | katalog, `bulkUpsert` (uparuje po `sku`), `generateUploadUrl`, `saveProductImages`. |
| `convex/orders.ts` | `create`, `byNumber`, `mine`, `list`, `setStatus`, `confirmPayment`, `salesAnalytics`. |
| `convex/inquiries.ts` | kontakt forma. |
| `convex/admin.ts` | `seedShop` — idempotentan, 4 kategorije + 70 proizvoda. |
| `lib/shop.ts` | aritmetika korpe — jedino mesto gde se računa cena. |
| `lib/ips.ts`, `lib/ips-purpose.ts` | IPS QR sadržaj po standardu NBS. |

**Cene:** `orders.create` prima **isključivo `{ slug, qty }`**. Cena, popust, poštarina
i loyalty dolaze iz baze. Klijentska cena ne postoji u argumentima, pa ne može ni da se
pošalje — test `convex/shop.test.ts` to dokazuje.

## Stanje dev deployment-a

`grand-bandicoot-904` (dev) je zaseđen: 2 lokala, 13 rasporeda, 144 usluge,
4 kategorije, 70 proizvoda. Postavljene env promenljive:
`JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `ADMIN_KEY`.

**`ADMIN_KEY` (dev): `bm-dev-9be538a5c01448631e`** — panel ga traži dok ne postoji
prvi admin nalog.

## Šta još NIJE podešeno

1. **Produkcijski Convex deployment nema ništa od ovoga.** Pre demoa treba:
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
2. **`OWNER_EMAIL` nije postavljen ni na dev.** Prva registracija sa tim imejlom
   automatski dobija `role: "admin"`. Dok se ne postavi, admin nalog se pravi ručno.
3. **Frontend za nalog, korpu i naplatu ne postoji** — to je korak 05.
   Backend je spreman i pokriven testovima.

## [POTVRDITI] kod vlasnice

| Šta | Gde stoji |
| --- | --- |
| **Broj računa za IPS QR** — nije poznat, nije izmišljen | `data/site.json` → `payment.ips.account` (prazan) |
| Naziv, adresa i grad primaoca tačno kako su u banci | `data/site.json` → `payment.ips.recipient*` |
| Šifra plaćanja (stavljeno 289 = prenos fizičkog lica) | `data/site.json` → `payment.ips.paymentCode` |
| Poštarina 400 RSD i besplatno preko 6.000 RSD | `data/site.json` → `shipping` |
| Cene ORLY i Entity proizvoda (preračun iz USD) | `data/products.json` → `meta.priceNote` |
| **Tačna pravila loyalty programa** | `convex/lib/loyalty.ts` → `computeLoyaltyEligibility` |

Dok `payment.ips.account` stoji prazan, `orders.create` odbija `paymentMethod: "ips"`
sa porukom „izaberi pouzeće". Sajt nudi samo pouzeće. Kad stigne pravi račun, dovoljno
je upisati ga u env (`IPS_RECIPIENT_ACCOUNT`) — kod se ne dira.

### Kako smo razumeli loyalty (ADR-004), do potvrde

1. Registracija donosi pravo na 10% na **sledeći** račun.
2. Popust se troši **jednom**, svejedno da li na sajtu ili u salonu.
3. Posle trošenja član ponovo stiče pravo tek posle sledeće plaćene posete
   (završena porudžbina ili potvrđen termin nakon datuma trošenja).

Ako vlasnica kaže drugačije, menja se **samo** `computeLoyaltyEligibility` —
i shop i salon zovu istu funkciju.
