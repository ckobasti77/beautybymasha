# Korak 09 — popravke posle prvog pregleda na produkciji

Nalaz je sa **https://beautybymasha-mu.vercel.app na 1920×911**. Provere iz koraka 07
su radjene na 1440 i 390 px, pa je 1920 ostao neproveren — i tamo puca.

## A. TRI BUGA (prioritet, ovim redom)

### A1. Text reveal ostavlja 143 elementa zauvek nevidljiva  ← NAJTEZE
Mereno na produkciji, posle pravog skrola misem do scrollY=1000:
```
nevidljivih elemenata sa tekstom: 160
[data-reveal-state="pending"]: 143
[data-reveal-state="done"]:      2
.reveal-word:                    0
```
`.reveal-word` je 0 znaci da se splitovanje NIKAD nije desilo — CSS je sakrio copy pre
prvog paint-a, a IntersectionObserver ga nije vratio. Stranica se cita kao prazna.
Sekcija Zakazivanje (y=2854) je bela povrsina iako je cela izgradjena i radi.

Uzrok istraziti, ne pogadjati. Sumnja ide na: observer `once` + Lenis + pinovan hero
(1 `.pin-spacer`) — dok je hero pinovan, sekcije ispod ne udju u root observera,
a kad udju, callback vise ne stigne.

Obavezno, bez obzira na uzrok — **sigurnosna mreza**:
- ako element nije otkriven do trenutka kad mu je `getBoundingClientRect().top < innerHeight`,
  otkriva se odmah, bez animacije
- `window.load` + `resize` + `orientationchange` ponovo prolaze kroz sve `pending`
- posle 3 s od ucitavanja, svaki `pending` koji je iznad preloma se otkriva
Pravilo: **niko ne sme da ostane sakriven. Bolje bez animacije nego nevidljivo.**

### A2. Hero shader se renderuje kao ravna krem povrsina
`<canvas>` postoji, 1447×692, `opacity: 1`, `visibility: visible` — ali izlaz je
prakticno beo. Efekat "tecnog laka" se ne vidi uopste.
Pojacati kontrast i zasicenost izlaza shadera: mint mora da se VIDI, specular potez
mora da se prepozna kao mokar lak. Proveri screenshotom na 1920, 1440 i 390 px.

### A3. Pinovan hero = tri ekrana prazne kreme
Stranica je 13436 px. Hero je pinovan i traje ~1 pun ekran skrola, a copy odleti u
navigaciju na 15%, pa ostatak pina korisnik gleda praznu krem povrsinu.
To je ono sto klijent zove "scrolling tango" i ne svidja mu se.

**Skrati drasticno:** pin traje najvise 60% visine ekrana, wordmark→logo Flip zavrsava
do 35%, i tokom celog pina u kadru MORA biti neceg zivog (shader ili prvi red usluga
koji se penje odozdo). Ako to ne moze da se odrzi — **skloni pin skroz** i ostavi samo
parallax na shaderu. Bolje bez efekta nego prazan ekran.

## B. LOGO — wordmark je slomljen
Rukopis "by Masha" prelazi preko celog "BEAUTY" i secene su mu ivice.
U originalu (njena profilna slika) rukopis stoji ISPOD reci BEAUTY, poravnat levo,
i samo mu gornje petlje blago dodiruju donju ivicu slova. Popravi razmeru i poziciju:
rukopis je oko 38% sirine wordmark-a, spusten ispod, blago rotiran (-4 stepena).

## C. SWATCH-EVI — "kap laka na stolu", ne ravan krug
Klijent trazi da boje izgledaju kao **kap laka izlivena na sto i fotografisana**,
a ne kao flat krug. Uradi CIST CSS/SVG, bez slika (mora da radi za svih 70 boja,
ukljucujuci 20 ENTITY koji nemaju fotografiju):
- blago nepravilan oblik (border-radius sa cetiri razlicite vrednosti), ne savrsen krug
- radijalni gradijent: svetliji gore-levo, tamniji dole-desno (dubina tecnosti)
- ostar mali specular odsjaj gore-levo (bela, ~12% precnika, blur 1px)
- mek sirok odsjaj po gornjoj ivici (unutrasnja senka, bela, mali alfa)
- meka senka ispod kapi na podlozi (`box-shadow`, u tonu boje, ne crna)
- tanak taman obod na dnu (kap ima debljinu)
- hover: gloss sweep vec postoji — zadrzi ga, samo neka klizi preko ovog reljefa
Primeni na shop kartice, detalj proizvoda, ORLY sekciju na landingu i admin.

## D. FOTOGRAFIJE
- **Izbaci `bbm-24`** iz galerije. To je promo objava sa tekstom "SAJAMSKI POPUST
  OD 10 DO 50%" preko slike — reklama, ne rad. U `data/photos.json` stavi `"use": []`.
- **`bbm-10` (tim, sest zena u crnom) zasluzuje svoje mesto.** Napravi sekciju
  **"Nas tim"** izmedju Radova i ORLY sekcije: fotografija kao `card` varijanta
  (crop je odsekao pola tima), naslov, dve recenice o salonu, bez izmisljenih imena.
  Tekst kroz skill `humanizer`, nista se ne izmislja — sve nepoznato je [POTVRDITI].

## E. PROVERA PRE "GOTOVO"
Na **1920, 1440 i 390 px**, na produkciji posle deploya:
1. skrol s kraja na kraj, pa u konzoli mora da vrati 0:
   `[...document.querySelectorAll('*')].filter(e=>e.offsetParent&&e.textContent.trim()&&getComputedStyle(e).opacity==='0').length`
2. `document.querySelectorAll('[data-reveal-state="pending"]').length` === 0 na dnu
3. nijedan ekran skrola bez sadrzaja u kadru
4. shader se vidi na 1920 i 1440, nema ga na 390
5. typecheck, lint, test, build
