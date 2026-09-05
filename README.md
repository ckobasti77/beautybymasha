# Beauty by Masha

Sajt kozmetičkog salona u Belvilleu (Novi Beograd): landing, onlajn zakazivanje za dva
lokala, ORLY/Entity webshop i jedan admin panel. Sve na srpskom, latinica (`sr-Latn-RS`).

Next.js 16 (App Router, Turbopack) · React 19 · Convex · Tailwind 4 · GSAP · three/R3F.

Uputstvo za **vlasnicu** je u [`docs/HANDOVER.md`](docs/HANDOVER.md) — bez tehničkih pojmova.
Stanje projekta i otvorena pitanja su u [`docs/STATUS.md`](docs/STATUS.md).

## Pokretanje

Trebaju dva terminala. Convex mora da radi uz `next dev`, inače sajt nema odakle da čita.

```bash
npm install
npx convex dev          # terminal 1 — backend (prati izmene u convex/)
npm run dev             # terminal 2 — Next na http://localhost:3000
```

Prvi put, dok je baza prazna, treba je napuniti:

```bash
npm run seed            # katalog + demo podaci (vidi „Demo podaci")
```

## Komande

| Komanda | Šta radi |
| --- | --- |
| `npm run dev` | Next dev server |
| `npx convex dev` | Convex backend, prati izmene |
| `npx convex dev --once` | jednom gurne funkcije i izađe (deo završne provere) |
| `npm run build` | produkcioni build |
| `npm run lint` | ESLint — uslov je **nula** upozorenja |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run seed` | katalog + demo saobraćaj u bazu (idempotentno) |
| `npm run seed:clear` | briše **samo** demo saobraćaj, katalog ostaje |
| `npm run assets` | skida spoljne slike i konvertuje ih u AVIF u `public/` |
| `npm run swatches` | izvlači swatch boje iz fotografija proizvoda |

`npm run dev` i `npm run build` se biju oko `.next/` foldera — ne pokreću se uporedo.

## Env promenljive

Dve strane, dva mesta. **Ništa od ovoga ne ide u git** (`.env*` je u `.gitignore`).

### Next (`.env.local` lokalno, Vercel Project Settings u produkciji)

| Promenljiva | Obavezna | Šta je |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | da | adresa Convex deployment-a, npr. `https://ime-123.convex.cloud`. Ispisuje je `npx convex dev`. |

### Convex (`npx convex env set IME vrednost`, uz `--prod` za produkciju)

| Promenljiva | Obavezna | Šta je |
| --- | --- | --- |
| `SITE_URL` | da | adresa sajta, npr. `https://beautybymasha-mu.vercel.app`. Ide u linkove u imejlovima i u `redirect` posle prijave. |
| `JWT_PRIVATE_KEY` | da | privatni ključ kojim Convex Auth potpisuje prijave. Bez njega **niko ne može da se prijavi**. |
| `JWKS` | da | javni deo istog ključa. Ide u paru sa `JWT_PRIVATE_KEY`. |
| `ADMIN_KEY` | da | rezervni ključ za `/admin`, važi **samo dok u bazi nema nijednog admin naloga**. Čim se vlasnica registruje, prestaje da važi. |
| `OWNER_EMAIL` | da | imejl vlasnice — ili više imejlova razdvojenih zarezom (`ivana@…,jovan@…`). Nalog registrovan bilo kojim od njih automatski dobija `role: "admin"`. |
| `IPS_RECIPIENT_ACCOUNT` | ne | tekući račun salona, 18 cifara. Dok je prazan, sajt nudi samo pouzeće i **ne pravi IPS QR**. |
| `IPS_RECIPIENT_NAME` | ne | naziv primaoca tačno kako stoji u banci. |
| `IPS_RECIPIENT_ADDRESS` | ne | ulica i broj sedišta firme. |
| `IPS_RECIPIENT_CITY` | ne | poštanski broj i grad sedišta. |
| `IPS_PAYMENT_CODE` | ne | šifra plaćanja, podrazumevano `289`. |
| `RESEND_API_KEY` | ne | slanje imejla. Kanal potvrde termina još nije dogovoren — vidi `docs/STATUS.md`. |

`JWT_PRIVATE_KEY` je višelinijski. **Postavlja se iz Bash-a, ne iz PowerShell-a** —
PowerShell preseče vrednost na prvom prelomu reda i ostane samo prva linija:

```bash
npx convex env set JWT_PRIVATE_KEY "$(cat kljuc.pem)" --prod
npx convex env get JWT_PRIVATE_KEY --prod | wc -c   # mora biti ceo ključ, ne ~30 znakova
```

Šta je gde postavljeno: `npx convex env list` i `npx convex env list --prod`.

## Demo podaci

`convex/seedDemo.ts` puni bazu tako da sajt i panel nikad ne budu prazni.

```bash
npm run seed             # katalog (2 lokala, radno vreme, 144 usluge, 70 proizvoda)
                         # + 14 termina kroz TEKUĆU nedelju, 5 porudžbina u raznim
                         #   statusima, 3 loyalty člana sa istorijom, 2 poruke
npm run seed:clear       # briše samo demo saobraćaj; katalog i podešavanja ostaju
npm run seed -- --prod   # isto, ali nad produkcijom
```

Dve stvari koje ovo drže na okupu:

- **Datumi se računaju od „danas".** Termini kreću od ponedeljka tekuće nedelje, pa
  seed jednako izgleda i za mesec dana. Ništa nije zakucano.
- **Demo se prepoznaje po kontaktu.** Telefon iz opsega `0641230xxx` i imejl na
  `demo.beautybymasha.rs`. Zato `seed:clear` briše tačno ono što je seed napravio, i
  nijedan pravi termin ili porudžbinu. Iz istog razloga je `npm run seed` idempotentan:
  prvo obriše prethodni demo, pa upiše nov.

**Pre predaje vlasnici pokrenuti `npm run seed:clear -- --prod`** — demo brojevi ne treba
da stoje u njenom kalendaru. Katalog i radno vreme ostaju.

## Ulazak u admin panel

Dok u bazi nema nijednog admin naloga, `/admin` traži `ADMIN_KEY` („Prvo podizanje
panela"). Čim se vlasnica registruje imejlom iz `OWNER_EMAIL`, dobija `role: "admin"` i
ključ prestaje da važi.

Granica koja stvarno drži je `assertAdmin` / `assertStaff` na **svakom** upitu i
**svakoj** izmeni u Convex-u — bez uloge se ne dobija nijedan podatak.

## Struktura

```
app/          rute (App Router). sitemap.ts, robots.ts, opengraph-image.tsx
components/   UI po oblasti: hero, sections, booking, shop, cart, nalog, admin, motion
convex/       backend: shema, zakazivanje, shop, auth, loyalty, admin, seedDemo
lib/          čista logika koju dele klijent i backend (slots, shop, jsonLd, site, services)
data/         site.json, services.json (144 usluge), products.json (70), photos.json
docs/         BRIEF, BRAND, MOTION, ADMIN, HANDOVER, STATUS — pročitati pre koda
_ref/         dva referentna projekta, samo za čitanje. Nikad ne importovati odatle.
```

Pravila projekta (šta se sme, šta ne, koji skill kada) su u `CLAUDE.md`.

## Pre nego što se kaže „gotovo"

```bash
npx convex dev --once && npm run typecheck && npm run lint && npm test && npm run build
```

Uz to, provera otkrivanja teksta iz `docs/MOTION.md` mora da vrati **prazan niz** —
skroluj stranicu s kraja na kraj pa u konzoli:

```js
[...document.querySelectorAll('*')].filter(e => e.offsetParent && e.textContent.trim() && getComputedStyle(e).opacity === '0')
```
