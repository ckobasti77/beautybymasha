OPCIONO — radi ovo samo ako su svi prethodni koraci prošli.
Ako bilo šta ne prolazi, preskoči i napiši to u docs/STATUS.md.

Napravi 3D model bočice laka i ugradi ga u shop.

PROČITAJ: docs/3D-ASSETS.md (budžet i pravila su obavezujući), data/design-dna.json
SKILLS: threejs-fundamentals, threejs-materials, threejs-loaders, threejs-interaction

MODEL — napravi ga PROCEDURALNO u kodu (three.js geometrija), ne kao GLB fajl.
Razlog: nemamo Blender u ovom lancu, a proceduralna bočica je manja od 600 KB
jer je nula bajtova mreže — sve je u kodu.

- Telo: LatheGeometry od profila — kvadratna osnova sa jako zaobljenim ivicama
  koja se ka vrhu sužava u kratak vrat. Visina tela ~6 jedinica.
- Zatvarač: blago konusan cilindar, mat crn, visina ~3.5
- Ukupna visina ~9.5 jedinica, dno na y=0, centrirano po X i Z
- Tri odvojena mesha po imenu: `Glass`, `Liquid`, `Cap`
  - Glass: MeshPhysicalMaterial, transmission 1.0, roughness 0.05, ior 1.45, thickness 0.15
  - Liquid: MeshStandardMaterial, boja se postavlja iz props (hex proizvoda), roughness 0.15
  - Cap: MeshStandardMaterial, crna, roughness 0.4
- Nivo tečnosti ~80% visine tela
- BEZ ijednog logotipa, bez teksta na modelu

UGRADNJA:
- components/three/BottleShowcase.tsx — spora rotacija, drag za okretanje
- U hero sekciji /shop: boja tečnosti prati nijansu nad kojom je kursor u mreži
- Na stranici proizvoda: bočica u boji tog proizvoda
- Učitava se dinamički (next/dynamic, ssr false), Suspense fallback je slika/swatch
- NIKAD na mobilnom (max-width 768px) i NIKAD uz prefers-reduced-motion —
  tada se prikazuje swatch krug ili slika proizvoda
- Jedno svetlo + environment; bez postprocessinga, bez senki

PROVERA: typecheck, lint, build. Izmeri koliko je bundle porastao i prijavi.
Ako model izgleda loše ili bundle poraste preko 150 KB gzip — VRATI izmene
(git checkout) i napiši u docs/STATUS.md da 3D nije ušao. Bolje bez nego ružno.

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
