import { ConvexError } from "convex/values";
import { site } from "../../lib/site";

/** Poruke grešaka koje stižu do korisnika (ConvexError.data). Latinica, ti-forma. */
export const MESSAGES = {
  name: "Upiši ime i prezime (2–60 znakova).",
  phone: "Upiši ispravan broj telefona (npr. 060 123 4567).",
  email: "Upiši ispravnu imejl adresu.",
  dateFormat: "Upiši ispravan datum.",
  datePast: "Izaberi današnji ili neki naredni dan.",
  horizon: "Taj dan je predaleko unapred — izaberi bliži.",
  closed: "Tog dana taj salon ne radi — izaberi drugi dan ili drugi lokal.",
  service: "Izaberi uslugu.",
  location: "Izaberi lokal.",
  note: "Napomena može imati najviše 300 znakova.",
  rateLimit: `Previše zahteva. Pozovi ${site.phone.display}.`,
  taken: "Termin je upravo popunjen — izaberi drugi.",
  overlap: "Nema slobodnog mesta u tom terminu.",
  range: "Neispravan vremenski opseg.",
  price: "Neispravna cena.",
  duration: "Neispravno trajanje.",
  capacity: "Neispravan kapacitet.",
  transition: "Promena statusa nije dozvoljena.",
  notFound: "Termin nije pronađen.",
  serviceExists: "Usluga sa tim ključem već postoji.",
} as const;

export const NOTE_MAX = 300;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX = 3;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s/()-]/g, "");
}

/** Srpski brojevi: +381… ili 0… sa 7–11 cifara posle prefiksa. */
export function isValidPhone(normalized: string): boolean {
  return /^(\+381|0)\d{7,11}$/.test(normalized);
}

export function validateName(raw: string): string {
  const name = raw.trim();
  if (name.length < 2 || name.length > 60) throw new ConvexError(MESSAGES.name);
  return name;
}

export function validatePhone(raw: string): string {
  const phone = normalizePhone(raw);
  if (!isValidPhone(phone)) throw new ConvexError(MESSAGES.phone);
  return phone;
}

/** Imejl je opcion — prazno polje prolazi, pogrešno ne. */
export function validateEmail(raw: string | undefined): string | undefined {
  const email = raw?.trim().toLowerCase();
  if (!email) return undefined;
  if (email.length > 120 || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email)) throw new ConvexError(MESSAGES.email);
  return email;
}

export function validateNote(raw: string | undefined): string | undefined {
  const note = raw?.trim();
  if (!note) return undefined;
  if (note.length > NOTE_MAX) throw new ConvexError(MESSAGES.note);
  return note;
}

/** Opsezi moraju biti unutar dana, start < end, sortirani i bez preklapanja. */
export function validateRanges(ranges: readonly { startMin: number; endMin: number }[]): void {
  let lastEnd = -1;
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  for (const r of sorted) {
    if (!Number.isInteger(r.startMin) || !Number.isInteger(r.endMin)) throw new ConvexError(MESSAGES.range);
    if (r.startMin < 0 || r.endMin > 24 * 60 || r.startMin >= r.endMin) throw new ConvexError(MESSAGES.range);
    if (r.startMin < lastEnd) throw new ConvexError(MESSAGES.range);
    lastEnd = r.endMin;
  }
}

/** Kratak slobodan tekst (razlog pauze, napomena izuzetka). */
export function shortText(raw: string | undefined): string | undefined {
  return raw?.trim().slice(0, 120) || undefined;
}
