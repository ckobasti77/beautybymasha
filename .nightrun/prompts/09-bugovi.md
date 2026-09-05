ultrathink

Tri buga zbog kojih se sajt na sirokom ekranu cita kao PRAZAN. Sve je izgradjeno i
radi, ali se ne vidi. Ovo je jedini prioritet - lepota ide u sledecem koraku.

PRVO PROCITAJ u celosti:
  .nightrun/specs/09-popravke.md   <- sekcija A, tu su merenja
  docs/MOTION.md                   <- ceo, ugovor o dva sistema animacije
  CLAUDE.md

SKILLS: text-reveal, gsap-scrolltrigger, gsap-plugins, gsap-performance, threejs-shaders

Mereno na https://beautybymasha-mu.vercel.app na 1920x911, posle pravog skrola misem:

A1 - TEXT REVEAL (najteze)
  nevidljivih elemenata sa tekstom: 160
  data-reveal-state="pending":      143
  data-reveal-state="done":           2
  .reveal-word:                       0
  `.reveal-word` = 0 znaci da se splitovanje NIKAD nije desilo. CSS je sakrio copy
  pre prvog paint-a, IntersectionObserver ga nije vratio. Sekcija Zakazivanje
  (y=2854) je bela povrsina iako je cela izgradjena i backend radi.
  Provere iz koraka 07 su radjene na 1440 i 390 px - 1920 nikad nije proveren.
  Nadji PRAVI uzrok (sumnja: observer `once` + Lenis + pinovan hero, 1 .pin-spacer),
  ali obavezno dodaj i sigurnosnu mrezu iz spec-a. Pravilo: niko ne sme da ostane
  sakriven. Bolje bez animacije nego nevidljivo.

A2 - HERO SHADER se renderuje kao ravna krem povrsina.
  Canvas postoji: 1447x692, opacity 1, visibility visible - ali izlaz je prakticno
  beo. Efekat "tecnog laka" se ne vidi. Pojacaj kontrast i zasicenost izlaza:
  mint mora da se VIDI, specular potez mora da se prepozna kao mokar lak.

A3 - PINOVAN HERO daje tri ekrana prazne kreme.
  Stranica je 13436 px. Hero je pinovan ~1 pun ekran skrola, copy odleti u navigaciju
  na 15%, a ostatak pina korisnik gleda praznu krem povrsinu. Klijent je to izricito
  prijavio kao smetnju.
  Skrati: pin najvise 60% visine ekrana, Flip zavrsava do 35%, i tokom CELOG pina
  nesto zivo mora biti u kadru. Ako to ne moze - skloni pin skroz i ostavi samo
  parallax na shaderu. Bolje bez efekta nego prazan ekran.

PROVERA, obavezno na 1920, 1440 i 390 px, i na produkciji posle deploya:
1. skrol s kraja na kraj, pa u konzoli mora da vrati 0:
   [...document.querySelectorAll('*')].filter(e=>e.offsetParent&&e.textContent.trim()&&getComputedStyle(e).opacity==='0').length
2. document.querySelectorAll('[data-reveal-state="pending"]').length === 0 na dnu
3. nijedan ekran skrola bez sadrzaja u kadru
4. shader se vidi na 1920 i 1440, nema ga na 390
5. npm run typecheck && npm run lint && npm test && npm run build

Ne izmisljaj podatke o klijentu - nepoznato je [POTVRDITI].
PREGLED U BROWSERU: pokreni `npm run dev -- -p 3001`, proveri, pa ga UGASI pre kraja.
