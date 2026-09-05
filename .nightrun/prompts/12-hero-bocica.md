ultrathink

Hero dobija 3D bocicu na desnoj strani, logo koji putuje u navigaciju (bez pina),
i cistu navigaciju - desktop i mobilnu. Poslednji veliki korak pred demo.

PRVO PROCITAJ u celosti:
  .nightrun/specs/12-hero-bocica.md   <- koreografija, budzet, prekidac, sekcije A-K
  components/three/BottleScene.tsx, bottleGeometry.ts, BottleShowcase.tsx   <- postoje
  components/hero/, components/site/SiteNav.tsx
  docs/MOTION.md, data/design-dna.json (visual_effects), CLAUDE.md

SKILLS: threejs-fundamentals, threejs-materials, threejs-lighting, threejs-interaction,
threejs-loaders, threejs-shaders, gsap-scrolltrigger, gsap-performance, 3d-scrollytelling

STA SE PRAVI, redom:

0 - MODEL: napravi bocicu u BLENDERU, headless (`blender -b -P scripts/bottle.py`),
  po specu "MODEL IZ BLENDERA": zaobljeno KVADRATNO telo (ne okruglo - proceduralna iz
  koraka 08 je lathe i lici na parfem), tanak vrat, zdepast zatvarac sa zljebovima,
  meshevi tacno `Glass` / `Liquid` / `Cap`, Draco GLB <= 500 KB, dekoder u public/draco/.
  Ako Blender ne radi ili budzet ne prolazi posle 2 pokusaja → proceduralna bocica iz
  koraka 08, upisi zasto. Hero ne sme da ceka na Blender.

A/B/C - BOCICA U HEROJU (spec A-E): desna polovina, ~62% visine, tecnost mint #57BFA8
  (kod menja boju mesha `Liquid`). JEDAN canvas sa shaderom. Idle lebdenje + pointer
  parallax. Scroll scrub BEZ PINA: 0-35% naginje se ka copy-ju, 25-70% shader uPour raste
  i mint se razliva po pozadini, 55-100% bocica se smanjuje i nestaje.
  <1024 px / reduced-motion / bez WebGL2 → bocice nema, copy puna sirina.

H - LOGO PUTUJE U NAV, ali BEZ PINA i BEZ Flip plugina: scrub tween samo na transform,
  izmerena pozicija nav slota, crossfade na 70-85%. Klijentu se efekat svidjao - vracamo
  efekat, ne bug. Ako izazove pin-spacer/pending/nevidljivo - izbaci i prijavi.

I - NAVIGACIJA: frosted podloga kad hero izadje i na svim ne-landing stranama (na /shop
  sad sadrzaj proviruje kroz nav). MOBILNI MENI ispocetka: pun ekran, NEPROVIDNA paper
  podloga, linkovi stagger 45 ms, telefoni oba lokala na dnu, scroll lock, hamburger→X.
  Sadasnji je providan i hero se vidi kroz linkove - to je bug koji je klijent prijavio.

J - SCRIM iza copy kolone u heroju: mek radial paper alfa .55 → 0, da pasus prodje AA.

K - bbm-24 NAPOLJE iz ShopHighlights.tsx (hardkodovan WALL baner sa promo tekstom).
  Ako postoji public/photos/zid-lakova-1350.avif koristi nju; inace kompozicija od
  12 ProductSwatch kapi na mint-wash podlozi. `grep -rn bbm-24 components app` mora
  da vrati samo komentare.

PREKIDAC: bocica i logo-putovanje su efekti. Ako posle 2 pokusaja provera G ne prolazi,
git checkout tih fajlova na stanje iz koraka 11, upisi u docs/STATUS.md. Nav (I), scrim (J)
i bbm-24 (K) NISU efekti - oni moraju da udju bez obzira.

PROVERA na 1920, 1440, 390 - svih 9 tacaka iz spec-a G. Reveal proveru radi PRAVIM
tockicem misa ili computer.scroll, ne window.scrollBy (Lenis daje lazno negativno).
Plus typecheck, lint, test, build, bundle delta.
PREGLED: `npm run dev -- -p 3001`, proveri STVARNO u browseru, pa ga ugasi pre kraja.
