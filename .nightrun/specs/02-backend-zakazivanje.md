ultrathink

Napravi Convex backend za ZAKAZIVANJE. Ovo je najosetljiviji deo projekta — pogrešna
aritmetika termina se vidi tek kad dve mušterije dobiju isti slot.

PROČITAJ PRE KODA:
- CLAUDE.md, docs/BRIEF.md (ADR-001), data/site.json, data/services.json
- convex/_generated/ai/guidelines.md AKO postoji — Convex pravila imaju prednost nad tvojim znanjem
- _ref/colorcutchris/convex/ — CEO folder. Naročito:
  lib/availability.ts (motor), bookings.ts, schedules.ts, blocks.ts, settings.ts,
  services.ts, admin.ts, crons.ts, notify.ts, lib/validate.ts, lib/admin.ts
- _ref/colorcutchris/lib/slots.ts i slots.test.ts — aritmetika termina
- _ref/colorcutchris/convex/bookings.test.ts — kako su pisani testovi
- lib/site.ts, lib/services.ts (već tipovani, backend ih uvozi)

ŠTA SE MENJA U ODNOSU NA REFERENCU — ovo je suština zadatka:

ColorCutChris ima JEDNOG frizera: jedan termin u isto vreme. Beauty by Masha ima
DVA LOKALA i u svakom više ljudi koji rade paralelno. Model je:

    lokacija × resurs × kapacitet

- Lokacije: "ljubicica" i "mimoza" (data/site.json), RAZLIČITO radno vreme.
  Mimoza ne radi ponedeljkom. To mora da radi iz prvog pokušaja.
- Resursi: "nokti" | "kozmetika" | "masaza". Svaka usluga pripada tačno jednom
  (data/services.json → groups[].resource).
- Kapacitet: koliko ljudi ISTOVREMENO radi taj resurs u tom lokalu
  (data/site.json → locations[].capacity). Podrazumevano Ljubičica 3/1/1, Mimoza 2/1/1.

PRAVILO DOSTUPNOSTI — napiši ga kao čistu funkciju i testiraj posebno:
  Slot [start, start+duration) je slobodan za (lokacija, resurs) akko:
    1. ceo interval je unutar radnog vremena tog lokala za taj datum
       (scheduleOverrides ima prednost nad schedules)
    2. ne preklapa se ni sa jednim `blocks` redom za tu lokaciju i taj resurs
    3. broj POSTOJEĆIH termina koji se preklapaju sa intervalom, za istu lokaciju
       i isti resurs, sa statusom "nov" ILI "potvrdjen", je STROGO MANJI od kapaciteta
    4. start >= now + settings.leadTimeMin
    5. datum <= today + settings.horizonDays

  Preklapanje je [a1,a2) ∩ [b1,b2) ≠ ∅, tj. a1 < b2 && b1 < a2. Dodirivanje krajevima
  NIJE preklapanje — termin 10:00-11:00 i 11:00-12:00 mogu zajedno.

ŠEMA (convex/schema.ts):
- locations: key, name, active, order
- capacities: locationKey, resourceKey, count            index by_location
- schedules: locationKey, weekday (0=ned..6=sub), startMin, endMin   index by_location_weekday
             (više redova za isti dan = podeljena smena)
- scheduleOverrides: locationKey, date "YYYY-MM-DD", kind "off"|"custom",
             startMin?, endMin?, note?                    index by_location_date, by_date
- blocks: locationKey, resourceKey, date, startMin, endMin, reason?  index by_location_date
- services: ceo katalog IZ BAZE, ne iz koda. key, groupKey, title, durationMin,
             priceRsd (null dozvoljeno), bookable, addon, hidden, order
             index by_key, by_group
             RAZLOG: ima 144 usluge i ona mora sama da dodaje i menja. Reference-ov
             pristup (defaults u kodu + serviceOverrides) ovde ne skalira.
- bookings: name, phone (normalizovan), email?, serviceKey, serviceTitle, durationMin,
             locationKey, resourceKey, date, startMin, endMin, note?, status, createdAt,
             decidedAt?, source "web"|"admin", customerId? (za loyalty, može null)
             index by_status, by_phone, by_location_date, by_date, by_createdAt,
             by_location_resource_date  ← ovaj nosi proveru kapaciteta
- settings: jedan dokument — slotStepMin, leadTimeMin, horizonDays, holdHours, hoursConfirmed

FUNKCIJE:
- admin.init — idempotentan seed IZ data/*.json: lokacije, kapaciteti, radno vreme,
  svih 144 usluge, settings. Mora da može da se pozove više puta bez duplikata.
- availability.slots({ locationKey, serviceKey, date }) — javno, vraća slobodne slotove
- availability.week({ locationKey, serviceKey, fromDate }) — 7 dana, za nedeljnu traku
- bookings.create — javno. Validira SVE ponovo na serveru (nikad ne veruj klijentu),
  proverava kapacitet u istoj transakciji, vraća ConvexError sa srpskom porukom.
- bookings.list / confirm / reject / createManual / move / cancel — admin, traži ključ
- bookings.pendingCount — admin badge
- schedules, blocks, scheduleOverrides, services, settings, capacities — admin CRUD
- crons: svakih sat vremena istekli nepotvrđeni zahtevi (stariji od holdHours) → "otkazan"
- notify.ts — port iz reference (Resend). Ako RESEND_API_KEY nije postavljen,
  funkcija tiho ne radi ništa i NE ruši mutaciju.

AUTORIZACIJA: za sada admin ključ iz env-a (ADMIN_KEY), isto kao referenca
(_ref/colorcutchris/convex/lib/admin.ts). Prompt 3 uvodi Convex Auth i role —
napiši assertAdminKey tako da se lako zameni, u JEDNOM fajlu.

TESTOVI (convex-test + vitest) — bez ovoga zadatak nije gotov:
- čista aritmetika slotova: preklapanje, dodirivanje krajeva, podeljena smena
- kapacitet: sa capacity=3, tri termina u 10:00 prolaze, ČETVRTI PADA
- kapacitet je po resursu: manikir u 10:00 ne blokira masažu u 10:00
- kapacitet je po lokaciji: puna Ljubičica ne blokira Mimozu
- Mimoza ponedeljkom nema nijedan slot
- scheduleOverrides kind="off" gasi ceo dan
- leadTime: slot za 30 minuta unapred se ne nudi kad je leadTimeMin=120
- otkazani i odbijeni termini NE zauzimaju kapacitet

NA KRAJU pokreni redom i sve mora da prođe:
  npx convex dev --once     (obavezno — bez ovoga _generated nije svež i tsc pada)
  npm run typecheck
  npm run lint              (nula upozorenja)
  npm test
  npm run build

Ne izmišljaj podatke o klijentu. Nepoznato = [POTVRDITI].
Ne diraj _ref/ — čitanka, ne biblioteka.

---
PREGLED U BROWSERU (vazi za svaki korak):
Nista ne radi u pozadini. Kad menjas convex/ fajlove, sam pokreni `npx convex dev --once`
(to je i deo zavrsne provere). NE pokreci `npx convex dev` u watch rezimu - tuce se sa `--once`.
Next dev server takodje ne radi, jer bi se tukao sa `npm run build` oko .next foldera.
Ako ti treba vizuelna provera:
  1. pokreni `npm run dev -- -p 3001`
  2. otvori http://localhost:3001 i proveri sta ti treba
  3. OBAVEZNO ga ugasi pre nego sto zavrsis korak (inace `npm run build` puca)
Nikad ne koristi port 3000 - moze biti zauzet.
