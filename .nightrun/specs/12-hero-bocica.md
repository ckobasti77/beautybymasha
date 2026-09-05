# Korak 12 — 3D bocica na desnoj strani heroja, sa scroll koreografijom

## Sta postoji
Korak 08 je napravio proceduralnu bocicu: `components/three/bottleGeometry.ts`,
`BottleScene.tsx` (mesh `Liquid` prima `hex`, boja se lerp-uje), `BottleShowcase.tsx`.
Koristi se u shop heroju (`components/shop/ShopHeroBottle.tsx`). Radi.
Klijent: "desna strana heroja je prazna — stavi tu tu 3D bocicu i neka se nesto desava
na skrol, da se pomera, razliva". Nista nije radjeno u Blenderu i ne treba — proceduralna
bocica je 0 bajtova mreze.

## A. JEDAN CANVAS, NE DVA
Hero vec ima R3F canvas sa shaderom (plane). Bocica ide u ISTI canvas:
shader plane pozadi (ortografski sloj ili fullscreen quad sa `depthTest: false`,
`renderOrder: -1`), bocica ispred u perspektivnoj kameri. Jedan WebGL kontekst.
Ako je tehnicki cistije, dve scene u istom rendereru sa `autoClear: false` — ali JEDAN canvas.

## B. POSTAVKA
- Layout heroja: copy zauzima levu polovinu (kao sada), bocica **desnu polovinu**,
  vertikalno centrirana, visina ~62% visine heroja. Na 1440 px i sire.
- Tecnost: brend mint `#57BFA8`. Bez menjanja boje na hover — mirno, brend.
- Idle: lagano lebdenje (y ±1.5%, period 6 s) i blagi yaw (±7°, period 11 s).
- Pointer parallax: bocica prati kursor do ±6° rotacije, lerp 0.05. Gasi se na touch.
- Svetlo: jedno key svetlo gore-desno + `Environment` preset "studio" ili "city" sa
  niskim intenzitetom, da staklo ima sta da reflektuje. Bez senki, bez postprocessinga.

## C. SCROLL KOREOGRAFIJA — scrub, BEZ PINA (pin je uklonjen u koraku 10 i ne vraca se)
ScrollTrigger na hero sekciji, `start: "top top"`, `end: "bottom top"`, `scrub: 1`.
Progres 0 → 1 dok hero izlazi iz kadra:
- 0.00–0.35: bocica se **naginje** ka levo-dole (rotation.z do ~-55°, rotation.x ~+12°)
  kao da se lak sipa ka copy-ju
- 0.25–0.70: u shaderu `uPour` raste 0 → 1: mint u pozadini se **razliva** odozgo-desno
  ka dole-levo (domain warp pomera, zasicenost mint sloja raste). To je "razlivanje"
  koje klijent trazi — bocica sipa, pozadina se puni bojom.
- 0.55–1.00: bocica se smanjuje (scale 1 → 0.7), drift ka centru, opacity → 0.
  Copy ostaje citljiv do kraja (reveal sistem ga je vec otkrio; ne diraj mu opacity).
Sve na `transform`/uniformima. Nista ne menja layout, nema `.pin-spacer`.

## D. FALLBACK — obavezan
- <1024 px ILI prefers-reduced-motion ILI nema WebGL2: bocice NEMA, canvas se ne montira,
  hero je shader/gradijent + copy kao u koraku 10. Desna polovina ostaje prazna na
  mobilnom — to je u redu, copy se siri na punu sirinu.
- Dok se canvas ucitava (dynamic import): prazno mesto rezervisano, bez skoka layouta.

## E. BUDZET
- dpr [1, 1.5], `frameloop="demand"` kad hero nije u kadru, pauza na visibilitychange
- bocica ≤ 40k trouglova (vec je), bez tekstura
- bundle heroja ne raste vise od 60 KB gzip preko trenutnog — izmeri (`scripts/measure-bundle.mjs` postoji)
- 60 fps na 1440 px tokom skrola — proveri u Performance panelu, prijavi

## F. PREKIDAC
Ako posle 2 pokusaja ne prolazi provera G — VRATI hero na stanje iz koraka 11
(`git checkout` tih fajlova), upisi u docs/STATUS.md sta nije uspelo. Bolje bez bocice
nego hero koji stucka. Demo je danas.

## G. PROVERA — 1920, 1440, 390
1. `.pin-spacer` === 0, skrol stize do dna, reveal provera iz MOTION.md === 0
2. na 1920: bocica vidljiva desno, pri skrolu se naginje i pozadina se puni mint bojom
3. na 390: canvas ne postoji, copy puna sirina, nista ne viri
4. `document.querySelectorAll('canvas').length === 1` na desktopu
5. typecheck, lint, test, build; bundle delta prijavljen
