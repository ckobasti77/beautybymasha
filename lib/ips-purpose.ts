/**
 * Skraćeni nazivi proizvoda i svrha uplate za IPS QR kod.
 *
 * IPS standard NBS-a dozvoljava najviše 35 karaktera u polju "svrha plaćanja" (S),
 * pa se nazivi proizvoda skraćuju i, ako i dalje ne staju, sažimaju u "+N".
 * Modul je čist TS bez Node/browser API-ja jer ga koristi i Convex server.
 */

export const PURPOSE_MAX_LENGTH = 35;
export const SHORT_NAME_MAX_LENGTH = 14;

const DIACRITICS: Record<string, string> = {
  č: "c", Č: "C",
  ć: "c", Ć: "C",
  š: "s", Š: "S",
  ž: "z", Ž: "Z",
  đ: "dj", Đ: "Dj",
};

const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_ASCII = /[^ -~]/g;

/** IPS polja moraju da ostanu ASCII-bezbedna — banke različito tretiraju dijakritike. */
export function toAscii(value: string) {
  return value
    .replace(/[čČćĆšŠžŽđĐ]/g, (match) => DIACRITICS[match] ?? match)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(NON_ASCII, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reči koje ne nose značenje u skraćenici. */
const FILLER = new Set([
  "za", "i", "sa", "od", "the", "of", "ml", "gr", "g", "l", "kom", "kg", "x",
]);

function isFiller(word: string) {
  const lower = word.toLowerCase();
  if (FILLER.has(lower)) return true;
  // Čisto numeričke oznake pakovanja ("250", "250ml") ne pomažu pri prepoznavanju.
  return /^\d+(ml|gr|g|l|kg)?$/i.test(lower);
}

/**
 * Skraćeni naziv proizvoda za uplatnicu.
 * Ako je admin uneo `shortName`, on ima prednost.
 */
export function productShortName(title: string, shortName?: string | null) {
  const manual = toAscii(shortName ?? "");
  if (manual.length > 0) {
    return manual.slice(0, SHORT_NAME_MAX_LENGTH).trim();
  }

  const words = toAscii(title)
    .split(" ")
    .filter((word) => word.length > 0 && !isFiller(word));

  const source = words.length > 0 ? words : toAscii(title).split(" ").filter(Boolean);
  if (source.length === 0) return "Proizvod";

  const parts = source.slice(0, 2).map((word) => (word.length > 6 ? word.slice(0, 6) : word));
  return parts.join(" ").slice(0, SHORT_NAME_MAX_LENGTH).trim();
}

/**
 * Svrha uplate — nazivi proizvoda koliko god ih stane u 35 karaktera,
 * a ostatak se sažima u "+N".
 */
export function buildPaymentPurpose(names: string[]): string {
  const cleaned = names.map((name) => toAscii(name)).filter((name) => name.length > 0);
  if (cleaned.length === 0) return "Porudzbina";

  for (let take = cleaned.length; take >= 1; take -= 1) {
    const rest = cleaned.length - take;
    const suffix = rest > 0 ? ` +${rest}` : "";
    const candidate = `${cleaned.slice(0, take).join(", ")}${suffix}`;
    if (candidate.length <= PURPOSE_MAX_LENGTH) {
      return candidate;
    }
  }

  // Ni jedan naziv ne staje sam — skrati prvi i zadrži brojač ostatka.
  const rest = cleaned.length - 1;
  const suffix = rest > 0 ? ` +${rest}` : "";
  return `${cleaned[0].slice(0, PURPOSE_MAX_LENGTH - suffix.length).trim()}${suffix}`;
}

/**
 * Poziv na broj — samo cifre iz broja porudžbine (npr. SLG-20260731-0042 → 202607310042).
 * IPS dozvoljava do 20 karaktera uz model 00.
 */
export function buildPaymentReference(orderNumber: string) {
  const digits = orderNumber.replace(/\D/g, "").slice(0, 20);
  return digits.length > 0 ? digits : "0";
}
