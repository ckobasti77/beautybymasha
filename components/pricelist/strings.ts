/**
 * Sav tekst cenovnika na jednom mestu. Persiranje, konkretno, bez „vrhunski"
 * (docs/BRAND.md §8, skill `humanizer`). Nazivi usluga i cene NISU ovde — oni su
 * verbatim iz `data/services.json`.
 *
 * Dugme je „Zakažite" (vi-forma kao nav „Zakažite" i „Pošaljite zahtev"), ne „Zakaži"
 * iz spec-a. Ako vlasnica hoće kraće, menja se samo `book` ovde.
 */
import { plural } from "@/lib/format";
import { site } from "@/lib/site";

const usluge = (n: number) => `${n} ${plural(n, "usluga", "usluge", "usluga")}`;

export const priceList = {
  lead: "Cene su iste kao u salonu. Trajanje je procena, po njemu se računa slobodan termin. Izaberite grupu ili kucajte šta tražite, pa zakažite pravo iz cenovnika.",
  search: {
    label: "Pretraga cenovnika",
    placeholder: "manikir, gel, obrve, vosak…",
  },
  chips: {
    group: "Grupa usluga",
    all: "Sve",
    sub: "Vrsta depilacije",
    subAll: "Sve vrste",
  },
  count: {
    all: (n: number, groups: number) => `${usluge(n)} u ${groups} ${plural(groups, "grupi", "grupe", "grupa")}`,
    chip: (rows: number, addons: number) =>
      addons > 0 ? `${usluge(rows)} i ${addons} ${plural(addons, "dodatak", "dodatka", "dodataka")}` : usluge(rows),
    search: (n: number, query: string) => `${n} ${plural(n, "pogodak", "pogotka", "pogodaka")} za „${query}"`,
  },
  mostWanted: {
    title: "Najčešće se zakazuje",
    hint: "Ako tražite nešto drugo, izaberite grupu ili kucajte u pretragu.",
  },
  book: "Zakažite",
  bookAria: (title: string) => `Zakažite: ${title}`,
  onRequest: "na upit",
  call: "Pozovite",
  ask: "Raspitajte se",
  packageBadge: (sessions: number) => `paket od ${sessions}`,
  addons: "Dodaci uz uslugu, biraju se u salonu:",
  showAll: (chipTitle: string, n: number) => `Sve usluge u grupi ${chipTitle} (${n})`,
  lacquers: {
    title: "Lakovi koje koristimo",
    sub: "ORLY i Entity, isti kao u salonu. Kupujete ih i onlajn.",
  },
  empty: {
    text: (query: string) => `Nema „${query}" u cenovniku. Pozovite nas, možda radimo i to.`,
    call: `Pozovite ${site.phone.display}`,
  },
  source: (source: string) => `Izvor cena: ${source}. Trajanja su procena salona.`,
} as const;
