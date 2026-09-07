Hero shader (components/hero/liquidShader.ts) — finije podesavanje, nista drugo se ne menja.
Cilj korisnika: (1) MANJA GUSTINA tecnosti — rede, krupnije mrlje, manje „prelamanja" i
uvijanja (manje distorzije), sto usput cini shader jeftinijim; (2) boja u MIRU (pre nego
sto kap padne, uPour = 0) 10-15% MANJE SVETLA i mirnija — ne tamnija ka crnoj, nego dublji
mint umesto skoro-belog. Posle razlivanja (uPour -> 1) ponasanje ostaje isto.

PRVO PROCITAJ: components/hero/liquidShader.ts (ceo), components/hero/LiquidCanvas.tsx
(uniforme, dpr), lib/heroChoreography.ts (samo da znas sta je p i uPour), docs/MOTION.md.

STA SE MENJA (pocetne vrednosti; fino podesi po merenju, ali ostani u ovim okvirima):
1. Frekvencija polja: `p = (vUv - 0.5) * vec2(aspect,1) * 1.15` -> mnozilac 0.80 (krupnije mrlje).
2. Domenski warp: `1.35 * q` -> 0.85, `1.25 * r` -> 0.80 (manje uvijanja / distorzije).
3. fbm: 4 oktave -> 3 (fine nabore ne zelimo; jeftinije). Lacunarity ostaje.
4. Sjaj (spec): `pow(ridge, 8.0)` -> 12.0 (uzi pojas), `spec * 0.55` -> 0.35 (redje i tise
   „prelamanje"); posle razlivanja `spec * 0.35 * pour` moze da ostane.
5. Svetlina u miru: pragovi palete `smoothstep(0.35, 0.82, n)` -> (0.45, 0.90), papir tek od
   n > 0.96; u niskom delu polja umesaj dublji mint: `col = mix(MINT_DEEP, col, smoothstep(0.0,
   0.45, n))` gde je MINT_DEEP #2E8E7B (token --mint-deep, linearni prostor kroz THREE.Color —
   dodaj kao 5. boju u uPalette, ne hardkod u GLSL). Zavrsni kontrast `1.12` -> 1.06.
   Ako i posle toga merenje (dole) ne da -10..-15% luminance, blagi globalni `col *= 0.92`
   PRE spec-a, i ne vise od toga.
6. Ivicni „edge" fade u papir `edge * 0.30` -> 0.22 (papir ne sme da izbeli kadar).
Ne menjaj: uPour logiku, uPourOrigin, hvatanje boje, ink pravilo, kap, bocicu, koreografiju.

MERENJE (Playwright, 1440x900, svetla tema, p = 0, page.bringToFront(), sacekaj 3 s):
screenshot PRE (HEAD verzija shadera) i POSLE, prosek 3 snimka u razmaku 1 s, nad bounding
boxom `#hero canvas`:
 a) srednju luminancu (0.2126 R + 0.7152 G + 0.0722 B): POSLE mora biti 10-15% niza od PRE
    (tekst i bocica su isti u oba, razlika je pozadina);
 b) „gustinu": varijansu Laplasijana sive slike — POSLE mora biti >= 30% niza (rede prelamanje);
 c) kontrast h1 (`--hero-ink` na pozadini iza copy-ja): i dalje >= 4.5:1 — uzmi prosecnu boju
    pozadine u boxu h1 sa sakrivenim tekstom (`visibility:hidden` na copy pa screenshot).
 d) perf: 3 s skrola kroz zonu, p95 frame <= 17 ms (kao 13/14) — ne sme da poraste.
 e) screenshot na p = 0.5 i 0.8 — razlivena boja pokriva kadar kao pre; ink pravilo radi.
Ako a) ili b) ne prolaze, koriguj u okvirima gore i ponovi; upisi vrednosti koje si uzeo.

BUG (korisnik vidi na 1440): pred KRAJ hero zone (p ~0.8-1.0) CTA dugmad iz heroja „promene
mesto i sidju skroz dole". Nadji uzrok u Hero.tsx / heroChoreography: sumnjivi su (1) `hidden`
(display:none) na copy kontejneru na p >= 0.85 koji preslaze flex i pomera CTA red; (2) CTA red
kojem se ne animira opacity pa ostaje vidljiv dok stage lag (y -> +40vh) nosi stage nadole;
(3) A4 reflow (translate copy-ja) koji se ne ukida pre izlaza. Popravka: CTA opacity -> 0 do
p 0.78 i pointer-events none, kontejner iskljuci `visibility:hidden` (ne display:none) i tek na
p >= 0.9; sve sto se pomera ide transformom, nikad layoutom. PROVERA: bounding rect CTA reda
na p = 0.5, 0.6 ... 1.0 (korak 0.05) — dok je opacity > 0 pomera se SAMO za stage lag; posle
0.78 opacity 0; nijedan skok > 4 px izmedju susednih koraka; reload na p 0.9 = isto stanje.

PROVERA: typecheck + lint + test + build. Reveal 0 pending na dnu (pravi tockic). Tamna tema
screenshot heroja bez sive mrlje (korak 14 C).

docs/STATUS.md vrh „Korak 16": tabela PRE/POSLE (luminanca, Laplasijan, p95, kontrast h1),
konacni parametri, uzrok CTA buga. Commit na tekucoj grani
"korak 16: hero shader redje polje i dublji mint; CTA ne skacu na izlazu" + git push. Bez convex deploy.
