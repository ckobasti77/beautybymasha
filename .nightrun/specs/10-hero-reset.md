# Korak 10 — skloni pin, popravi canvas, pa lepota

## Nalaz (localhost:3001, 1920x911, novi kod iz koraka 09)

Korak 09 je pisao kod, ali NIJE popravio nijedan od tri buga. Mereno posle skrola:

```
scrollY: 4200   a do dna ima 12070   <- skrol se ZAGLAVI, strana ne ide dalje
nevidljivo: 189   pending: 145   done: 0   revealWord: 25
canvas: 300x150 (HTML podrazumevana velicina), roditelj DIV 1905x911
```

Layout se posle skrola raspadne: navbar zavrsi nasred strane, sekcije se preklapaju,
slika iz galerije viri preko navigacije. `done` je 0 — nijedan element nikad ne
zavrsi otkrivanje, ukljucujuci H1 iz heroja koji je pri ucitavanju bio vidljiv.

## Dijagnoza

Sve tri stvari vode na isto: **hero pin**.

`.pin-spacer` menja visinu dokumenta i pomera sve sekcije ispod sebe. ScrollTrigger
pozicije za te sekcije se racunaju pre nego sto spacer postoji, pa nikad ne okinu →
kontejneri ostanu `opacity: 0`. `ScrollTrigger.refresh()` na `load` je pokusaj zakrpe
koji sam pravi novi problem: refresh usred Lenis skrola razbija poziciju pina.

Nije vredno spasavanja. Klijent je pin ionako prijavio kao smetnju
("scrolling tango, ne znam da li mi se svidja"). Demo je danas.

## A. SKLONI PIN — bez pregovora

- Izbaci ScrollTrigger `pin` iz heroja u potpunosti. Nema `.pin-spacer` na strani.
- Izbaci GSAP **Flip** wordmark→logo. To je efekat zbog kog pin i postoji.
  Navigacija dobija logo obicnim `opacity` prelazom kad hero izadje iz kadra.
- Hero postaje **obicna sekcija visine 100svh**: shader kao pozadina, copy preko njega,
  dva dugmeta. Skrol tece normalno kroz njega.
- Jedini scroll efekat koji sme da ostane: **blagi parallax na shaderu**
  (`y: 0 → 12%`, `scrub: 1`, bez pina).
- Posle ovoga proveri da `document.querySelectorAll('.pin-spacer').length === 0`.

Ovo je namerno korak unazad u efektima. Sajt koji se vidi i skroluje pobedjuje
sajt sa efektom koji ga lomi.

## B. CANVAS je 300x150 — shader zato nista ne crta

`<canvas>` ima podrazumevanu HTML velicinu iako mu je roditelj 1905x911.
Nadji zasto (`components/hero/LiquidCanvas.tsx`) — najverovatnije R3F `<Canvas>`
nije dobio velicinu jer je roditelj `position: absolute; inset: 0` unutar elementa
koji u trenutku mere jos nema visinu, pa `ResizeObserver` izmeri 0.
Popravi tako da canvas prati roditelja i na `resize`. Posle popravke:
`canvas.width > 1000` na 1920 px.
Kad dobije velicinu, proveri da se mint STVARNO vidi — ako je izlaz i dalje ispran,
pojacaj zasicenost i kontrast.

## C. REVEAL — posle sklonjenog pina proveri ponovo

Sigurnosna mreza iz koraka 09 (sweep po geometriji, load/resize re-check, 3 s fallback)
ostaje. Bez pina bi trebalo da radi. Ako i dalje `done` ostaje 0:
timeline se ne zavrsava → proveri da `gsap.ticker` stvarno kuca
(`gsap.ticker.add` u SmoothScroll) i da `revealWords` timeline nije napravljen
sa `paused: true` a nikad pusten.

## D. LOGO — wordmark je slomljen
Rukopis "by Masha" prelazi preko celog "BEAUTY", ivice mu se seku.
U originalu stoji ISPOD reci, poravnat levo, gornje petlje blago dodiruju donju
ivicu slova. Rukopis je oko 38% sirine wordmark-a, rotiran oko -4 stepena.
Proveri sve tri varijante (full, mark, wordmark), obe teme, i mali logo u navigaciji.

## E. NAV LOGO — premali, ne vidi se sta pise
Sada je `<Logo variant="mark" size={36} />` — mint krug od 36 px u kome je tekst necitljiv.
Klijent: povecaj SAMO logo, visina navigacije ostaje ista.
Resenje: u navigaciji koristi `variant="wordmark"` (horizontalni BEAUTY by Masha) visine
~30 px — to se cita. Ako wordmark ne stane na mobilnom (<400 px), tamo `mark` od 44 px.
Visina nav trake se NE menja. Logo u footeru ne diraj.

## F. FOTOGRAFIJE
- `bbm-24` izlazi iz galerije: to je promo objava sa tekstom "SAJAMSKI POPUST
  OD 10 DO 50%" preko slike — reklama, ne rad. U `data/photos.json`: `"use": []`.
- Sekcija **"Nas tim"** izmedju Radova i ORLY sekcije, sa `bbm-10` kao **card**
  varijantom (`photo` crop je odsekao pola tima). Naslov i dve recenice.
  NE izmisljati imena, godine ni broj zaposlenih. Nepoznato je [POTVRDITI].

## G. PROVERA — na 1920, 1440 i 390 px
1. `document.querySelectorAll('.pin-spacer').length` === 0
2. skrol stigne do dna: `scrollY` dostigne `scrollHeight - innerHeight`
3. `[...document.querySelectorAll('*')].filter(e=>e.offsetParent&&e.textContent.trim()&&getComputedStyle(e).opacity==='0').length` === 0
4. `document.querySelectorAll('[data-reveal-state="pending"]').length` === 0 na dnu
5. `document.querySelector('canvas').width > 1000` na 1920, canvas ne postoji na 390
6. navbar ostaje na vrhu tokom celog skrola, nista se ne preklapa
7. typecheck, lint, test, build
