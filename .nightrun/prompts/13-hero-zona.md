ultrathink

Hero v2 + navigacija koja je UVEK ispred svega. Korak 12 je gotov (docs/STATUS.md);
ovo ga nadogradjuje, ne rusi.

PRVO PROCITAJ u celosti:
  .nightrun/specs/13-hero-zona.md   <- sve brojke, redosled A-K, provera J
  docs/STATUS.md (Korak 12), docs/MOTION.md, CLAUDE.md
  components/hero/*, components/site/SiteNavClient.tsx, lib/heroChoreography.ts

SKILLS: gsap-scrolltrigger, gsap-performance, threejs-shaders, threejs-interaction,
3d-scrollytelling, liquid-glass

TVRDA PRAVILA (krsenje = korak pao):
- BEZ pina, BEZ Flip-a, BEZ zakljucavanja skrola (nikakav lenis.stop / overflow:hidden van
  otvorenog menija, nikakav wheel preventDefault ili timeout koji "pusti" skrol).
  "Zadrzavanje" u heroju = CSS sticky + JEDAN scrub ScrollTrigger (spec C). Sve je cista
  funkcija napretka p; reload usred heroja daje isto stanje kao skrol do te tacke.
- Ne diraj convex/. Frontend korak, bez convex deploy.
- Reveal ugovor iz docs/MOTION.md ostaje; hero ostaje data-reveal="off".
- Provera SAMO pravim tockicem (Playwright mouse.wheel). window.scrollBy laze uz Lenis.

STA SE PRAVI, redom (svaki korak proveri pre sledeceg):
A - Z-SKALA: nav z-[100], dijalozi 110, toast 120, skip-link 130, ostalo <= 40. Nav bez
  predaka sa transform/filter. Nista sa navigacije nije iza bilo cega, nikad.
B - INSTAGRAM NAV: sakriva se na skrol dole (>= 24px, scrollY > 120), izlazi na bilo koji
  skrol gore. NIKAD sakriven dok je hero u kadru (p < 1), dok je meni otvoren ili fokus u
  nav-u. Samo transform, 320/240ms. Blagi glass (.nav-frost) od p >= 0.30 na landingu,
  uvek na ostalim stranama. p dolazi iz novog lib/heroProgress.ts (store); IO za frost
  izlazi. --nav-h + scroll-margin-top na section[id].
C - HERO ZONA: sekcija 170vh (mobilni 130vh), unutra sticky "stage" 100dvh. Jedan
  ScrollTrigger top top -> bottom top, scrub. Do HOLD_END=(H-vh)/H (~0.41) hero fizicki
  miruje. Preslozi koreografiju iz 12 na tabelu speca C: logo 0.04-0.30, crossfade+frost
  0.30-0.36, nagib 0.06-0.30, kap 0.18-0.40, razlivanje 0.36-0.78, copy 0.55-0.85, izlaz
  bocice 0.60-1, lag HOLD_END-1.
D - BOJE: tecnost ciklira 5 bestselera iz speca D (hex sa servera kroz prop): hold 3.5s,
  crossfade 1s. Prvi pomak skrola (p > 0.01) HVATA trenutnu boju: ciklus staje, boja ide u
  uPourColor. p < 0.01 -> ciklus nastavlja od uhvacene.
E - KAP I RAZLIVANJE: pri nagibu na vratu raste kap (0.18-0.30), otkaci se i pada do dna
  kadra (0.30-0.40); tacka izlaska = uPourOrigin; shader RADIJALNO razliva uhvacenu boju
  (25% minta ostaje), stari front se uklanja. --hero-ink po luminanci uhvacene boje.
F - GAMIFIKACIJA, malo: hover cursor + scale 1.03, klik wobble + slosh. Nivo tecnosti =
  svetski horizontalna clipping ravan (ravna povrsina dok se bocica naginje); Liquid mesh
  = puna unutrasnjost.
G - PARALLAX PREKLOP: sledeca sekcija relative z-10, neprovidna, rounded-t + senka; stage
  y 0 -> +40vh preko p HOLD_END..1.
H - MOBILNI: WebGL <= 768 ostaje iskljucen (ADR-005). Umesto bocice velika ProductSwatch
  kap koja ciklira iste boje i na skrol se prosipa u CSS pour. Reduced motion: zona
  100vh, bez holda, staticno.
I - GLB IZ BLENDERA: tek kad A-H prodju, najvise 60 min, po specu 12 "MODEL IZ BLENDERA"
  (Liquid = puna unutrasnjost). Ne prodje -> proceduralna ostaje, razlog u STATUS.
J - PROVERA po specu (1440 i 390): elementFromPoint na linkovima, pin-spacer 0, hold
  (stage top === 0 do 40vh), nav tajming, window.__bbmHero (samo dev), reload usred heroja,
  reveal 0 pending na dnu, 390 bez prekoracenja, perf p95 <= 17ms, typecheck + lint + test
  + build. Tabela u STATUS.
K - docs/MOTION.md (Hero v2, Z-skala, Navigacija), STATUS.md na vrh, BRIEF.md [POTVRDITI]
  boje i 3D na telefonu. Commit na TEKUCOJ grani "korak 13: hero zona, IG nav, boje laka"
  + git push te grane. Ne menjaj granu.

Dev server: ako localhost:3001 ne odgovara - `npm run dev -- -p 3001`.
Ako nesto ne moze bez pina/locka - NE radi ga, upisi u STATUS zasto.
