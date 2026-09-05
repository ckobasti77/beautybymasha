/**
 * Reči koje panel koristi na više mesta.
 *
 * Pravilo iz docs/ADMIN.md: bez žargona. U bazi piše `status: "nov"`, vlasnici
 * piše „Čeka potvrdu“. Greška kaže šta da uradi, ne šta je puklo.
 */
import type { Doc } from "@/convex/_generated/dataModel";
import { RESOURCE_LABELS, locationByKey, type LocationKey, type ResourceKey } from "@/lib/site";

export type BookingStatus = Doc<"bookings">["status"];
export type OrderStatus = Doc<"orders">["status"];
export type InquiryStatus = Doc<"inquiries">["status"];

export const BOOKING_STATUS_LABEL: Readonly<Record<BookingStatus, string>> = {
  nov: "Čeka potvrdu",
  potvrdjen: "Potvrđen",
  otkazan: "Otkazan",
  odbijen: "Odbijen",
};

export const BOOKING_STATUS_TONE: Readonly<Record<BookingStatus, "warning" | "success" | "neutral" | "danger">> = {
  nov: "warning",
  potvrdjen: "success",
  otkazan: "neutral",
  odbijen: "neutral",
};

export const ORDER_STATUS_LABEL: Readonly<Record<OrderStatus, string>> = {
  nova: "Nova",
  u_obradi: "U obradi",
  poslata: "Poslata",
  zavrsena: "Završena",
  otkazana: "Otkazana",
};

export const ORDER_STATUS_TONE: Readonly<Record<OrderStatus, "warning" | "mint" | "success" | "neutral">> = {
  nova: "warning",
  u_obradi: "mint",
  poslata: "mint",
  zavrsena: "success",
  otkazana: "neutral",
};

/** Sledeći korak porudžbine — panel nudi samo njega, ne ceo spisak statusa. */
export const ORDER_NEXT: Readonly<Record<OrderStatus, { status: OrderStatus; label: string } | null>> = {
  nova: { status: "u_obradi", label: "Uzmi u obradu" },
  u_obradi: { status: "poslata", label: "Označi kao poslatu" },
  poslata: { status: "zavrsena", label: "Označi kao završenu" },
  zavrsena: null,
  otkazana: null,
};

export const INQUIRY_STATUS_LABEL: Readonly<Record<InquiryStatus, string>> = {
  nova: "Nova",
  procitana: "U obradi",
  odgovorena: "Rešeno",
};

export const PAYMENT_STATUS_LABEL: Readonly<Record<Doc<"orders">["paymentStatus"], string>> = {
  nije_potrebno: "Plaća se pri preuzimanju",
  ceka_uplatu: "Čeka uplatu",
  placeno: "Uplata potvrđena",
};

/** Razlozi odbijanja koje nudimo — da ne mora da kuca između dve mušterije. */
export const REJECT_REASONS = [
  "Termin je u međuvremenu popunjen",
  "Tog dana ne radimo",
  "Nema slobodne radnice za tu uslugu",
  "Nismo uspeli da vas dobijemo telefonom",
] as const;

export function locationName(key: LocationKey): string {
  return locationByKey(key).name;
}

export function resourceName(key: ResourceKey): string {
  return RESOURCE_LABELS[key];
}

/**
 * Greška u panelu: `ConvexError` sa našom porukom se prikazuje doslovno (te su
 * pisane da kažu šta da uradi). Sve ostalo je pad na našoj strani — tada joj se
 * ne pokazuje stack, nego šta sada.
 */
export function errorText(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === "string" && data.trim()) return data;
  }
  if (err instanceof Error && /network|failed to fetch/i.test(err.message)) {
    return "Nema veze sa internetom. Proverite mrežu pa pokušajte ponovo.";
  }
  return "Izmena nije sačuvana. Pokušajte ponovo za koji trenutak.";
}

/** „za 20 min“, „pre 2 h“, „juče“ — koliko je toga bilo, bez punog datuma. */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = Math.round((ms - now) / 60000);
  const abs = Math.abs(diff);
  if (abs < 1) return "upravo sada";
  const unit = abs < 60 ? `${abs} min` : abs < 60 * 24 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`;
  return diff > 0 ? `za ${unit}` : `pre ${unit}`;
}
