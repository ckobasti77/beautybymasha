/**
 * Datumi na srpskom, latinica. Bez `Intl` — `sr-Latn-RS` u različitim runtime-ovima
 * vraća čas ćirilicu čas latinicu, a nedeljna traka mora da izgleda isto svuda.
 * Ulaz je uvek `YYYY-MM-DD` (isti format kao `lib/slots.ts`).
 */

export const WEEKDAYS_LONG = [
  "nedelja",
  "ponedeljak",
  "utorak",
  "sreda",
  "četvrtak",
  "petak",
  "subota",
] as const;

export const WEEKDAYS_SHORT = ["ned", "pon", "uto", "sre", "čet", "pet", "sub"] as const;

export const MONTHS = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
] as const;

/** Dan u nedelji nezavisan od vremenske zone: 0 = nedelja … 6 = subota. */
function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function parts(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

/** „5" */
export function formatDayNumber(date: string): string {
  return String(parts(date).d);
}

/** „sub" */
export function formatWeekdayShort(date: string): string {
  return WEEKDAYS_SHORT[weekday(date)];
}

/** „subota, 5. septembar 2026." — za `aria-label`, gde skraćenice ne pomažu. */
export function formatDayLong(date: string): string {
  const { y, m, d } = parts(date);
  return `${WEEKDAYS_LONG[weekday(date)]}, ${d}. ${MONTHS[m - 1]} ${y}.`;
}

/** „sub, 5. septembar" — rezime termina. */
export function formatDayMedium(date: string): string {
  const { m, d } = parts(date);
  return `${WEEKDAYS_SHORT[weekday(date)]}, ${d}. ${MONTHS[m - 1]}`;
}

/** „septembar 2026." */
export function formatMonthYear(date: string): string {
  const { y, m } = parts(date);
  return `${MONTHS[m - 1]} ${y}.`;
}

/** Naslov nedeljne trake; prozor od 7 dana ume da pređe mesec ili godinu. */
export function formatWeekTitle(first: string, last: string): string {
  const a = parts(first);
  const b = parts(last);
  if (a.y === b.y && a.m === b.m) return formatMonthYear(first);
  if (a.y === b.y) return `${MONTHS[a.m - 1]} i ${MONTHS[b.m - 1]} ${b.y}.`;
  return `${formatMonthYear(first)} i ${formatMonthYear(last)}`;
}
