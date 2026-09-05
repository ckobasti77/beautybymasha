# Admin panel — specifikacija

> Ovo je proizvod koji prodajemo. Sve ostalo je izlog.
> Korisnica: vlasnica salona, ~40 godina, **na telefonu, izmedju dve musterije**.
> Ako neka radnja traži više od tri dodira ili objašnjenje, dizajn je pogrešan.

## Principi

1. **Mobilni je primarni**, desktop je bonus. Panel se projektuje na 390 px pa širi.
2. **Nikad ne pitaj dva puta.** Svaka izmena se čuva odmah, sa `Sačuvano` potvrdom.
   Bez `Sačuvaj` dugmadi po formama osim kod kreiranja.
3. **Tap-target ≥ 44 px.** Uvek. Cene, sati i količine imaju `tabular-nums`.
4. **Nulto stanje uči.** Prazan tab objašnjava šta ide u njega i nudi jednu radnju.
5. **Destruktivno traži potvrdu** i uvek nudi `Poništi` u toastu 8 sekundi.
6. **Bez žargona.** Ne „status: pending" nego „Čeka potvrdu".
7. `data-reveal="off"` na celom panelu — word-by-word reveal ovde nema smisla.

## Pristup (ADR-003)

Jedan Convex Auth sistem. `users.role: "admin" | "staff" | "customer"`.
`/admin` je server-side zaštićen: nema role → redirect na `/nalog`. `robots: noindex`.
`staff` vidi Danas, Zahtevi, Kalendar i Loyalty; **ne vidi** Promet, Proizvode ni Podešavanja.

## Navigacija

Mobilni: donja traka sa 5 ikonica (Danas · Zahtevi · Kalendar · Shop · Još) + `Još` otvara sheet.
Desktop: leva sidebar kolona, ikonica + naziv, aktivni tab mint pill (`layoutId`, motion).

Badge sa brojem stoji na **Zahtevi** (nepotvrđeni termini) i **Porudžbine** (nove).

## Tabovi

### 1. Danas — početni ekran
Ono što joj treba dok otključava telefon:
- Traka: `Danas 12 termina · 3 čekaju potvrdu · 2 nove porudžbine`
- Prekidač lokacije: `Ljubičica | Mimoza | Oba`
- Vremenska osa dana po grupama (Nokti / Kozmetika / Masaža), svaki termin kartica:
  ime · usluga · vreme · telefon; dodir otvara sheet sa `Pozovi`, `Viber`, `Pomeri`, `Otkaži`
- Ispod: `Promet danas` (usluge + shop), mala brojka, bez grafikona

### 2. Zahtevi
Lista nepotvrđenih zahteva, najnoviji gore. Kartica pokazuje sve što joj treba za odluku
(ime, telefon, usluga, trajanje, lokacija, termin, napomena) i dva dugmeta:
**Potvrdi** (mint) i **Odbij** (obrub). Odbijanje traži razlog iz ponuđene liste ili ostavlja prazno.
Potvrda šalje SMS-oblik poruke **[POTVRDITI kanal: email / Viber / SMS]** i upisuje u kalendar.

### 3. Kalendar
Nedeljni prikaz po lokaciji, kolone = dani, redovi = sati, **trake po grupi resursa**.
Preuzeti mehaniku iz `_ref/colorcutchris/app/admin/CalendarTab.tsx` (738 linija, radi dobro)
i proširiti na `location × resource`. Dodir na prazno mesto = ručni upis termina.
Dodir na termin = sheet sa izmenom. Prevlačenje levo/desno menja nedelju.

### 4. Radno vreme
Po lokaciji: sedam dana, svaki sa jednom ili više smena (`+ Dodaj smenu` za podeljeno radno vreme).
Ispod: **Izuzeci** — `Neradni dan` (praznik, godišnji) i `Posebno radno vreme` za konkretan datum.
I dalje ispod: **Pauze** — blokirano vreme unutar dana.
Podrazumevane vrednosti dolaze iz `data/site.json`; čim sačuva svoje, baza ima prednost.

### 5. Usluge
144 stavke — bez pretrage je neupotrebljivo.
- Pretraga po nazivu na vrhu (uvek vidljiva, `sticky`)
- Grupe kao akordeon, zapamćeno stanje
- Red usluge: naziv · **trajanje** (stepper ±5 min) · **cena** (inline unos) · prekidač `Vidljivo na sajtu`
- Baner dok ne potvrdi trajanja: „Trajanja su naša procena — proverite ih pre nego što pustimo zakazivanje."
- `+ Nova usluga` — naziv, grupa, trajanje, cena

### 6. Kapacitet (ADR-001)
Po lokaciji, po grupi resursa: koliko ljudi radi istovremeno.
Tri steppera: `Nokti 3` · `Kozmetika 1` · `Masaža 1`. Jedan ekran, deset sekundi.
Ispod, jednom rečenicom: „U Ljubičici u isto vreme mogu da rade 3 manikira, 1 depilacija i 1 masaža."

### 7. Proizvodi
- Mreža sa swatch-om, nazivom, cenom i stanjem; filter po kategoriji i stanju
- Uređivanje u sheet-u: naziv, kategorija, cena, popust %, stanje, opis, boja swatch-a, slike
- **Uvoz iz tabele** — ovo je razlog zašto nas zovu:
  - `Uvezi CSV/XLSX` → prikaz mapiranja kolona → pregled prvih 20 redova → `Uvezi`
  - Uparivanje po `sku`; postojeće ažurira, nova dodaje, ništa ne briše bez potvrde
  - Izveštaj: `38 ažurirano · 12 novo · 2 preskočeno (nedostaje cena)`
  - `Izvezi CSV` da može da radi u Excelu pa vrati
- **Masovni upload slika**: prevuci 50 slika, uparuje po nazivu fajla = `sku` ili `slug`
- Brze radnje na više odabranih: promeni cenu za %, uključi/isključi, postavi popust

### 8. Porudžbine
Preuzeti iz `_ref/studio-lady-gaga` (`app/admin/evidencija-narudzbina`, `convex/orders.ts`).
Statusi na srpskom: `Nova` → `U obradi` → `Poslata` → `Završena`.
Kartica: broj, kupac, stavke, iznos, način plaćanja, **loyalty popust ako je primenjen**.
Za IPS plaćanje: `Uplata potvrđena` dugme i poziv na broj radi prepoznavanja na izvodu.

### 9. Loyalty (ADR-004)
- Pretraga člana po broju kartice, imenu, telefonu ili emailu
- **Skener** (`getUserMedia` + `BarcodeDetector`, fallback na ručni unos) za QR sa telefona članice
- Kartica člana: ime, broj, status popusta, istorija korišćenja
- Dugme **`Iskoristi 10%`** — upisuje korišćenje, prikazuje potvrdu, popust se troši
- Lista svih članova, sortirana po poslednjoj poseti

### 10. Galerija
Upload u Convex storage, prevlačenje za redosled, `Istaknuto` za naslovnu.

### 11. Poruke
Kontakt forma sa sajta. Statusi `Nova` / `U obradi` / `Rešeno`.

### 12. Podešavanja
Korak termina, koliko unapred se mora zakazati, horizont, koliko dugo zahtev čeka,
poštarina i prag za besplatnu dostavu, loyalty procenat, tekstovi obaveštenja.

## Šta panel NIKAD ne radi

- Ne briše porudžbine ni termine trajno bez arhive
- Ne pokazuje tehničke greške — samo šta da uradi
- Ne traži da se ista stvar unese na dva mesta (cena usluge je na jednom mestu)
