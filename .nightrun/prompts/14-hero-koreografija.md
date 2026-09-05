ultrathink

Hero koreografija v3. Korak 13 radi (zona, sticky hold, scrub, boje, IG nav) — arhitektura
OSTAJE. Menja se SAMO sta se desava: logo i bocica su „basic" (pravougaonik koji klizi;
zatvorena bocica se nagne, kap ispadne iz zatvaraca, pa scale+fade). Uradi ovo kao motion
dizajner, ne kao inzenjer.

PRVO PROCITAJ u celosti:
  .nightrun/specs/14-hero-koreografija.md   <- A logo, B bocica, C bug, D provera
  docs/STATUS.md (Korak 13), docs/MOTION.md, CLAUDE.md
  components/hero/Hero.tsx, lib/heroChoreography.ts, lib/logoTravel.ts,
  components/brand/{Logo,LogoSignature}.tsx, components/three/HeroBottle.tsx, scripts/bottle.py

SKILLS: motion-design, gsap-scrolltrigger, threejs-interaction, threejs-lighting, 3d-scrollytelling

TVRDA PRAVILA (kao 13): BEZ pina, BEZ Flip plugina, BEZ zakljucavanja skrola. Jedan scrub,
sve cista funkcija p, reload usred zone = isto stanje. Samo transform/opacity/uniformi.
convex/ se ne dira. Reveal ugovor ostaje. Provera pravim tockicem. Budzeti iz speca 0.

STA SE PRAVI, redom:
A - LOGO SE PREPISUJE (spec A):
  A1 BEAUTY slovo po slovo: 6 glifova, svaki svoj transform iz izmerenih rectova (hero glif i
     -> nav glif i), blago zakrivljena putanja, stagger 0.015 po slovu (0.06 -> ~0.32),
     overshoot 1.04 na sletanju; nav se SASTAVLJA s leva na desno, nikad dva ista slova vidljiva.
  A2 Potpis „by Masha": hero rukopis se BRISE stroke-dashoffset-om unazad 0.10-0.26, nav
     rukopis se PISE 0.24-0.36 (isti mehanizam kao intro u LogoSignature, vozen p-om). Tacka
     tinte 6px putuje od repa hero potpisa do glave nav potpisa pa jase na frontu pisanja
     (getPointAtLength + getScreenCTM). Intro potpisa, ako jos traje, prekida se kad p krene.
  A3 Frost se pali IZ SLOTA: clip-path inset s leva na desno 0.30-0.42.
  A4 Copy se preslaze nagore u prostor wordmarka 0.06-0.30 (stagger po elementu), nista ne
     bledi do 0.55.
  A5 Copy izlazi rec po rec 0.55-0.80 (revealWords spanovi, stagger od poslednje ka prvoj).
B - BOCICA SE OTVARA I SPUSTA (spec B):
  B0 Blender MCP (Blender otvoren, server 9876; `scripts/bottle.py` -> `build()`): dodaj
     `BrushStem` + `BrushHair` kao DECU `Cap`, re-export GLB, <=40k trouglova, <=500KB, inspect.
  B1 Idle: + orbita rim svetla (specular sweep jednom po hold-u boje, fazno uz crossfade),
     pointer vozi key svetlo ±15%, hover dize zatvarac 0.15 (opruga).
  B2 0.04-0.22 OTVARANJE: fov 30->27, yaw u 3/4; Cap+cetkica se odvrcu 720° dok dlacice ne
     izadju iz vrata +0.3 (iz geometrije). Telo ostaje uspravno.
  B3 0.22-0.42 KAP SA CETKICE: cap+cetkica ulevo 12% kadra, nagib -25°, kap raste na vrhu
     dlacica 0.24-0.32, pada do 0.42, uPourOrigin = tacka izlaska. Stara kap se uklanja.
  B4 Razlivanje kao sad + envMapIntensity 0.6->0.9->0.6 dok front prolazi.
  B5 0.58-1 ZATVARANJE I POLICA: zatvarac nazad 0.58-0.74; od 0.62 baza bocice prati gornju
     ivicu `.hero-overlap` (overlapTop = H·(1-p)), scale 1->0.55, x ka 70%; bocica STOJI na
     ivici sledece sekcije i odlazi sa njom. Bez opacity fade-a. Meka kontakt senka od 0.70.
C - BUG: u tamnoj temi na 769-1023 papirni veo je siva mrlja preko tamne podloge. Proveri
  sve tri grane u obe teme; podloga heroja svetla svuda ILI veo prati temu. Bez mrlje.
D - PROVERA po specu D (1440 i 390): slova (0.12/0.20/0.28), potpis + tacka tinte, frost
  clip, reflow h1, otvaranje (dlacice iznad vrata na 0.22, 720°), kap sa dlacica, polica
  (0.70/0.85/0.95 unutar 8px), reload na 0.5 i 0.8, pin-spacer 0, reveal 0 pending, tamna
  tema bez mrlje, perf p95 <= 17ms, inspect GLB, typecheck+lint+test+build. Tabela u STATUS.
E - docs/MOTION.md „Hero v3", STATUS.md vrh. Commit na tekucoj grani
  "korak 14: logo se prepisuje, bocica se otvara i spusta" + git push te grane. Bez convex deploy.

Dev server: ako 3001 ne odgovara - `npm run dev -- -p 3001`.
Ako nesto ne moze bez pina/locka ili preko budzeta - NE radi ga, upisi u STATUS zasto.
Odstupanja od slova speca su dozvoljena kad su BOLJA — svako upisi sa razlogom.
