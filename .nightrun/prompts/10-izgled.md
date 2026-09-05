ultrathink

Vizuelne popravke posle prvog pregleda kod klijenta. Bugovi su resnji u koraku 09 -
sajt se sada vidi. Sad treba da izgleda skupo.

PRVO PROCITAJ u celosti:
  .nightrun/specs/09-popravke.md   <- sekcije B, C i D
  docs/BRAND.md, data/design-dna.json, docs/MOTION.md, CLAUDE.md

SKILLS: humanizer, gsap-react, text-reveal

B - LOGO je slomljen.
  Rukopis "by Masha" prelazi preko celog "BEAUTY" i secene su mu ivice.
  U njenom originalu (mint krug, profilna slika na Instagramu) rukopis stoji ISPOD
  reci BEAUTY, poravnat levo, i samo mu gornje petlje blago dodiruju donju ivicu
  slova. Popravi razmeru i poziciju: rukopis je oko 38% sirine wordmark-a, spusten
  ispod, blago rotiran oko -4 stepena. Proveri u sve tri varijante (full, mark,
  wordmark), u obe teme, i u navigaciji gde je mali.

C - SWATCH-EVI: "kap laka na stolu", ne flat krug.
  Klijent trazi da boja izgleda kao kap laka IZLIVENA NA STO I FOTOGRAFISANA.
  Uradi cist CSS/SVG, BEZ slika - mora da radi za svih 70 boja, ukljucujuci
  20 ENTITY nijansi koje uopste nemaju fotografiju:
  - blago nepravilan oblik (border-radius sa cetiri razlicite vrednosti), ne krug
  - radijalni gradijent: svetliji gore-levo, tamniji dole-desno (dubina tecnosti)
  - ostar mali specular odsjaj gore-levo (bela, ~12% precnika, blur 1px)
  - mek sirok odsjaj po gornjoj ivici (unutrasnja senka, bela, mali alfa)
  - meka senka ispod kapi NA PODLOZI (box-shadow u tonu boje, nikad crna)
  - tanak taman obod na dnu, kap ima debljinu
  - hover gloss sweep vec postoji: zadrzi ga, samo neka klizi preko ovog reljefa
  Primeni svuda: shop kartice, detalj proizvoda, ORLY sekcija na landingu, admin.
  Napravi JEDNU komponentu koja se koristi na svim tim mestima.

D - FOTOGRAFIJE
  - Izbaci `bbm-24` iz galerije: to je promo objava sa tekstom "SAJAMSKI POPUST
    OD 10 DO 50%" preko slike - reklama, ne rad. U data/photos.json: "use": [].
  - Napravi sekciju "Nas tim" izmedju Radova i ORLY sekcije, sa `bbm-10`
    (sest zena u crnom) kao **card** varijantom - `photo` crop je odsekao pola tima.
    Naslov, dve recenice o salonu. NE izmisljaj imena, godine ni broj zaposlenih
    preko onoga sto je na slici. Sve nepoznato je [POTVRDITI].

Sav srpski tekst koji sam pises provuci kroz skill `humanizer`.
Bez "vrhunski", "nezaboravno iskustvo", "posveceni smo". Ton je strucan i konkretan.

PROVERA na 1920, 1440 i 390 px: provera otkrivanja teksta iz docs/MOTION.md mora i
dalje da vraca 0, plus typecheck, lint, test, build.
PREGLED U BROWSERU: `npm run dev -- -p 3001`, pa ga UGASI pre kraja koraka.
