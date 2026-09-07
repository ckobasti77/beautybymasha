# Beauty by Masha — brief projekta

> Ovaj fajl je jedini izvor istine o klijentu. Sve što je ovde označeno kao
> **[POTVRDITI]** čeka reč vlasnice — ne izmišljati, ne popunjavati.

## 1. Ko je klijent

- **Brend:** Salon `ʙᴇᴀᴜᴛʏ ʙʏ ᴍᴀsʜᴀ` (na sajtu pišemo **Beauty by Masha**)
- **Vlasnica:** Ivana **[POTVRDITI prezime i da li ime uopšte ide na sajt]**
- **Delatnost:** kozmetički salon — nokti, depilacija, masaža, trepavice i obrve
- **Grad:** Novi Beograd, Blok 67 (Belville) — elitniji deo, mešovita domaća + strana klijentela
- **Instagram:** 3.515 objava, 2.194 pratilaca — aktivan, disciplinovan brend

### Prodajni kontekst (interno, ne ide na sajt)
Lead je došao preko cold calla. Vlasnica je rekla da joj **sin pravi sajt**, ali da
on **ne može da napravi zakazivanje i prodaju proizvoda** jer „ima previše proizvoda".
To je tačka bola koju ovaj projekat gađa direktno:
1. **Onlajn zakazivanje** preko dva lokala sa realnim kapacitetom
2. **Webshop sa velikim katalogom** + bulk import (rešava „previše proizvoda")
3. **Jedan admin panel** koji oboje drži, upotrebljiv sa telefona

## 2. Lokacije

Dva lokala, oba u Belvilleu, ~100 m jedan od drugog. **Različito radno vreme.**

### Lokal 1 — „Ljubičica"
- Jurija Gagarina **14ž**, lok 1 (zgrada Ljubičica), 11070 Novi Beograd
- Radno vreme: **ponedeljak–subota 09:00–21:00**, **nedelja 10:00–20:00**
- Radi svakog dana

### Lokal 2 — „Mimoza"
- Jurija Gagarina **14i**, lok 1 (zgrada Mimoza), 11070 Novi Beograd
- Radno vreme: **utorak–subota 09:00–21:00**, **nedelja 10:00–20:00**, **ponedeljak zatvoreno**

> Napomena: 011info navodi 14ž i 14i; PlanPlus navodi 14E i 14I. Instagram bio (primarni
> izvor, ona ga sama piše) kaže **14ž** i **14i** — koristimo to.
> Instagram highlight „Nedelja 10h-17h" se ne slaže sa 011info („nedelja 10–20"). **[POTVRDITI]**

## 3. Kontakt

- **Telefon:** 064/145-1064 → `tel:+381641451064` (isti broj za oba lokala)
- **Email:** beautybymasha@yahoo.com
- **Instagram:** https://www.instagram.com/beautybymasha_belville/
- **Facebook:** https://www.facebook.com/beautybymasha
- **Threads:** beautybymasha_belville
- **Cenovnik (postojeći):** https://qmenu.rs/menu/5 — ovo zamenjujemo sajtom
- **011info profil:** član 10 godina, 28 ocena korisnika

## 4. Šta salon radi

Iz cenovnika (qmenu) + Instagram highlight-ova:

| Grupa | Usluge |
| --- | --- |
| Nega ruku | manikir, SPA ORLY manikir, trajni lak, ojačanje/korekcija/izlivanje vitaminskim ORLY gelom, nail art |
| Nega nogu | pedikir, aparaturni, medicinski, SPA ORLY pedikir, trajni lak, kurje oko, urasli nokat |
| Depilacija | topli vosak i šećerna pasta, žensko i muško telo, paketi |
| Masaža | parcijalna, terapeutska, relax, sportska, antistres, anticelulit, stopala, maderoterapija |
| Trepavice i obrve | farbanje, LASH LIFT + BOTOX, BROW LIFT + BOTOX |
| **[POTVRDITI]** | BROW lamination, KANA obrve (kana), šminkanje, detox paketi — postoje kao IG highlight ali NISU u cenovniku |

Pun cenovnik sa tačnim cenama: `data/services.json` (145 stavki, cene verbatim sa qmenu.rs).
**Trajanja su naša procena i ona ih menja u admin panelu** — u cenovniku ih nema.

## 5. Šta salon prodaje

**ORLY i ENTITY — potvrđeno fotografijom iz salona.**

Fotografija `bbm-24` sa njenog Instagrama pokazuje **ceo zid lakova** u salonu i natpis:
> „ORLY I ENTITY — ČUVENI LAKOVI BEZ ŠTETNIH SASTOJAKA — SAJAMSKI POPUST OD 10 DO 50%"

Cenovnik to potvrđuje: *SPA ORLY manikir*, *SPA ORLY pedikir*, *vitaminski ORLY gel*.
Zid na fotografiji ima nekoliko stotina bočica — to je doslovno „previše proizvoda"
zbog čega njen sin nije uspeo da napravi prodavnicu.

Tri posledice za shop:
1. **Filter po brendu od prvog dana.** `data/products.json → meta.brands` ima ORLY (aktivan)
   i ENTITY (neaktivan, katalog prazan). Kad ona pošalje ENTITY asortiman, ubacuje se
   bez ijedne prepravke koda.
2. **Popusti su obavezni.** Ona radi sezonske akcije 10–50%. Proizvod mora da ima
   `discount`, prikaz stare precrtane cene i oznaku na kartici.
3. **Masovni uvoz nije luksuz nego uslov.** Nekoliko stotina nijansi se ne kuca ručno —
   CSV/XLSX uvoz i masovni upload slika su glavni argument na pozivu.

Za demo: **70 proizvoda, dva brenda** (`data/products.json`):
- **ORLY 50** — 30 lakova, 8 baza i nadlakova, 12 nega. Sa fotografijama (AVIF).
- **ENTITY 20** — Entity One Color Couture gel lak 15 ml, prave nijanse sa entitybeauty.com.
  Prikaz je **swatch-only**: veliki krug boje sa gloss hover efektom, bez fotografije.
  Za gel lak je uzorak boje tačniji prikaz od slike bočice — i pošteniji, jer ne
  izmišljamo fotografije koje nemamo. Kad pošalje prave, dodaje se `image` i `swatchOnly` se briše.
Cene su **preračunate u RSD po srpskom maloprodajnom nivou i označene kao okvirne**
dok ona ne pošalje pravu maloprodajnu listu. **[POTVRDITI sve cene]**

### Fotografije
24 fotografije preuzete sa njenog Instagrama (`public/photos/raw/`, do 1350×1688),
konvertovane u AVIF u tri širine, u dve varijante:
- `-card` — cela njena brendirana objava (wordmark + fotografija + oznaka usluge)
- `-photo` — izvučena fotografija bez wordmarka, za hero i pozadine

Opis, alt tekst i predlog upotrebe za svaku: `data/photos.json`.
**Pravno:** slike su njene, koriste se za demo prezentaciju. Pre javnog puštanja sajta
tražiti originale i saglasnost. **[POTVRDITI]**

## 6. Tim

Sa Instagrama: **6 radnica**, sve u crnoj uniformi (timska fotografija na profilu).
Imena i raspored **[POTVRDITI]**. Zato model kapaciteta ne traži imena — vidi ADR-001.

## 7. Odluke koje je Jovan doneo (2026-09-04)

| # | Odluka |
| --- | --- |
| ADR-001 | **Kapacitet:** lokacija + paralelna mesta po grupi usluga (Nokti / Kozmetika / Masaža), bez imenovanih radnica |
| ADR-002 | **Shop:** ORLY, ~50 proizvoda, swatch boje + gloss hover, cene u RSD |
| ADR-003 | **Auth:** Convex Auth, registracija = email + lozinka + potvrda lozinke. Isti login za kupce i admin, razlika je `role` |
| ADR-004 | **Loyalty:** član dobija QR/člansku karticu u profilu; 10% popusta važi i na webu i u salonu (radnica skenira/ukuca u adminu) |
| ADR-005 | ~~**Hero:** WebGL nikad ispod 768 px; 3D bočica samo ≥ 1024 px, na telefonu velika swatch kap.~~ **POVUČENO u koraku 18.** |
| ADR-005b | **Hero (korak 18, zamenjuje ADR-005):** WebGL shader „tečni lak" i 3D bočica idu na **svakom ekranu** — odlučuje SPOSOBNOST uređaja, ne širina. Platno se montira ako ima `webgl2`, nije `prefers-reduced-motion`, `deviceMemory ≥ 4` ili `hardwareConcurrency ≥ 4` (polje kojeg nema prolazi) i prvi frejm se iscrta ispod 120 ms; ako prosek frejma u prve 2 s pređe 26 ms, platno se gasi i vraća se swatch kap (`HeroDrop`). Širina i dalje bira BUDŽET (ispod 768 px ili gruba kazaljka: dpr ≤ 1.25, bez antialiasa, low-power, 2 fBm oktave, staklo bez transmisije) i RASPORED (ispod 1024 px bočica je u donjem pojasu, 25 % visine, centrirana). **Razlog:** širina je bila gruba zamena za snagu — gasila je bočicu na telefonu koji je vozi bez problema, a palila je na slabom laptopu. Mereno na 390×844 uz 4× CPU throttle: prosek frejma 8,0 ms, p95 18,9 ms. |
| ADR-006 | **Obim za demo:** sve četiri celine rade — landing, zakazivanje, shop, admin |

## 8. Otvorena pitanja za vlasnicu

1. Tačno radno vreme oba lokala, posebno nedelja (10–17 ili 10–20?)
2. Trajanja usluga — potvrditi naše procene
3. Koliko paralelnih mesta po lokalu: nokti / kozmetika / masaža
4. Da li stvarno prodaje ORLY proizvode i po kojim cenama
5. Da li BROW lamination, kana obrve, šminkanje i detox paketi idu u cenovnik i po kojoj ceni
6. Ime koje ide na sajt (Ivana? Masha? samo brend?)
7. Pravila otkazivanja — na IG-u postoje highlight-ovi „PRAVILNIK" i „PRAVILA", nismo ih pročitali
8. Fotografije u punoj rezoluciji (za demo koristimo Instagram, posle menjamo originalima)
9. **[POTVRDITI]** Pet boja laka koje bočica u heroju ciklira — naš predlog su bestseleri, naizmenično ORLY / Entity: Vintage (mint), Kaleidoscope Eyes (roze), Red Rum Rouge (crvena), Modern Minimalist (nude), Crawford's Wine (bordo). Lista je na jednom mestu: `lib/heroColors.ts` → `HERO_COLOR_SLUGS`
10. ~~Da li 3D bočica ide i na telefon~~ — **odgovoreno u koraku 18: da.** Vidi ADR-005b; na telefonu je manja, u donjem pojasu, sa jeftinijim staklom i shaderom, a slab uređaj i dalje dobija kap.

## 9. Izvori

- https://www.instagram.com/beautybymasha_belville/ — bio, adrese, telefon, vizuelni identitet, tim
- https://www.011info.com/kozmeticki-saloni/salon-beauty-by-masha — adrese, radno vreme, email, usluge
- https://www.planplus.rs/beograd/firma/kozmeticki-salon-beauty-by-masha/2723 — potvrda dve lokacije
- https://qmenu.rs/menu/5 — pun cenovnik, 145 stavki
- https://orlybeauty.com/collections/all-nail-lacquer — katalog proizvoda
