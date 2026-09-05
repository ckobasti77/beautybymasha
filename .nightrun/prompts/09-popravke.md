ultrathink

Popravke posle prvog pregleda sajta na produkciji. Sve je izgradjeno i radi, ali se
na sirokom ekranu ne VIDI — stranica se cita kao prazna.

PRVO PROCITAJ u celosti:
  .nightrun/specs/09-popravke.md   <- nalaz sa merenjima i sta tacno treba
  docs/MOTION.md                   <- ugovor o dva sistema animacije
  CLAUDE.md, docs/BRAND.md

SKILLS: text-reveal, gsap-scrolltrigger, gsap-plugins, gsap-performance,
threejs-shaders, humanizer

Redosled je obavezan, prvo tri buga pa tek onda lepota:

A1 - TEXT REVEAL. Na produkciji, posle skrola misem, 143 elementa ostaju
     data-reveal-state="pending" i 160 elemenata sa tekstom ima opacity 0.
     .reveal-word je 0, dakle splitovanje se nikad nije desilo.
     Sekcija Zakazivanje je bela povrsina iako je cela izgradjena.
     Nadji pravi uzrok, ali OBAVEZNO dodaj i sigurnosnu mrezu iz spec-a:
     niko ne sme da ostane sakriven. Bolje bez animacije nego nevidljivo.

A2 - HERO SHADER se renderuje kao ravna krem povrsina. Canvas postoji i vidljiv je,
     ali izlaz je prakticno beo. Mint mora da se vidi.

A3 - PINOVAN HERO daje tri ekrana prazne kreme. Skrati pin ili ga skloni.
     Klijent je to izricito prijavio kao smetnju.

B  - LOGO: rukopis "by Masha" prelazi preko celog "BEAUTY". Treba ispod, levo poravnat.

C  - SWATCH-EVI: boje moraju da izgledaju kao kap laka izlivena na sto i fotografisana,
     ne kao flat krug. Cist CSS/SVG, bez slika - mora da radi i za 20 ENTITY boja.

D  - FOTOGRAFIJE: izbaci bbm-24 iz galerije (to je reklama sa tekstom preko slike).
     Napravi sekciju "Nas tim" sa bbm-10 kao card varijantom.

Ne izmisljaj podatke o klijentu - nepoznato je [POTVRDITI].
Sav srpski tekst koji sam pises kroz skill humanizer.

PROVERA: na 1920, 1440 i 390 px. Skripta iz spec-a mora da vrati 0 nevidljivih
elemenata i 0 pending. Plus typecheck, lint, test, build.
