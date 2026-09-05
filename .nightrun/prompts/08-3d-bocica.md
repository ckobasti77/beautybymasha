OPCIONO. Radi ovo samo ako su svi prethodni koraci prosli.
Ako bilo sta ne prolazi, preskoci i napisi to u docs/STATUS.md.

PRVO PROCITAJ:
  .nightrun/specs/08-3d-bocica.md   <- puna specifikacija
  docs/3D-ASSETS.md   <- budzet i pravila su obavezujuca
  data/design-dna.json

SKILLS: threejs-fundamentals, threejs-materials, threejs-interaction

Model se pravi PROCEDURALNO u kodu (three.js geometrija), NE kao GLB fajl.
Nemamo Blender u ovom lancu, a proceduralna bocica je nula bajtova mreze.
Tri odvojena mesha: Glass, Liquid, Cap. Boja tecnosti dolazi iz props (hex proizvoda).
Bez ijednog logotipa i bez teksta na modelu.

Ucitava se dinamicki, NIKAD na mobilnom i NIKAD uz prefers-reduced-motion -
tada se prikazuje swatch krug ili slika proizvoda.

PREKIDAC: ako model izgleda lose ili bundle poraste preko 150 KB gzip,
VRATI izmene (git checkout) i napisi u docs/STATUS.md da 3D nije usao.
Bolje bez nego ruzno.

Zavrsna provera: typecheck, lint, build. Izmeri koliko je bundle porastao i prijavi.
PRE SVEGA - provera prethodnog koraka (najvise 10 minuta na ovo):
Procitaj docs/STATUS.md ako postoji i pokreni `npm run typecheck` i `npm run lint`.
Ako je prethodni korak nesto ostavio slomljeno ili nedovrseno, popravi TO prvo.
Jedan prolaz, ne vise. Ako ne mozes da popravis za 10 minuta, upisi u docs/STATUS.md
sta je slomljeno i nastavi sa svojim zadatkom - ne zaglavljuj se.

PREGLED U BROWSERU: nista ne radi u pozadini. Ako ti treba pogled, pokreni
`npm run dev -- -p 3001`, proveri, pa ga OBAVEZNO ugasi pre kraja koraka -
inace `npm run build` puca. Nikad port 3000.
