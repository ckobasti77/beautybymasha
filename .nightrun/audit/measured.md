# Izmereno na produkciji (beautybymasha-mu.vercel.app), 7. 9. 2026.

Merio Claude direktno u browseru. Ovo NISU procene nego brojevi iz `getBoundingClientRect`
i `getComputedStyle` na zivom sajtu. Sve ide u korak 17 kao dokaz.

## 1440 x 900, landing

Ukupna visina strane: **13.957 px = 15,5 ekrana.**

| sekcija | visina | padding gore/dole |
| --- | --- | --- |
| hero | 1530 | 0 / 0 |
| usluge | 571 | 40 / 40 |
| zakazivanje | 958 | 128 / 128 |
| radovi | 2582 | 128 / 128 |
| nas-tim | 816 | 128 / 128 |
| shop | 1206 | 128 / 128 |
| **cenovnik** | **3970** | 128 / 128 |
| lokacije | 841 | 128 / 128 |
| recenzije | 628 | 128 / 128 |

**Rupe izmedju sekcija** (od dna poslednjeg vidljivog elementa do vrha prvog sledeceg):

| prelaz | rupa |
| --- | --- |
| hero -> usluge | **980 px** |
| usluge -> zakazivanje | 152 px |
| zakazivanje -> radovi | **650 px** |
| radovi -> nas-tim | **958 px** |
| nas-tim -> shop | 239 px |
| shop -> cenovnik | 256 px |
| cenovnik -> lokacije | 256 px |
| lokacije -> recenzije | 277 px |

256 px = 128 (dno prethodne) + 128 (vrh sledece) — dupli ritam na svakom spoju. Tri prelaza su
preko 650 px, sto je vise od dve trecine ekrana praznog.

**Naslov sekcije -> prvi sadrzaj**, nedosledno: usluge 159, radovi 135, lokacije 135, cenovnik 119,
shop 111, recenzije 103, zakazivanje 97. Ista uloga, sedam razlicitih razmaka.

## 390 x 844 (telefon), landing

- Ukupna visina: **16.580 px = 19,6 ekrana skrola.**
- `#cenovnik` = **4.248 px (5 ekrana)**, 150 redova — ceo cenovnik od 144 usluge stoji na landingu.
- `#radovi` = 2.906 px, 22 slike u galeriji na landingu.
- `#hero` = 1.097 px.
- **32 interaktivna elementa niza od 44 px.** Najgori: linkovi „Zakazite" u cenovniku — 68 x 17 px.
- Horizontalnog prekoracenja NEMA (dobro).
- `--nav-h` = 64 px.

## Ostalo
- Podrazumevana tema je bila `data-theme="dark"` uz prazan localStorage pri prvom otvaranju
  (kasnije `rgb(250,246,241)` — svetla). Proveriti sta je zaista podrazumevano; salon sa krem/mint
  brendom koji se prvi put otvara u crnom je odluka koju treba doneti svesno, ne slucajno.
- `text-fg-muted` = rgb(90,84,80) na rgb(250,246,241) ~ 6,4:1 — prolazi AA.
