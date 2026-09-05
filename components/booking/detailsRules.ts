/**
 * Provera podataka na klijentu. Ista pravila kao `convex/lib/validate.ts` — ovde su
 * samo da gost dobije odgovor odmah. Merodavan je i dalje server: `bookings.create`
 * proverava sve iznova i njegova poruka pobeđuje.
 */
import { booking } from "./strings";

export { booking };

export const NOTE_MAX = 300;

export type DetailsValues = {
  name: string;
  phone: string;
  email: string;
  note: string;
  /** Honeypot. */
  website: string;
};

export type DetailsField = "name" | "phone" | "email" | "note";
export type DetailsErrors = Partial<Record<DetailsField, string>>;

export const emptyDetails: DetailsValues = { name: "", phone: "", email: "", note: "", website: "" };

/** Srpski brojevi: `+381…` ili `0…` sa 7 do 11 cifara posle prefiksa. */
export function isValidPhone(phone: string): boolean {
  return /^(\+381|0)\d{7,11}$/.test(phone.replace(/[\s/()-]/g, ""));
}

export function validateDetails(v: DetailsValues): DetailsErrors {
  const e: DetailsErrors = {};

  const name = v.name.trim();
  if (!name) e.name = booking.errors.required;
  else if (name.length < 2 || name.length > 60) e.name = booking.errors.name;

  if (!v.phone.trim()) e.phone = booking.errors.required;
  else if (!isValidPhone(v.phone)) e.phone = booking.errors.phone;

  const email = v.email.trim();
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email))) {
    e.email = booking.errors.email;
  }

  if (v.note.length > NOTE_MAX) e.note = booking.errors.note;

  return e;
}
