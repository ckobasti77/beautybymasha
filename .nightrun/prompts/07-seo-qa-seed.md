Zavrsni prolaz: SEO, demo podaci, pristupacnost, performanse, priprema za deploy.
Bez novih funkcionalnosti - samo da sve sto postoji radi besprekorno.

PRVO PROCITAJ, u celosti, pa radi tacno ono sto pise:
  .nightrun/specs/07-seo-qa-seed.md   <- puna specifikacija, sest celina
  CLAUDE.md, docs/BRIEF.md, docs/MOTION.md, data/site.json

SKILLS: seo-local, seo-schema, seo-maps, seo-sitemap, seo-technical, seo-images, humanizer

Najvaznije od svega: SEED DEMO PODATAKA. Sajt ne sme da bude prazan sutra.
Termini kroz tekucu nedelju po obe lokacije i sva tri resursa, porudzbine u raznim
statusima, loyalty clanovi sa istorijom. Datumi se racunaju od "danas", ne hardkoduju.
Seed mora biti idempotentan i mora da moze da se obrise.

Dva lokala znace DVA LocalBusiness entiteta u JSON-LD, i Mimoza NE radi ponedeljkom -
to mora da se vidi u openingHoursSpecification.

NE deployuj sam. Samo pripremi: README, docs/HANDOVER.md na srpskom za vlasnicu
(bez tehnickog zargona), i proveri da nijedan secret nije u gitu.

Na kraju napisi docs/STATUS.md: sta radi, sta ne radi, i SVAKI [POTVRDITI] koji je
ostao u kodu, sa putanjom fajla. To je moja lista za jutro.

Zavrsna provera: npx convex dev --once && npm run typecheck && npm run lint && npm test && npm run build
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
