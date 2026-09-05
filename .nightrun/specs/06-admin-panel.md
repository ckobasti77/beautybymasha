ultrathink

Napravi ADMIN PANEL. Ovo je proizvod koji prodajemo — sve ostalo je izlog.

Korisnica: vlasnica salona, oko 40 godina, NA TELEFONU, između dve mušterije.
Ako neka radnja traži više od tri dodira ili objašnjenje, dizajn je pogrešan.

PROČITAJ PRE KODA:
- docs/ADMIN.md — CELA specifikacija, 12 tabova. Ovo je ugovor.
- CLAUDE.md, docs/BRAND.md, docs/MOTION.md
- convex/ — ceo backend postoji (zakazivanje, shop, auth, loyalty)
- _ref/colorcutchris/app/admin/ — CalendarTab.tsx (738 linija, mehanika kalendara je dobra),
  HoursTab, RequestsTab, ServicesTab, ui.tsx, Modal.tsx
- _ref/colorcutchris/docs/screenshots/ — POGLEDAJ slike, tako izgleda dobar admin
- _ref/studio-lady-gaga/app/admin/ — proizvodi, evidencija-narudzbina
- SKILLS: gsap-react, gsap-performance, humanizer

PRISTUP: Convex Auth + role. /admin je server-side zaštićen; nema role → /nalog.
robots noindex. `staff` vidi Danas, Zahtevi, Kalendar i Loyalty; NE vidi Promet,
Proizvode ni Podešavanja.

NAVIGACIJA:
- Mobilni: donja traka, 5 ikonica (Danas · Zahtevi · Kalendar · Shop · Još), "Još" otvara sheet
- Desktop: leva sidebar kolona, aktivni tab mint pill (motion layoutId)
- Badge sa brojem na "Zahtevi" i "Porudžbine"
- CEO panel je data-reveal="off" — reč-po-reč ovde nema smisla

TABOVI — svih 12 po docs/ADMIN.md. Prioritet ako ponestane vremena:
Danas → Zahtevi → Kalendar → Proizvodi → Porudžbine → Loyalty → Radno vreme →
Usluge → Kapacitet → Galerija → Poruke → Podešavanja

Naročito pazi na ova četiri, tu se dobija posao:

1. DANAS — početni ekran. Traka "Danas 12 termina · 3 čekaju potvrdu · 2 nove porudžbine".
   Prekidač lokacije Ljubičica | Mimoza | Oba. Vremenska osa dana po resursima.
   Dodir na termin → sheet: Pozovi, Viber, Pomeri, Otkaži. Promet dana, bez grafikona.

2. KALENDAR — nedeljni, po lokaciji, TRAKE PO RESURSU (nokti/kozmetika/masaža),
   jer u istom terminu radi više ljudi. Mehaniku uzmi iz reference i proširi na
   lokacija × resurs. Dodir na prazno = ručni upis. Prevlačenje menja nedelju.

3. PROIZVODI — zbog ovoga nas zovu:
   - Mreža sa swatch-om, cenom, stanjem; filter po brendu i kategoriji
   - UVOZ IZ TABELE: "Uvezi CSV/XLSX" → mapiranje kolona → pregled prvih 20 redova →
     Uvezi. Uparivanje po `sku` (convex products.bulkUpsert). Ništa se ne briše.
     Izveštaj: "38 ažurirano · 12 novo · 2 preskočeno (nedostaje cena)". Koristi `xlsx`.
   - "Izvezi CSV" da može da radi u Excelu pa vrati
   - Masovni upload slika: prevuci 50 slika, uparuje po nazivu fajla = sku ili slug
   - Grupne radnje: promeni cenu za %, uključi/isključi, postavi popust

4. LOYALTY — pretraga člana po broju kartice, imenu, telefonu ili emailu.
   Skener QR-a (getUserMedia + BarcodeDetector, fallback na ručni unos — na desktopu
   bez kamere mora da radi unos). Kartica člana sa istorijom. Dugme "Iskoristi 10%".

PRINCIPI (docs/ADMIN.md):
- Mobilni prvo, projektuj na 390px pa širi
- Sve se čuva ODMAH, sa "Sačuvano" potvrdom. Bez "Sačuvaj" dugmadi po formama.
- Tap-target ≥ 44px. Cene i sati tabular-nums.
- Prazno stanje objašnjava šta ide u njega i nudi jednu radnju
- Destruktivno traži potvrdu i nudi "Poništi" u toastu 8 sekundi
- Bez žargona: ne "status: pending" nego "Čeka potvrdu"
- Greška kaže šta da uradi, ne šta je puklo

TEKST kroz skill `humanizer`.
PROVERA: typecheck, lint, test, build. Ručno proveri na 390px i 1440px.

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
