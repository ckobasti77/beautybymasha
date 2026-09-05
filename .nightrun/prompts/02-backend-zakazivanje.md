ultrathink

Napravi Convex backend za ZAKAZIVANJE.

PRVO PROCITAJ, u celosti, pa radi tacno ono sto pise:
  .nightrun/specs/02-backend-zakazivanje.md   <- puna specifikacija ovog koraka
  CLAUDE.md
  docs/BRIEF.md (ADR-001)
  convex/_generated/ai/guidelines.md ako postoji (Convex pravila imaju prednost nad tvojim znanjem)

Sustina, da znas na sta da obratis paznju dok citas spec:
ColorCutChris (_ref/colorcutchris) ima JEDNOG frizera - jedan termin u isto vreme.
Beauty by Masha ima DVA LOKALA sa razlicitim radnim vremenom i u svakom vise ljudi
koji rade paralelno. Model je lokacija x resurs x kapacitet. Mimoza ne radi ponedeljkom.
Tri manikira u 10:00 moraju da prodju ako je kapacitet 3, cetvrti mora da padne.
Usluga u masazi ne sme da blokira uslugu u noktima.

Ovo je najosetljiviji deo projekta - pogresna aritmetika termina se vidi tek kad dve
musterije dobiju isti slot. Zato spec trazi testove za svaki od tih slucajeva.
Bez tih testova korak NIJE gotov.

Zavrsna provera, sve mora da prodje:
  npx convex dev --once && npm run typecheck && npm run lint && npm test && npm run build

Ne izmisljaj podatke o klijentu - nepoznato je [POTVRDITI]. _ref/ je citanka, ne biblioteka.
PREGLED U BROWSERU: nista ne radi u pozadini. Ako ti treba pogled, pokreni
`npm run dev -- -p 3001`, proveri, pa ga OBAVEZNO ugasi pre kraja koraka -
inace `npm run build` puca. Nikad port 3000.
