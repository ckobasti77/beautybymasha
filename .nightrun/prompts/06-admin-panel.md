ultrathink

Napravi ADMIN PANEL. Ovo je proizvod koji prodajemo - sve ostalo je izlog.

PRVO PROCITAJ, u celosti, pa radi tacno ono sto pise:
  docs/ADMIN.md   <- CELA specifikacija, 12 tabova, ovo je ugovor
  .nightrun/specs/06-admin-panel.md   <- redosled prioriteta i sta se ne sme propustiti
  CLAUDE.md, docs/BRAND.md, docs/MOTION.md
  _ref/colorcutchris/docs/screenshots/   <- POGLEDAJ slike, tako izgleda dobar admin

SKILLS: gsap-react, gsap-performance, humanizer

Korisnica je vlasnica salona, oko 40 godina, NA TELEFONU, izmedju dve musterije.
Ako neka radnja trazi vise od tri dodira ili objasnjenje, dizajn je pogresan.
Projektuj na 390px pa siri. Ceo panel je data-reveal="off".

Cetiri taba nose posao, njima daj najvise paznje:
- DANAS: pocetni ekran, sta joj treba dok otkljucava telefon
- KALENDAR: nedeljni, po lokaciji, TRAKE PO RESURSU jer vise ljudi radi paralelno
- PROIZVODI: uvoz iz CSV/XLSX tabele - zbog ovoga nas i zovu
- LOYALTY: pretraga clana i dugme Iskoristi 10%

Sav srpski tekst kroz skill humanizer. Bez zargona: ne "status: pending"
nego "Ceka potvrdu". Greska kaze sta da uradi, ne sta je puklo.

Zavrsna provera: typecheck, lint, test, build. Proveri na 390px i 1440px.
PRE SVEGA - provera prethodnog koraka (najvise 10 minuta na ovo):
Procitaj docs/STATUS.md ako postoji i pokreni `npm run typecheck` i `npm run lint`.
Ako je prethodni korak nesto ostavio slomljeno ili nedovrseno, popravi TO prvo.
Proveri i produkciju: https://beautybymasha-mu.vercel.app - prethodni korak je
vec deployovan. Ako je prod pao ili prikazuje gresku, to je prioritet nad tvojim zadatkom.
Jedan prolaz, ne vise. Ako ne mozes da popravis za 10 minuta, upisi u docs/STATUS.md
sta je slomljeno i nastavi sa svojim zadatkom - ne zaglavljuj se.

PREGLED U BROWSERU: nista ne radi u pozadini. Ako ti treba pogled, pokreni
`npm run dev -- -p 3001`, proveri, pa ga OBAVEZNO ugasi pre kraja koraka -
inace `npm run build` puca. Nikad port 3000.
