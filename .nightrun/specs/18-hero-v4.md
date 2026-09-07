# 18 — Hero v4: animacija se PUSTA jednim skrolom, 3D i na telefonu, ziroskop, dugme za vrh

## Sta postoji (korak 13-16, docs/STATUS.md)
Zona 170vh + `position: sticky` stage 100dvh, JEDAN ScrollTrigger (`top top -> bottom top`, scrub),
`p` je napredak i sve je cista funkcija od `p` (`lib/heroChoreography.ts`, `lib/logoTravel.ts`,
`lib/heroColors.ts`). Logo se prepisuje slovo po slovo, bocica (GLB iz Blendera: Glass/Liquid/Cap/
BrushStem/BrushHair) se otvara, kap pada sa cetkice, boja se radijalno razliva po shaderu, sledeca
sekcija (`.hero-overlap`) naleze preko heroja. Pointer parallax vozi `uPointer`. WebGL je iskljucen
<= 768px (ADR-005) — umesto bocice stoji CSS kap (`HeroDrop`).

## Sta se menja (zahtev korisnika, doslovno)
1. 3D bocica MORA i na malim ekranima (ADR-005 se povlaci, uz budzet i fallback — sekcija A).
2. JEDAN mali skrol sa samog vrha pusta CELU hero animaciju u 2-2.5 s, korisnik ne mora da skroluje
   kroz nju. Kad se animacija zavrsi, strana se SAMA glatko odskroluje do sledece sekcije, i taj
   prelaz je onaj isti parallax preklop koji vec postoji. Na desktopu okidac je jedan mali skrol
   (bilo koja kolicina), na telefonu prvi dodir-povlacenje bilo koje jacine — odmah.
3. Pozadina heroja na telefonu reaguje na ZIROSKOP isto kao sto na desktopu reaguje na misa.
4. Dugme „nazad na vrh" sa glatkim skrolom.
5. Povratak na vrh ostaje kao sad; animacija se ponovo pusta kad se krene SA SAMOG VRHA.

## 0. Pravila
- Koreografija se NE prepisuje. Menja se samo KO vozi `p`: do sada iskljucivo skrol, sada i vreme.
  `p` ostaje cista funkcija, `heroChoreography(p)` se ne dira.
- BEZ GSAP pina i BEZ Flip-a. Zakljucavanje skrola je dozvoljeno SAMO u prozoru reprodukcije iz
  sekcije B i mora imati tvrdi prekidac (B4). Nigde drugde na sajtu nema locka osim mobilnog menija.
- Sve vizuelno ide kroz transform/opacity/uniforme. Nula layouta u kadru.
- `prefers-reduced-motion`: bez reprodukcije, bez locka, bez auto-skrola, bez ziroskopa — hero je
  statican i skroluje se normalno.
- convex/ se ne dira. Frontend korak.

## A. 3D I NA MALIM EKRANIMA (povlacenje ADR-005)
`lib/webgl.ts` → `useWebGLAllowed()` vise ne gleda sirinu. Novi ugovor: WebGL se montira ako
(1) postoji WebGL2 kontekst, (2) nije `prefers-reduced-motion`, (3) uredjaj prodje jeftin test
sposobnosti: `navigator.deviceMemory >= 4` ILI `navigator.hardwareConcurrency >= 4` (ako polja nema,
smatra se da prolazi), i (4) prvi frejm se iscrta ispod 120 ms (meri se `performance.now()` oko
prvog `gl.finish()`; ako ne — demontira se i pali `HeroDrop`).
MOBILNI BUDZET (sirina < 768 ILI `pointer: coarse`), u `LiquidCanvas`/`HeroBottle`:
- `dpr` max 1.5 (desktop ostaje 2), `powerPreference: "low-power"`, `antialias: false`.
- Staklo BEZ transmisije: `MeshPhysicalMaterial` sa `transmission` 0 → jeftin `MeshStandardMaterial`
  sa `envMapIntensity` i `opacity` 0.85; `gl.transmissionResolutionScale` se ne koristi.
  (Transmisija je drugi prolaz rendera — na telefonu je to duplo.)
- Shader: `uOctaves` 3 → 2 (dodaj uniform, ne granaj kod po platformi u dva fajla).
- Bocica je manja i centrirana ispod copy-ja (ne desno), visina ~44 % kadra; copy ostaje citljiv.
- `frameloop="demand"` ostaje; kad je tab sakriven ili canvas van kadra — nema crtanja.
- Ako `useCanvasActive` javi da je prosek frejma > 26 ms u prva 2 s, PREBACI na `HeroDrop` i upisi
  razlog u `window.__bbmHero.downgrade` (dev).
`HeroDrop` ostaje kao fallback i za reduced-motion. Meri i upisi u STATUS: FPS na 390 px u Chrome
mobilnoj emulaciji (CPU throttle 4x), i velicina lenjog chunka.

## B. REPRODUKCIJA JEDNIM SKROLOM (`lib/heroPlayback.ts`, novo)
Stanja: `armed` (na vrhu, spremno) → `playing` (traje 2.2 s) → `handoff` (auto-skrol) → `done`.
B1. NAORUZANO kad: `scrollY <= 2` i zadrzalo se tu >= 350 ms (da povratak na vrh ne okine odmah),
    i nije `prefers-reduced-motion`, i mobilni meni nije otvoren, i fokus nije u polju za unos.
B2. OKIDAC: prvi `wheel` (bilo koji `deltaY > 0`), `touchmove` naniže preko 6 px, `keydown` na
    Space/PageDown/ArrowDown, ili klik na CTA „Zakazite termin" (tada se preskace na kraj, C3).
    Okidac je jednokratan; posle njega stanje ide u `playing`.
B3. REPRODUKCIJA: `p` vozi vreme, ne skrol. Tween proxy objekta `{v:0}` → `0.75` za `2.2 s`,
    ease `power2.inOut` (to je „ease-in-out" iz zahteva). Za to vreme:
    - skrol je zakljucan (`lenis.stop()` + `overscroll-behavior: none` na `html`),
    - `p` se emituje kroz isti put kao i do sada (`heroProgress` store + `drivers`), tako da
      shader, bocica, logo i copy rade bez ijedne izmene,
    - ScrollTrigger scrub se ne gasi; izvor je `p = max(timeP, scrollP)` — kad kasnije skrol
      prestigne vreme, preuzimanje je bez skoka.
B4. PREKID (obavezno, ovo je razlika izmedju efekta i zamke): drugi namerni ulaz — kumulativni
    `deltaY > 120` posle okidaca, `touchmove` preko 60 px, Escape, ili klik bilo gde — ODMAH
    zavrsava tween (`progress(1)`), otkljucava skrol i prelazi u `handoff`. Takodje tvrdi tajmer:
    ako `playing` traje > 3 s (tab u pozadini, throttle), prelazi se u `handoff` bez obzira na sve.
B5. HANDOFF: `lenis.scrollTo(<vrh .hero-overlap>, { duration: 0.9, easing: easeInOutCubic })`.
    Dok traje, skrol je otkljucan i korisnik moze da ga prekine (Lenis to radi sam) — ako prekine,
    `handoff` se otkazuje. Na kraju stanje `done`. Ostatak `p` (0.75 → 1) vozi pravi skrol, pa je
    parallax preklop sledece sekcije isti kao i do sada.
B6. PONOVNO NAORUZAVANJE: kad korisnik ponovo dodje na `scrollY <= 2` i zadrzi se 350 ms, stanje
    se vraca na `armed` i `p` se vraca na 0 (bez animacije). Iz zahteva: „vracanje na vrh je isto
    kao sad, samo se animacija pusta kad se krene sa samog vrha".
B7. Dubinsko povezivanje (`/#zakazivanje`, `/#cenovnik`) i reload usred strane NE naoruzavaju
    reprodukciju — `armed` trazi da si stvarno na vrhu.

## C. DETALJI KOJI ODLUCUJU DA LI JE OVO PRIJATNO
C1. Trajanje je JEDAN broj: `PLAY_MS = 2200` u `lib/heroPlayback.ts`. Sve ostalo se izvodi iz njega.
C2. Za vreme `playing` pokazi diskretan nagovestaj da se nesto desava i da moze da se preskoci:
    postojeci indikator skrola na dnu heroja menja tekst u „Preskoci" (dodirno polje 44 px,
    `aria-label="Preskoci uvod"`), klik = B4. Ne pravi novi overlay.
C3. Klik na „Zakazite termin" tokom `armed`/`playing` NE ceka animaciju — odmah `progress(1)`,
    otkljucaj, pa skrol na `#zakazivanje`. Korisnikova namera je jaca od efekta.
C4. Prvi ulaz na sajt sa `?nointro` ili posle 3 posete u sesiji (`sessionStorage`) — animacija se
    i dalje pusta, ali brze (`PLAY_MS * 0.6`). Ne kaznjavaj povratnika punim uvodom.

## D. ZIROSKOP NA TELEFONU (`lib/tilt.ts`, novo)
Isti izlaz kao pointer parallax: normalizovan vektor `{x, y}` u opsegu -1..1 koji ide u `uPointer`
i u nagib bocice. Jedan modul, dva izvora: `pointermove` (fina kazaljka) i `deviceorientation`.
D1. iOS 13+ trazi dozvolu: `DeviceOrientationEvent.requestPermission()` mora da se zove IZ GESTA.
    Zovi je iz ISTOG gesta koji pusta animaciju (B2) — bez posebnog dugmeta i bez pitanja na ucitavanju.
    Ako je odbijena ili API ne postoji: tiho nazad na blagi idle drift, bez ijedne poruke.
D2. Kalibracija: prvo ocitavanje je nula (korisnik drzi telefon kako drzi). Cuvaj `beta0/gamma0` i
    racunaj razliku, pa ne moras da pretpostavljas ugao drzanja.
D3. Mapiranje: `x = clamp((gamma - gamma0) / 25, -1, 1)`, `y = clamp((beta - beta0) / 25, -1, 1)`.
    Mrtva zona 1.5°, low-pass filter (lerp 0.12 po frejmu) da ne podrhtava.
D4. Amplituda na telefonu je POLA desktopske (pozadina se pomera diskretno; telefon se stalno mrda).
D5. Odjavi slusaca kad je hero van kadra i kad je tab sakriven. `prefers-reduced-motion` = iskljuceno.

## E. DUGME „NAZAD NA VRH" (`components/site/BackToTop.tsx`, novo)
- Pojavljuje se kad `scrollY > 2 * innerHeight`, nestaje ispod toga; ulaz/izlaz 200 ms opacity+scale,
  bez pomeranja rasporeda.
- Pozicija: `fixed bottom-5 right-5` + `env(safe-area-inset-bottom)`; na mobilnom iznad palca,
  ne preko CTA-a; 48x48 px; `z-40` (ispod nav-a 100, dijaloga 110 — postuj Z-skalu).
- Izgled: `.nav-frost` staklo + `--mint-deep` ikona strelice (mint nikad kao boja teksta).
- Radnja: `lenis.scrollTo(0, { duration: 0.8, easing: easeInOutCubic })`; bez Lenis-a fallback
  `window.scrollTo({top:0, behavior:'smooth'})`. Posle dolaska: fokus na `#nav-logo-slot` (ili prvi
  link u nav-u), da tastatura ne ostane na dnu strane.
- Sakriveno dok je mobilni meni otvoren ili dijalog. `aria-label="Nazad na vrh"`, `title` isti.
- Dolazak na vrh naoruzava hero (B6) — ista provera od 350 ms, bez posebne logike.

## F. PROVERA (Playwright, 1440x900 i 390x844, obe teme, pravi tockic / touch)
 1. Sa vrha: jedan `wheel` od 40 px → `p` raste bez daljeg skrola; posle ~2,2 s `p >= 0.75`;
    zatim strana sama stigne do `.hero-overlap` (`getBoundingClientRect().top` u opsegu 0-8 px).
 2. Ukupno trajanje od okidaca do mirovanja: 2,0-3,4 s. Izmeri i upisi.
 3. Prekid: okini, pa posle 400 ms posalji `wheel` 300 px → u roku od 150 ms skrol je otkljucan,
    `p = 1`, strana se pomera normalno. Nijedan ulaz ne sme da bude progutan duze od 150 ms.
 4. Tvrdi tajmer: okini pa sakrij tab na 5 s → po povratku strana nije zakljucana.
 5. Escape i klik takodje prekidaju. „Preskoci" dugme radi i tastaturom.
 6. Ponovno naoruzavanje: skrol na dno, pa dugme „nazad na vrh" → posle dolaska i 350 ms, novi
    mali skrol PONOVO pusta animaciju.
 7. Deep link `/#cenovnik`: nema locka, nema auto-skrola, hero se ne pusta.
 8. Telefon 390: prvi `touchmove` od 10 px pusta animaciju; 3D bocica je vidljiva (canvas > 0 px);
    prosek frejma u prva 2 s < 26 ms uz 4x CPU throttle, inace se vidi `HeroDrop` fallback.
 9. Ziroskop: simuliraj `deviceorientation` (CDP `Emulation.setDeviceOrientationOverride` ili
    rucni `dispatchEvent`) — promena `gamma` za 20° pomera `uPointer.x` za ~0.8 i ne preko 1.
10. `prefers-reduced-motion`: nema locka, nema auto-skrola, nema ziroskopa, hero statican, strana
    se skroluje odmah.
11. Dugme za vrh: pojava tacno preko 2 ekrana, 48 px meta, `aria-label`, fokus posle dolaska,
    sakriveno uz otvoren meni.
12. Regresija: `.pin-spacer` = 0; `body` bez `overflow:hidden` van prozora reprodukcije i menija;
    reveal 0 `pending` na dnu; bez horizontalnog prekoracenja na 360/390/430;
    `npm run typecheck && npm run lint && npm test && npm run build`.
Sve u docs/STATUS.md kao tabelu, plus odstupanja sa razlogom.

## G. Dokumentacija i git
docs/MOTION.md: „Hero v4" (stanja reprodukcije, ko vozi `p`, pravila prekida), azuriraj Z-skalu
dugmetom za vrh. docs/BRIEF.md: ADR-005 se povlaci — upisi novi ugovor iz A i razlog.
docs/STATUS.md na vrh. Commit na tekucoj grani `korak 18: hero se pusta jednim skrolom, 3D na
telefonu, ziroskop, dugme za vrh` + `git push`. Bez `convex deploy`.
