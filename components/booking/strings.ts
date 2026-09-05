/**
 * Sav tekst čarobnjaka na jednom mestu. Persiranje, konkretno, bez „vrhunski" i
 * bez „nezaboravnog iskustva" (docs/BRAND.md §8, skill `humanizer`).
 *
 * Poruke grešaka sa servera stižu iz `convex/lib/validate.ts` i one su u ti-formi —
 * `serverMessage()` ih prevodi u persiranje i dodaje radnju koju treba preduzeti.
 * Nijedna greška ne sme da stigne do gosta kao „Error".
 */
import { site } from "@/lib/site";

export const STEPS = ["Lokacija", "Usluga", "Dan i vreme", "Podaci"] as const;
export type StepIndex = 0 | 1 | 2 | 3;

export const booking = {
  eyebrow: "Zakazivanje",
  title: "Izaberite termin",
  lead: "Četiri koraka. Zahtev šaljete odmah, a mi vas zovemo da ga potvrdimo.",
  stepOf: (n: number, total: number) => `Korak ${n} od ${total}`,
  next: "Dalje",
  back: "Nazad",
  submit: "Pošaljite zahtev",
  submitting: "Šaljemo zahtev…",

  location: {
    title: "U kom lokalu?",
    hint: "Oba su u Belvilleu, Blok 67, na pet minuta hoda jedan od drugog.",
    pick: "Izaberite lokal",
  },

  service: {
    title: "Koja usluga?",
    hint: "Prvo grupa, pa usluga. Ako znate naziv, kucajte ga u pretragu.",
    searchLabel: "Pretraga usluga",
    searchPlaceholder: "manikir, vosak, masaža…",
    group: "Grupa usluga",
    allGroups: "Sve grupe",
    empty: "Nema usluge sa tim nazivom. Probajte kraću reč.",
    count: (n: number) => `${n} ${n === 1 ? "usluga" : n < 5 ? "usluge" : "usluga"}`,
    pick: "Izaberite uslugu",
  },

  day: {
    title: "Kada vam odgovara?",
    weekStrip: "Izbor dana",
    prevWeek: "Prethodna nedelja",
    nextWeek: "Sledeća nedelja",
    thisWeek: "ova nedelja",
    today: "danas",
    prepodne: "Prepodne",
    popodne: "Popodne",
    slotGroup: "Izbor vremena",
    past: "dan je prošao",
    beyond: "predaleko unapred",
    closed: "zatvoreno",
    noSlots: "popunjeno",
    loading: "Tražimo slobodne termine…",
    emptyClosed: "Tog dana ovaj lokal ne radi. Izaberite drugi dan ili drugi lokal.",
    emptyToday: "Za danas više nema slobodnog termina. Izaberite neki od narednih dana.",
    emptyFull: "Tog dana je sve popunjeno. Izaberite drugi dan.",
    pickDay: "Izaberite dan",
    pickTime: "Izaberite vreme",
  },

  details: {
    title: "Vaši podaci",
    name: "Ime i prezime",
    namePlaceholder: "Marija Marković",
    phone: "Telefon",
    phonePlaceholder: "060 123 4567",
    phoneHint: "Na ovaj broj vas zovemo da potvrdimo termin.",
    email: "Imejl (nije obavezno)",
    emailPlaceholder: "marija@primer.rs",
    note: "Napomena",
    notePlaceholder: "Nešto što treba da znamo pre termina.",
    noteCount: (n: number, max: number) => `${n} / ${max}`,
    website: "Sajt",
    privacy: "Broj telefona koristimo samo da potvrdimo ovaj termin.",
  },

  /** Usluga stigla iz cenovnika (deep link `#zakazivanje?usluga=…`). */
  preset: {
    label: "Zakazujete",
    change: "Promenite uslugu",
    announced: (title: string) => `Izabrali ste: ${title}. Sledeći korak je izbor lokala.`,
  },

  summary: {
    title: "Vaš izbor",
    location: "Lokal",
    service: "Usluga",
    when: "Termin",
    duration: "Trajanje",
    price: "Cena",
    priceNote: "Cena je iz cenovnika. Trajanje je procena i može da se pomeri.",
    empty: "Popunite korake levo i rezime se sam sklapa.",
  },

  success: {
    title: "Zahtev je primljen.",
    body: (hours: number) => `Javljamo se u roku od ${hours} h da potvrdimo termin.`,
    note: "Dok ne pozovemo, termin je rezervisan za vas.",
    again: "Zakažite još jedan termin",
    call: "Zovite nas",
  },

  errors: {
    title: "Nismo poslali zahtev",
    generic: "Zahtev nije stigao do nas. Proverite vezu i pokušajte ponovo.",
    offline: "Zakazivanje trenutno nije dostupno. Pozovite nas i dogovaramo termin odmah.",
    taken: "Termin je upravo zauzet. Izaberite drugi.",
    required: "Ovo polje je obavezno.",
    name: "Upišite ime i prezime (2 do 60 znakova).",
    phone: "Upišite ispravan broj telefona, na primer 060 123 4567.",
    email: "Proverite imejl adresu.",
    note: "Napomena može imati najviše 300 znakova.",
    hint: "Ako se ponovi, dogovaramo termin telefonom.",
    callUs: "Pozovite",
    viber: "Viber",
  },
} as const;

/**
 * Serverske poruke su u ti-formi (`convex/lib/validate.ts` ih deli sa adminom).
 * Na javnom sajtu se persira, pa se mapiraju ovde; sve nepoznato pada na `generic`,
 * nikad na sirovi tekst izuzetka.
 */
const SERVER_MESSAGES: Readonly<Record<string, string>> = {
  "Upiši ime i prezime (2–60 znakova).": booking.errors.name,
  "Upiši ispravan broj telefona (npr. 060 123 4567).": booking.errors.phone,
  "Upiši ispravnu imejl adresu.": booking.errors.email,
  "Upiši ispravan datum.": "Datum nije ispravan. Izaberite dan iz trake.",
  "Izaberi današnji ili neki naredni dan.": "Izaberite današnji ili neki naredni dan.",
  "Taj dan je predaleko unapred — izaberi bliži.": "Taj dan je predaleko unapred. Izaberite bliži.",
  "Tog dana taj salon ne radi — izaberi drugi dan ili drugi lokal.": booking.day.emptyClosed,
  "Izaberi uslugu.": "Izaberite uslugu.",
  "Izaberi lokal.": "Izaberite lokal.",
  "Napomena može imati najviše 300 znakova.": booking.errors.note,
  "Termin je upravo popunjen — izaberi drugi.": booking.errors.taken,
  "Nema slobodnog mesta u tom terminu.": booking.errors.taken,
  [`Previše zahteva. Pozovi ${site.phone.display}.`]:
    `Poslali ste više zahteva zaredom. Pozovite nas na ${site.phone.display} i dogovaramo termin odmah.`,
};

export function serverMessage(raw: unknown): string {
  if (typeof raw !== "string") return booking.errors.generic;
  return SERVER_MESSAGES[raw] ?? booking.errors.generic;
}

/** Da li poruka znači „slot je nestao" — tada gosta vraćamo na izbor vremena. */
export function isSlotGone(message: string): boolean {
  return message === booking.errors.taken;
}
