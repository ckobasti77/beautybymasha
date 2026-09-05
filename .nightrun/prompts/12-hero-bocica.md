ultrathink

Desna polovina heroja je prazna. Tu ide 3D bocica laka koja na skrol sipa mint u pozadinu.
Ovo je poslednji korak pred demo — ako ne prodje provere, vraca se na stanje iz koraka 11.

PRVO PROCITAJ u celosti:
  .nightrun/specs/12-hero-bocica.md   <- koreografija, budzet, prekidac
  components/three/BottleScene.tsx, bottleGeometry.ts, BottleShowcase.tsx   <- vec postoje
  components/hero/   <- shader canvas iz koraka 10, bez pina
  docs/MOTION.md, data/design-dna.json (visual_effects), CLAUDE.md

SKILLS: threejs-fundamentals, threejs-materials, threejs-lighting, threejs-interaction,
threejs-shaders, gsap-scrolltrigger, gsap-performance, 3d-scrollytelling

STA SE PRAVI:
- Bocica iz koraka 08 (proceduralna, mesh Liquid, hex boja) ulazi u hero, desna polovina,
  ~62% visine heroja, tecnost brend mint #57BFA8.
- JEDAN canvas: shader plane pozadi + bocica ispred. Ne dva WebGL konteksta.
- Idle: lebdenje i blagi yaw. Pointer parallax ±6°, lerp 0.05, gasi se na touch.
- Scroll, scrub BEZ PINA: 0-35% bocica se naginje ka copy-ju kao da sipa; 25-70% shader
  uniform uPour raste i mint se RAZLIVA po pozadini odozgo-desno ka dole-levo;
  55-100% bocica se smanjuje, drift ka centru, opacity → 0. Copy ne diraj.
- Fallback: <1024 px ili reduced-motion ili bez WebGL2 → bocice nema, canvas se ne
  montira, copy puna sirina. Rezervisano mesto dok se canvas ucitava, bez skoka.
- Budzet: dpr [1,1.5], frameloop demand van kadra, bez senki i postprocessinga,
  hero bundle +≤60 KB gzip (izmeri sa scripts/measure-bundle.mjs).

PREKIDAC: ako posle 2 pokusaja provere ne prolaze — git checkout hero fajlova na stanje
iz koraka 11, upisi u docs/STATUS.md. Bolje bez bocice nego hero koji stucka.

PROVERA na 1920, 1440, 390 (spec, sekcija G): .pin-spacer === 0, skrol do dna,
reveal provera iz MOTION.md === 0, tacno 1 canvas na desktopu i 0 na 390,
bocica se vidi i naginje pri skrolu, pozadina se puni mint bojom.
Plus typecheck, lint, test, build, bundle delta.

PREGLED: `npm run dev -- -p 3001`, proveri STVARNO u browseru, pa ga ugasi pre kraja.
