ultrathink

Korak 09 je pisao kod ali NIJE popravio nijedan od tri buga. Sajt se i dalje ne vidi,
a sada se posle skrola i raspada. Demo je danas. Idemo na sigurno.

PRVO PROCITAJ u celosti:
  .nightrun/specs/10-hero-reset.md   <- merenja, dijagnoza i sve sto treba
  docs/MOTION.md, CLAUDE.md, docs/BRAND.md

SKILLS: text-reveal, gsap-scrolltrigger, gsap-performance, threejs-fundamentals, humanizer

Mereno na localhost:3001, 1920x911, sa kodom iz koraka 09:
  scrollY se ZAGLAVI na 4200 iako do dna ima 12070
  nevidljivo: 189   pending: 145   done: 0   revealWord: 25
  canvas: 300x150 (HTML podrazumevana), a roditelj mu je 1905x911
  posle skrola navbar zavrsi nasred strane i sekcije se preklapaju

DIJAGNOZA: sve tri stvari vode na hero pin. `.pin-spacer` pomera sve sekcije ispod
sebe, njihovi ScrollTrigger-i se racunaju pre nego sto spacer postoji, nikad ne okinu,
pa kontejneri ostanu opacity 0. `ScrollTrigger.refresh()` na load je zakrpa koja
razbija poziciju pina usred Lenis skrola.

A - SKLONI PIN. Bez pregovora, ovo je glavni zadatak.
    Izbaci ScrollTrigger pin iz heroja i izbaci GSAP Flip wordmark->logo.
    Hero postaje obicna sekcija 100svh: shader kao pozadina, copy preko njega.
    Navigacija dobija logo obicnim opacity prelazom kad hero izadje iz kadra.
    Jedini scroll efekat koji sme da ostane je blagi parallax na shaderu (scrub, bez pina).
    Posle: document.querySelectorAll('.pin-spacer').length === 0
    Ovo je namerno korak unazad u efektima. Sajt koji se vidi pobedjuje sajt sa
    efektom koji ga lomi. Klijent je pin ionako prijavio kao smetnju.

B - CANVAS je 300x150 pa shader nista ne crta. Nadji zasto u components/hero/
    LiquidCanvas.tsx i popravi da prati roditelja i na resize. Posle: canvas.width > 1000
    na 1920 px. Kad dobije velicinu, proveri da se mint STVARNO vidi.

C - REVEAL: sigurnosna mreza iz koraka 09 ostaje. Bez pina bi trebalo da radi.
    Ako `done` i dalje ostaje 0, timeline se ne zavrsava - proveri gsap.ticker.

D - LOGO: rukopis "by Masha" prelazi preko celog "BEAUTY". Treba ispod, levo poravnat,
    oko 38% sirine wordmark-a, rotiran -4 stepena.

E - NAV LOGO je premali (mark 36 px, tekst necitljiv). Klijent: povecaj SAMO logo,
    visina navigacije ostaje ista. U nav koristi variant="wordmark" visine ~30 px;
    na <400 px mark od 44 px. Footer ne diraj.

F - FOTOGRAFIJE: izbaci bbm-24 iz galerije (reklama sa tekstom preko slike).
    Napravi sekciju "Nas tim" sa bbm-10 kao card varijantom. Ne izmisljaj imena.

REDOSLED JE OBAVEZAN: A i B pa C, tek onda D, E, F. Swatch-evi i cenovnik su korak 11 - ne diraj ih ovde. Ako ponestane vremena,
D/E/F mogu da sacekaju - A/B/C ne mogu.

PROVERA na 1920, 1440 i 390 px, svih sedam tacaka iz spec-a, sekcija G.
Plus typecheck, lint, test, build.
Sav srpski tekst koji sam pises kroz skill humanizer.
PREGLED: `npm run dev -- -p 3001`, proveri STVARNO u browseru, pa ga ugasi pre kraja.
