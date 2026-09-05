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

## Hero — scroll scenario

1. **0–15% skrola:** shader miruje i diše, copy stiže reč po reč, dugmad iskaču poslednja
2. **15–60%:** hero je `pin`-ovan; shader dobija dubinu (`uScroll`), wordmark se smanjuje
   i pomera ka gornjem levom uglu gde postaje logo u navigaciji (GSAP Flip)
3. **60–100%:** shader se skuplja u **krug** — motiv iz logotipa — koji se smanjuje
   i predaje mesto prvoj ikoni sekcije Usluge
4. Navigacija dobija podlogu (frosted) tek kad hero izađe iz kadra

Na mobilnom i uz `prefers-reduced-motion`: bez pin-a, bez shadera, bez Flip-a.
Statični gradijent, copy stiže reč po reč, korisnik normalno skroluje.

## Provera pre nego što kažeš „gotovo"

Skroluj stranicu s kraja na kraj, pa u konzoli:

```js
[...document.querySelectorAll('*')].filter(e => e.offsetParent && e.textContent.trim() && getComputedStyle(e).opacity === '0')
```

Mora da vrati **prazan niz**. Takođe: `[data-reveal-state="pending"]` prazan na dnu
stranice, i `document.querySelectorAll('.reveal-word').length === 0` posle završetka.
