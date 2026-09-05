# 14 — Hero koreografija v3: logo koji se PREPISUJE, bocica koja se OTVARA i SPUSTA na sledecu sekciju

## Sta postoji (korak 13, docs/STATUS.md)
Zona 170vh + sticky stage, jedan scrub, p cista funkcija (`lib/heroChoreography.ts`), HOLD_END 0.41.
Logo: ceo wordmark translate+scale u slot 0.04-0.30, crossfade 0.30-0.36. Bocica (GLB iz Blender MCP:
Glass/Liquid/Cap, clipping ravan za nivo, slosh): nagib 0.06-0.30, kap sa VRHA ZATVARACA 0.18-0.40,
radijalno razlivanje 0.36-0.78, izlaz scale 0.7 + opacity 0.60-1. Copy izlazi kao kontejner 0.55-0.85.
IG nav, z-skala, frost od p>=0.30. Sve to RADI i ostaje kao osnova — ovaj korak menja SAMO
koreografiju (sta se desava), ne arhitekturu (kako se vozi).

## Sta je "basic" i zasto (ocena korisnika)
1. Logo: jedan pravougaonik koji se smanjuje i klizi. Nema price, nema materijala (potpis je
   rukopis — a ponasa se kao slika).
2. Bocica: zatvorena bocica se nagne i iz zatvaraca „ispadne" kap (fizicki besmisleno — STATUS
   13 to i priznaje). Izlaz je scale+fade — objekat nestaje umesto da ode negde.
3. Copy samo bledi.

## 0. PRAVILA (nepromenjena, tvrda)
BEZ pina, BEZ Flip plugina, BEZ zakljucavanja skrola. Jedan scrub, sve funkcija p, reload usred
zone = isto stanje. Samo transform/opacity/uniformi. Frontend korak, convex/ se ne dira. Reveal
ugovor ostaje. Provera pravim tockicem. Budzeti iz 13 (pocetni JS +<=3KB, lenji three chunk
+<=10KB, GLB <=500KB, <=40k trouglova, p95 frame <=17ms).

## A. LOGO — „potpis se prepisuje"
Logo je dvodelan (`components/brand/Logo.tsx`): `[data-logo-beauty]` = 6 `<path>` glifova BEAUTY,
`[data-logo-sig]` = glifovi rukopisa „by Masha" (`[data-sig-glyph]`, imaju stroke i fill; intro
vec crta stroke-dashoffset-om u `LogoSignature.tsx`). Nav slot (`#nav-logo-slot`) ima isti
wordmark. Oba dobijaju indeks po glifu: `data-glyph="b0..b5"` i `data-glyph="s0..sN"`.

A1. BEAUTY slovo po slovo. Za svako slovo i (0..5) meri se rect hero glifa i rect nav glifa
    (pri `onRefreshInit`, kao sad za ceo wordmark). Slovo i putuje SOPSTVENIM transformom
    (translate+scale iz ta dva recta — rucno, bez Flip plugina) po blago zakrivljenoj putanji:
    kvadratni bezier, kontrolna tacka podignuta 12% duzine puta. Start 0.06 + 0.015·i, kraj
    0.24 + 0.015·i, ease expo.inOut. Poslednjih 15% puta: scale overshoot 1.04 -> 1 (sletanje).
    Nav glif i je `opacity 0` dok hero glif i ne sleti, pa se zamene u istom frejmu — nav
    wordmark se SASTAVLJA slovo po slovo, s leva na desno.
A2. Potpis se prepisuje. Hero rukopis se BRISE 0.10-0.26: glifovi obrnutim redom (poslednji
    prvi), `strokeDashoffset 0 -> length`, `fillOpacity -> 0` u prvih 30% svakog glifa (isti
    mehanizam kao intro, samo unazad i vozen p-om, ne vremenom). Nav rukopis se PISE 0.24-0.36
    istim redom kao intro (`length -> 0`, fill na kraju). Tacka tinte: krug 6px u boji potpisa
    putuje 0.20-0.24 od repa hero potpisa do glave nav potpisa (bezier), a tokom 0.24-0.36 jase
    na frontu pisanja: pozicija = `path.getPointAtLength(length - dashoffset)` tekuceg glifa,
    preslikano `getScreenCTM()`-om (jedan poziv po frejmu). Nestaje na 0.36.
    Ako intro potpisa (`LogoSignature`, jednom po sesiji) jos traje kad korisnik krene da skrola:
    intro se prekida na tekucem stanju i p preuzima — nikad dva pisca na istim putanjama.
A3. Frost se pali iz slota. `.nav-frost` podloga + hairline dobijaju `clip-path: inset(0 X% 0 0)`
    koji ide od `inset(0 100% 0 0)` na 0.30 do `inset(0 0 0 0)` na 0.42 (s leva, iz loga, na
    desno), ease power2.out. Backdrop-filter radi ispod clip-path-a — proveri isporuceni CSS.
A4. Copy se PRESLAZE, ne ceka. Dok slova odlaze (0.06-0.30) blok copy-ja (h1, lead, CTA red,
    strip) klizi NAGORE za visinu wordmarka + razmak, stagger 0.02 po elementu (h1 prvi), ease
    power3.inOut. Copy postaje vrh kompozicije. Nista ne bledi do 0.55.
A5. Copy izlazi rec po rec, ne kao kontejner: 0.55-0.80 reci (postojeci `revealWords` spanovi)
    `y +18px`, opacity -> 0, stagger od POSLEDNJE reci ka prvoj (obrnuto od ulaza); CTA 0.60-0.78;
    kontejner `hidden` na 0.85 kao sad. Hero je `data-reveal="off"` i sam poseduje te spanove —
    upisi u docs/MOTION.md da je izlaz reci u heroju deo hero ugovora.

## B. BOCICA — otvaranje, kap sa CETKICE, spustanje na policu
B0. MODEL (Blender MCP, `scripts/bottle.py` -> `build()` dobija cetkicu, ponovni export):
    - `BrushStem`: cilindar d 0.28, od donje strane zatvaraca nadole; duzina takva da vrh
      dlacica stoji na 92% dubine tecnosti dok je zatvoreno.
    - `BrushHair`: zarubljena kupa d 0.5 -> 0.18, duzina 1.5, spljostena (scale x 1.35) — ravna
      cetkica za lak. Materijal: base bela (kod boji u boju tecnosti), roughness 0.25, clearcoat.
    - Oba su DECA `Cap` (roditeljstvo mora da prezivi export). Imena TACNO ta.
    - Budzet: <=40k trouglova ukupno (sad 36.160 — cetkica <=2.5k; ako prelazi, smanji subdiv
      vrata Glass-a), <=500KB. `gltf-transform inspect` pre commit-a. Fallback: proceduralna
      cetkica u `bottleGeometry.ts` ako MCP nije ziv.
B1. IDLE (p<0.04): kao sad (yaw ±7°, lebdenje, ciklus boja) + DVE stvari: (a) orbita rim
    svetla: specular sweep preko zatvaraca i stakla jednom po hold-u boje (4.5s), fazno vezan
    za crossfade — lak „uhvati svetlo" dok menja boju; (b) pointer vozi key svetlo ±15%
    (glass highlights prate mis). Hover nad bocicom: zatvarac se podigne 0.15 jed. (opruga) —
    poziv da se skrola.
B2. OTVARANJE 0.04-0.22: kamera fov 30 -> 27 (dolly-in, `updateProjectionMatrix` po frejmu);
    bocica yaw u 3/4 pogled (-25°). `Cap` grupa (sa cetkicom) se ODVRCE: 720° oko Y dok se dize
    po Y dok dlacice ne izadju iz vrata + 0.3 jed. (racunaj iz geometrije, ne hardkoduj), ease
    power2.inOut. Telo bocice ostaje uspravno (otvorena bocica se ne naginje — realizam);
    blago njihanje ±2°. Nivo tecnosti pada za zapreminu stema (mala, ali vidljiva: -3%).
B3. KAP 0.22-0.42: Cap+cetkica idu ulevo ka copy koloni 12% sirine kadra i malo gore, nagib
    -25° (z) da vrh dlacica gleda dole-levo. Kap raste na VRHU DLACICA 0.24-0.32, otkaci se
    0.32, pada do NDC -1.15 do 0.42; `uPourOrigin` = tacka izlaska. Stara kap sa zatvaraca se
    UKLANJA. Dlacice su u boji tecnosti + tanak sloj sjaja.
B4. RAZLIVANJE 0.36-0.78: kao sad (radijalno, 75/25, ink pravilo). Dodatno: `envMapIntensity`
    0.6 -> 0.9 dok front prolazi 0.5, pa nazad do 0.78 — bocica „zablista" dok boja poplavi.
B5. ZATVARANJE I SPUSTANJE 0.58-1.0: 0.58-0.74 Cap+cetkica se vracaju (obrnuto od B2, 360°).
    Od 0.62 bocica se SPUSTA NA POLICU: ekranski Y baze bocice prati gornju ivicu `.hero-overlap`
    (cista formula: `overlapTop(p) = H·(1-p)` u px, H = visina sekcije; proveri protiv stvarnog
    recta na refresh-u), X drift ka 70% sirine, scale 1 -> 0.55 (ease power2.inOut). Bocica
    STOJI na zaobljenoj ivici sledece sekcije i odlazi sa njom iz kadra. Nema opacity fade-a na
    izlazu — objekat fizicki odlazi. (alphaHash bledjenje ostaje samo za fallback bez GLB-a.)
    Kontakt: mala meka senka (ravan sa radijalnim alpha gradijentom) pod bazom od 0.70.
B6. Interakcija ostaje: hover kursor + scale 1.03, klik wobble + slosh. Raycast kapsula obuhvata
    i podignuti zatvarac.

## C. BUG — veo u tamnoj temi
Na 769-1023px u tamnoj temi (screenshot korisnika/Cowork: 799x455) papirni veo (`.hero-scrim-paper`)
stoji kao SIVA MRLJA preko tamne podloge — podloga heroja tu ocigledno NIJE svetla kao sto
STATUS 13 tvrdi. Proveri sve tri grane (>=1024 bocica, 769-1023 shader, <=768 CSS) u OBE teme
na 1440/900/390 screenshotima; ili je podloga heroja svetla u svim granama i temama (kako je
zamisljeno), ili veo prati temu. Bez sive mrlje ni u jednoj kombinaciji.

## D. PROVERA (1440 i 390, pravi tockic, Playwright `mouse.wheel`, `page.bringToFront()`)
 1. Slova: screenshot na p 0.12 / 0.20 / 0.28 — nav wordmark se sastavlja s leva; ni u jednom
    frejmu jedno slovo dvaput vidljivo (hero i nav opacity > .5 istovremeno) — `__bbmHero.letters`.
 2. Potpis: p 0.18 hero potpis delimicno izbrisan, nav prazan; p 0.30 nav delimicno napisan;
    tacka tinte vidljiva 0.20-0.36 i na frontu pisanja (razdaljina od tacke do kraja nacrtanog
    dela <= 3px); 0.36 tacka nema.
 3. Frost: p 0.36 `clip-path` delimican; p 0.42 pun; blur aktivan pod isecenim delom.
 4. Reflow: h1 top na p 0.30 = h1 top na p 0 - visina wordmarka (±4px).
 5. Otvaranje: p 0.22 dlacice iznad vrata (world y), zatvarac rotiran 720° ± 1°; p 0.74 zatvoreno.
 6. Kap krece sa vrha dlacica (screenshot 0.30), `uPourOrigin` = tacka izlaska.
 7. Polica: p 0.70 / 0.85 / 0.95 baza bocice unutar 8px od gornje ivice `.hero-overlap`.
 8. Reload na p 0.5 i na p 0.8 = isto stanje kao skrol (slova, potpis, zatvarac, polica).
 9. `.pin-spacer` 0, body bez overflow:hidden tokom skrola, reveal 0 pending na dnu, 390 bez
    horizontalnog prekoracenja, IG nav i dalje radi.
10. Tamna tema: screenshot 1440/900/390 heroja — bez sive mrlje (C).
11. Perf: skrol kroz zonu 3s, p95 <= 17ms, 0 preko 33ms; `gltf-transform inspect` <= 40k, <= 500KB;
    bundle delta u granicama iz 0.
12. typecheck + lint + test + build (koreografija: testovi za nove segmente, putanju slova,
    formulu police).
Sve u docs/STATUS.md kao tabelu, sa odstupanjima od slova speca i razlogom.

## E. DOKUMENTACIJA I GIT
docs/MOTION.md: „Hero v3" tabela segmenata (A i B), hero poseduje izlaz reci. docs/STATUS.md vrh.
Commit na tekucoj grani `korak 14: logo se prepisuje, bocica se otvara i spusta`, push te grane.
Bez convex deploy.
