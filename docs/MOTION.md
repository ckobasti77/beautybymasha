# Motion — ugovor o dva sistema

> Sajt ima **dva odvojena sistema animacije**. Ako ih pomešaš, dva koda se biju oko
> istog `opacity` i copy ostane nevidljiv. Ovo je najvažnije pravilo u projektu.

## Sistem 1 — TEKST (site-wide, automatski)

Svaki naslov, pasus, stavka liste i samostalna oznaka stiže **reč po reč, nasumičnim
redosledom, iz blura i odozdo**, kad pređe 15% u vidno polje.

- Portuje se iz `_ref/colorcutchris`: `lib/textReveal.ts` + `constants/textRevealConfig.ts`
  + `components/providers/TextRevealGlobal.tsx`
- Pokriva automatski: `h1`–`h6`, `p`, `li`, `dt`, `dd`, `blockquote`, `figcaption`,
  i `span` koji nije unutar copy elementa / linka / dugmeta / labele
- **Ne piše se ništa po komponenti.** Napišeš semantički markup — pokriveno je.
- Tekst bez taga (broj u golom `<div>`) nije pokriven → daj mu pravi tag,
  ili `data-reveal="text"`. Prvo bolje.
- Preko 60 reči → element se pojavljuje kao blok, ne po rečima
- Reč-spanovi u `flex`/`grid` kontejneru dobijaju `gap` između reči → takav element
  se takođe pojavljuje kao blok. Ako ti treba reveal po rečima, omotaj tekst u `<p>`.

**Zabranjeno:** SplitText, ručni splitter, `gsap.from` na naslovu, `stagger` na pasusu,
`opacity: 0` u CSS-u na tekstu. Sve to već postoji, jednom, za ceo sajt.

**Opt-out `data-reveal="off"`** — samo za: navigaciju, forme, dijaloge, live regione,
ceo `/admin`, i copy čiji `opacity` već drži druga animacija (hero). Ako opt-out-uješ
hero copy, i dalje **duguješ reč-po-reč ulazak** — koristi `splitWords` / `restoreWords`
iz `lib/textReveal.ts`, nikad lokalni splitter.

## Sistem 2 — SVE OSTALO (GSAP ScrollTrigger)

Kartice, slike, swatch-evi, ikone, razdvajači, brojevi, medijski blokovi, cele sekcije.

Jedna komponenta: **`components/motion/Reveal.tsx`** (`useGSAP` + ScrollTrigger).

```tsx
<Reveal>                          {/* jedan element, fade-up 600ms */}
<Reveal stagger>                  {/* deca ulaze redom, 70ms razmaka */}
<Reveal variant="clip">           {/* fotografije: clip-path odozdo + scale 1.06→1 */}
<Reveal variant="count">          {/* brojevi broje od 0 */}
<Reveal delay={0.1}>
```

- Trigger: `start: "top 85%"`, `once: true` — **odigra se jednom i ostaje**
- `scrub` se koristi **samo** za hero i parallax, nikad za ulaze sekcija
- Animiraju se isključivo `transform` i `opacity` (`will-change` se skida posle)
- `gsap.matchMedia()` za responsive i za `prefers-reduced-motion`
- Sve se registruje kroz `useGSAP` sa `scope` — bez ručnog `revert()`

## Pravilo koje spaja oba

> **Ako element sadrži tekst, GSAP animira KONTEJNER (transform), a text-reveal
> animira reči unutra. Nikada oba na istom čvoru.**

```tsx
<Reveal>                       {/* GSAP pomera i pojavljuje karticu */}
  <article className="card">
    <h3>Manikir</h3>           {/* text-reveal razlaže na reči */}
    <p>Klasičan manikir…</p>   {/* text-reveal */}
  </article>
</Reveal>
```

Kartica ulazi kao celina, a unutar nje reči stižu redom. To je „gradualno, redom, a ne
sve odjednom" — na dva nivoa istovremeno.

## Redosled na jednom ekranu

Sve ulazi **redosledom čitanja**, nikad odjednom:

1. Nadnaslov (overline) — 0 ms
2. Naslov — 80 ms, reč po reč
3. Podnaslov / pasus — 160 ms, reč po reč
4. Mreža kartica — 240 ms pa `stagger` 70 ms po kartici
5. CTA — poslednji, 400 ms

Ukupno nikad duže od ~1,2 s od trenutka kad sekcija uđe u kadar. Duže od toga i deluje
kao da sajt ne radi.

## Hero — scroll scenario (korak 12)

Hero je **obična sekcija od 100svh, bez pina** (pin je uklonjen u koraku 10: `.pin-spacer`
je pomerao sve trigere ispod i copy je ostajao nevidljiv — ne vraća se). Jedan
ScrollTrigger na sekciji (`start: "top top"`, `end: "bottom top"`, `scrub`, samo ≥ 1024 px
i bez `prefers-reduced-motion`) daje napredak 0 → 1 dok hero izlazi iz kadra, i taj jedan
broj vozi sve:

1. **Ulaz (nezavisno od skrola):** shader diše, copy stiže reč po reč kroz `revealWords`
   (hero je `data-reveal="off"` i sam vraća dug), dugmad iskaču poslednja.
2. **0–35 %:** 3D bočica (desna polovina, isti canvas kao shader) se **naginje** ka copy-ju
   (rotation.z do +55°, rotation.x do +12°). Idle lebdenje i pointer parallax ostaju.
3. **25–70 %:** shader `uPour` 0 → 1 — mint se **razliva** iz gornjeg desnog ugla ka donjem
   levom, veo ispod copy-ja popušta (copy je do tada iznad kadra).
4. **0–70 %:** wordmark iz heroja **putuje u logo slot navigacije** — samo `transform`
   (translate + scale) po izmerenim pravougaonicima (`lib/logoTravel.ts`), bez Flip-a.
   **70–85 %:** crossfade — wordmark → opacity 0 (pa `visibility: hidden`), nav logo → 1.
5. **55–100 %:** bočica se smanjuje (1 → 0.7), drift ka centru, opacity → 0.
6. Navigacija dobija frosted podlogu kad prođe **85 %** heroja (IntersectionObserver,
   `intersectionRatio < 0.15`) i na svakoj strani bez heroja.

Copy se **ne dira**: njegov opacity drži reveal sistem i ostaje čitljiv do kraja. Sve je na
`transform` i uniformima; ništa ne menja layout. Brojevi žive u `lib/heroChoreography.ts`
(testirano).

Na < 1024 px i uz `prefers-reduced-motion`: bez scrub-a, bez bočice; ispod 769 px ni
shadera — statični gradijent, copy stiže reč po reč, wordmark stoji, nav logo se pojavi
klasom kad hero prođe. Korisnik normalno skroluje.

## Provera pre nego što kažeš „gotovo"

Skroluj stranicu s kraja na kraj, pa u konzoli:

```js
[...document.querySelectorAll('*')].filter(e => e.offsetParent && e.textContent.trim() && getComputedStyle(e).opacity === '0')
```

Mora da vrati **prazan niz**. Takođe: `[data-reveal-state="pending"]` prazan na dnu
stranice, i `document.querySelectorAll('.reveal-word').length === 0` posle završetka.
