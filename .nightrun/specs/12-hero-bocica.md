# Korak 12 — 3D bocica na desnoj strani heroja, sa scroll koreografijom

## Sta postoji
Korak 08 je napravio PROCEDURALNU bocicu (`components/three/bottleGeometry.ts`,
`BottleScene.tsx` sa meshom `Liquid` koji prima `hex`). Radi, ali je LatheGeometry -
rotaciono simetricna, kao parfem. Bocica laka NIJE okrugla: zaobljeno kvadratno telo,
tanak vrat, zdepast zatvarac. Na 62% visine heroja ta razlika se vidi.

## MODEL IZ BLENDERA
> NAPOMENA (korak 13): metod je BLENDER MCP (Blender otvoren, add-on server 9876), vidi
> `.nightrun/specs/13-hero-zona.md` sekcija I. Headless `blender -b` je samo fallback.
> Geometrija i budzet ispod ostaju merodavni.
Napravi `scripts/bottle.py` (bpy) i pokreni ga:
  Windows: `& "C:\Program Files\Blender Foundation\Blender *\blender.exe" -b -P scripts/bottle.py`
  (nadji tacnu putanju sa `Get-ChildItem "C:\Program Files\Blender Foundation"`; ako
  nema - `where.exe blender`). Izlaz: `public/models/bocica.glb`.

Geometrija (1 jedinica = 1 cm, Y gore, dno na y=0, centrirano po X/Z):
- **Glass** — telo: zaobljeni kvadrat ~3.2 x 3.2 u osnovi, radijus uglova ~0.9, visina
  ~5.2, gornja ivica se sazima u vrat precnika ~1.1 visine ~0.8. Solidify 0.12 (staklo ima
  zid). Subdivision 2 nivoa, shade smooth. Materijal: Principled, transmission 1.0,
  roughness 0.04, IOR 1.45, thickness ~0.12.
- **Liquid** — zaseban mesh, unutrasnjost stakla skalirana 0.94, visina do 78% tela,
  blago zaobljen gornji meniskus. Principled, base color BELA (kod menja u runtime-u),
  roughness 0.12. Ime mesha MORA biti tacno `Liquid`.
- **Cap** — zatvarac: cilindar precnika ~1.9, visina ~3.6, blago konusan (gornji precnik
  ~1.7), gornja ivica zaobljena bevel 0.15. 8-12 plitkih vertikalnih zljebova za hvatanje
  (kao pravi ORLY cap) - to daje karakter. Materijal: crna, roughness 0.35, metalness 0.1.
- **Brush** unutar bocice NE modelovati (ne vidi se kroz obojenu tecnost).
- Bez etikete, bez logotipa, bez teksta. Bez armature i animacija.
- Ukupna visina ~9.6. Apply all transforms pre exporta.

Bake: AO na Glass i Cap u jednu 512x512 teksturu (multiply na base color) - daje tamnu
liniju gde zatvarac seda na vrat. Ako bake komplikuje - preskoci, nije kriticno.

Export: `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB',
export_draco_mesh_compression_enable=True, export_yup=True, export_apply=True,
export_cameras=False, export_lights=False, export_animations=False)`

Provera fajla: `npx gltf-transform inspect public/models/bocica.glb` -
<= 40k trouglova, <= 500 KB, meshevi Glass / Liquid / Cap postoje pod tim imenima.

Ucitavanje: drei `useGLTF` sa Draco dekoderom. Dekoder kopiraj u `public/draco/` iz
`node_modules/three/examples/jsm/libs/draco/gltf/` i pokazi `useGLTF.preload` na njega -
ne oslanjaj se na CDN. Boju tecnosti postavlja kod: nadji mesh po imenu `Liquid` i
lerp-uj `material.color` na hex - ista logika kao u BottleScene.tsx.

**FALLBACK JE OBAVEZAN:** ako Blender nije nadjen, skripta padne, ili inspect ne prolazi
budzet posle 2 pokusaja - koristi PROCEDURALNU bocicu iz koraka 08 i upisi u
docs/STATUS.md zasto. Hero ne sme da ceka na Blender.

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


## H. LOGO KOJI PUTUJE U NAVIGACIJU — vraca se, ali BEZ PINA
Klijent: "onaj fazon sa logom sto iz heroja prelazi u nav bar mi se svidjao".
Efekat je bio dobar; PIN je bio problem. Vracamo efekat, pin ne.
- Scrub-driven tween na hero sekciji (isti trigger kao bocica, `start: "top top"`,
  `end: "bottom top"`, `scrub: 1`). Nista se ne pinuje, layout se ne menja.
- Wordmark u heroju je `position: relative`, animira se SAMO `transform` (translate + scale)
  ka poziciji logo slota u navigaciji. Poziciju slota izmeri jednom na mount i na resize
  (`getBoundingClientRect` slota u nav-u, koji je uvek prisutan ali `opacity: 0`).
- 0.00-0.70: wordmark putuje i skuplja se ka slotu. 0.70-0.85: crossfade — wordmark u
  heroju ide na opacity 0, logo u nav-u na opacity 1. Posle 0.85 hero wordmark je
  `visibility: hidden` da ne hvata klikove.
- Bez GSAP Flip plugina — obican tween sa izmerenim delta vrednostima je predvidljiviji.
- NE dirati opacity teksta ispod wordmark-a (reveal sistem ga drzi).
- Ako izazove bilo koje odstupanje u proveri G (pin-spacer, pending, nevidljivo) — izbaci
  ga i prijavi. Bocica i shader imaju prednost.

## I. NAVIGACIJA — pozadina i mobilni meni
- Desktop: kad je hero u kadru, nav je providan preko shadera. Kad hero izadje (isti
  scrub progres > 0.85) ILI na svakoj strani koja nije landing (/shop, /nalog, /korpa...),
  nav dobija frosted podlogu: `background: rgba(paper, .82)` + `backdrop-filter: blur(12px)`
  + 1px linija ispod. Sada na /shop sadrzaj strane proviruje kroz nav — to ne sme.
- **Mobilni meni je los** (screenshot klijenta: providan, hero se vidi kroz linkove, sve
  se preklapa). Novi meni:
  - puni ekran, NEPROVIDNA paper podloga (ne glass — ispod je shader, glass je necitljiv)
  - ulaz: podloga klizi odozgo 320 ms, linkovi ulaze stagger 45 ms odozdo (GSAP, ne
    text-reveal — meni je chrome, `data-reveal="off"`)
  - linkovi krupni (28 px), sa brojem u sivom pored Cenovnika ("144") i Shopa ("70")
  - dno: telefon oba lokala kao dugmad, IG/FB ikone, prekidac teme
  - body scroll lock dok je otvoren; zatvara se na klik linka, Escape, i promenu rute/hash-a
  - dugme X animira iz hamburgera (dve linije → X), 44x44 tap target
- Nav logo ostaje wordmark ~30 px (korak 10), na <400 px mark 44 px.

## J. HERO — citljivost teksta
Shader je jak iza pasusa. Iza kolone sa copy-jem (levo) ide mek scrim:
`radial-gradient` od `paper` alfa .55 u centru kolone ka 0 na ivicama, ~120% sirine
kolone. Naslov i pasus moraju da prodju AA na najsvetlijem delu shadera.
Bez tvrdih ivica, bez kutije — treba da izgleda kao da je lak tu tanji.

## K. bbm-24 IZLAZI IZ ShopHighlights
`components/sections/ShopHighlights.tsx:32` — `const WALL = photoById("bbm-24")` je
baner sa promo tekstom "SAJAMSKI POPUST". Klijent: "necu da je vidim na sajtu".
Zameni sa placeholder-om dok ne stigne generisana slika:
- ako postoji `public/photos/zid-lakova-1350.avif` → koristi nju (klijent ce je generisati)
- inace → kompozicija od 12 ProductSwatch kapi (bestselleri, mesano ORLY/ENTITY) na
  mint-wash podlozi, blago rasute kao prosute kapi, sa naslovom sekcije preko.
  Izgleda namerno, ne kao rupa.

## G. PROVERA — 1920, 1440, 390
1. `.pin-spacer` === 0, skrol stize do dna, reveal provera iz MOTION.md === 0
2. na 1920: bocica vidljiva desno, pri skrolu se naginje i pozadina se puni mint bojom
3. na 390: canvas ne postoji, copy puna sirina, nista ne viri
4. `document.querySelectorAll('canvas').length === 1` na desktopu
4b. ako je GLB: `gltf-transform inspect` prolazi budzet; bocica ima kvadratno zaobljeno telo, ne okruglo
5. logo putuje u nav bez pin-spacer-a; posle 85% hero wordmark je skriven, nav logo vidljiv
6. /shop: nav ima frosted podlogu, nista ne proviruje kroz nju
7. 390 px: mobilni meni neprovidan, linkovi ulaze stagger, body ne skroluje dok je otvoren
8. bbm-24 se ne pojavljuje NIGDE: `grep -rn "bbm-24" components app` vraca samo komentare
9. typecheck, lint, test, build; bundle delta prijavljen
