# Beauty by Masha — vizuelni DNK i dizajn sistem

> Izvučeno sa njenog Instagram profila (3.515 objava, konzistentan predložak).
> Ovaj fajl zamenjuje mockup-e: svaka stranica ima napisan raspored, a tokeni su
> jednoznačni. Ne izmišljati nove boje, senke ni fontove van ovog fajla.

## 1. Šta je već njen fazon

Njena vizuelna gramatika sa Instagrama, koju **preslikavamo, ne izmišljamo**:

- **Logo:** mint-zeleni krug, u njemu `BEAUTY` teškim zbijenim crnim slovima, ispod
  `by Masha` roze rukopisom koji blago prelazi preko donje ivice slova.
- **Predložak objave:** beo/krem papir → wordmark gore → fotografija u sredini →
  crna verzalna oznaka usluge dole (`ORLY.`, `PEDIKIR`, `LASH LIFT`).
  Ponekad vertikalni tekst uz ivicu (`ESTETSKI · MEDICINSKI · APARATURNI`).
- **Fotografija:** uvek krupni plan ruku/stopala, dnevno svetlo, bez filtera,
  prava klijentkinja, prsten/sat/farmerke ostaju u kadru. Nije stok, i ne treba da bude.
- **Tim:** šest žena u crnoj uniformi.
- **Ton:** stručan, čist, bez emotikona u naslovima, bez „luksuz/premium" fraza.

**Pravilo za ceo sajt:** sajt je **okvir za njene fotografije**, ne takmičar njima.
Boja nosi navigaciju i akcije; sadržaj nose slike.

## 2. Boje

```
--mint            #57BFA8   /* logo krug — primarni brend */
--mint-deep       #2E8E7B   /* tekst na krem, hover, fokus */
--mint-soft       #C9E9E1   /* podloge, čipovi, selektovano stanje */
--mint-wash       #F0F9F6   /* najsvetlija sekcijska podloga */

--rose            #E85A9B   /* roze iz rukopisa — SAMO akcent */
--rose-soft       #FBDCE9   /* badge podloge, loyalty */

--ink             #12100F   /* wordmark crna, glavni tekst */
--ink-soft        #5A5450   /* sekundarni tekst */

--paper           #FAF6F1   /* podloga sajta */
--paper-elev      #FFFFFF   /* kartice */
--sand            #EDE2D6   /* linije, razdvajači, prazna stanja */

--success         #2E8E7B
--warning         #B57A2B
--danger          #C0442F
```

**Kontrast (WCAG AA, provereno):**
- `--ink` na `--paper` = 15.8:1
- `--mint-deep` na `--paper` = 4.6:1 ✅ (koristi se za tekst-linkove)
- `--mint` na `--paper` = 2.2:1 ❌ — **nikad kao tekst**, samo kao površina
- `--paper` na `--mint-deep` = 4.6:1 ✅ (tekst dugmeta)
- `--rose` na `--paper` = 3.6:1 — samo za tekst ≥ 18.66px bold ili ikone

**Tamna tema:** podloga `#14100E`, elevacija `#1E1917`, tekst `#F5EFE9`,
akcent ostaje `--mint` (na tamnom prolazi kao tekst). Toggle u navigaciji.

## 3. Tipografija

| Uloga | Font | Napomena |
| --- | --- | --- |
| Wordmark i H1 | **Archivo** (variable, `wdth` 70–100, `wght` 700–800) | zbijeno i teško kao njen logo |
| Rukopisni akcent (`by Masha`, potpisi sekcija) | **Sacramento** | samo za dve-tri reči, nikad za rečenicu |
| Telo, UI, admin | **Manrope** 400/500/600/700 | pun `latin-ext` — š đ č ć ž |
| Brojevi (cene, kalendar, sati) | Manrope sa `font-variant-numeric: tabular-nums` | cene i termini se moraju poravnavati |

Sve preko `next/font/google` sa `display: "swap"` i `subsets: ["latin", "latin-ext"]`.
Nikad `@import` iz CSS-a — to blokira render (SLG projekat greši baš tu).

Skala (fluid, `clamp`): 12 · 14 · 16 · 18 · 22 · 28 · 36 · 48 · 64 · 84.
Naslovi `line-height: 0.95`, `letter-spacing: -0.02em`. Telo `1.6`.

## 4. Oblik i prostor

- Radijusi: `8` (input/čip) · `16` (kartica) · `24` (panel) · `999` (dugme, badge)
- Razmaci: skala od 4 (`4 8 12 16 24 32 48 64 96 128`)
- Senke: samo dve — `card` (`0 1px 2px rgba(18,16,15,.06), 0 8px 24px -16px rgba(18,16,15,.18)`)
  i `pop` za modal/sheet. Bez neona, bez glow-a, bez glassmorphism-a.
- **Motiv:** krug iz logotipa. Avatari, ikone kategorija, foto-maske u galeriji i
  „koraci" u zakazivanju su krugovi. To povezuje sajt sa logotipom bez ijedne dodatne slike.

## 5. Motion

Biblioteke: **Lenis** (glatki scroll), **GSAP + ScrollTrigger** (koreografija sekcija),
**motion** (bivši Framer Motion — UI stanja, admin, layout animacije), **R3F/three** (samo hero).

| Šta | Trajanje | Easing |
| --- | --- | --- |
| Hover / fokus | 150 ms | `ease-out` |
| Otvaranje panela, tab pill | 300 ms | `spring, bounce 0` |
| Ulaz sekcije (scroll) | 600 ms, stagger 60 ms | `cubic-bezier(.16,1,.3,1)` |
| Prelaz stranice | 400 ms | isto |

**Text reveal:** preuzimamo sistem iz `_ref/colorcutchris` (`lib/textReveal.ts` +
`constants/textRevealConfig.ts`) — reč po reč, nasumičnim redom, blur + podizanje.
Radi na celom javnom sajtu; **admin panel je `data-reveal="off"`**.

**`prefers-reduced-motion: reduce` gasi sve** — shader postaje statična slika,
reveal postaje običan tekst, GSAP trigeri se ne kače.

## 6. Hero — „tečni lak" (ADR-005)

React Three Fiber, jedan full-screen plane sa fragment shaderom:
- Dva-tri sloja domenski iskrivljenog fBm šuma u `--mint` → `--mint-soft` → `--rose-soft`
- Specular „mokri" highlight koji lenjo klizi — čita se kao površina laka
- Pointer gura polje (`lerp`, inercija ~0.06), scroll pomera dubinu
- **Fallback (obavezan):** ako `!WebGL2 || prefers-reduced-motion || matchMedia("(max-width: 768px)")`
  → statični CSS `radial-gradient` u istim bojama + suptilna `background-position` animacija.
  Mobilni **nikad** ne pokreće WebGL — Belville klijentela je pretežno na telefonu.
- Canvas: `dpr={[1, 1.75]}`, `frameloop="demand"` van viewporta, pauza na `visibilitychange`

Preko shadera: wordmark, jedna rečenica, dva dugmeta
(`Zakaži termin` — puno mint, `Pogledaj proizvode` — obrub).

## 7. Stranice — raspored

Sve na srpskom, latinica (`sr-Latn`), `lang="sr-Latn-RS"`.

### `/` — landing
1. **Nav** — logo levo; `Usluge · Cenovnik · Shop · Lokacije · Kontakt`; desno tema, korpa, nalog; CTA `Zakaži`
2. **Hero** — shader + naslov + 2 CTA + traka „2 lokala u Belvilleu · od 2015."
3. **Loyalty traka** *(samo za neulogovane)* — „Registruj se i ostvari **10% popusta** na sledeći račun — i u salonu i na sajtu." → `Registruj se`
4. **Usluge** — 5 krugova (Nokti · Depilacija · Masaža · Trepavice i obrve · Nega lica), svaki vodi na cenovnik sa filterom
5. **Zakazivanje** — čarobnjak ugrađen u stranicu (ne zaseban ekran)
6. **Radovi** — masonry galerija njenih fotografija, lightbox
7. **Naš tim** — jedna timska fotografija (bbm-10) + kratak opis; imena/broj **[POTVRDITI]**
8. **ORLY / Shop** — 8 istaknutih lakova sa swatch-evima → `Ceo katalog`
9. **Cenovnik** — pretraga + akordeon po grupama, sve 145 stavki, cena i trajanje
10. **Lokacije** — dve kartice rame uz rame, radno vreme svake, mapa, `Navigacija` i `Pozovi`
11. **Recenzije** — 011info ocene **[POTVRDITI da smemo da citiramo]**
12. **Kontakt / Footer** — telefon, email, IG, FB, radno vreme, pravni linkovi

### `/shop` i `/shop/[slug]`
Zid swatch-eva. Filteri: kategorija · porodica boja · finiš (crème/shimmer/glitter/holo) · cena.
Kartica = krupan swatch + ime + cena; **hover = gloss sweep** (dijagonalni specular prelazi
preko swatch-a, 600 ms) + slika proizvoda `crossfade`-uje preko swatch-a.
Detalj: velika slika, swatch, opis, količina, `Dodaj u korpu`, „Dostupno i u salonu".

### `/korpa` i `/placanje`
Preuzeto iz `_ref/studio-lady-gaga` (`contexts/cart-context.tsx`, `lib/ips-qr.ts`).
Loyalty 10% se prikazuje kao zaseban red popusta u zbiru. Pouzećem ili IPS QR.

### `/nalog`
Registracija (email · lozinka · potvrda lozinke), prijava, moja **članska kartica**
(broj + QR), istorija termina i porudžbina, status loyalty popusta.

### `/admin` — vidi `docs/ADMIN.md`

## 8. Glas

- Obraćanje na **„vi"**, toplo i konkretno. Nikad „Vaš" velikim slovom usred rečenice.
- Cene uvek `2.300 RSD` (tačka kao hiljadarski separator).
- Trajanje `45 min`, `1 h 30 min`.
- Bez „premium", „luksuz", „ekskluzivno", bez emotikona u naslovima.
- Greške kažu šta da uradiš: ne „Greška", nego „Termin je upravo zauzet — izaberite drugi."
