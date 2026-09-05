/**
 * Mali alati za validaciju data/*.json pri učitavanju modula.
 * Greška ovde obara build/dev odmah — nikad ne stiže do korisnika.
 */

export class DataError extends Error {
  constructor(message: string) {
    super(`[data] ${message}`);
    this.name = "DataError";
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DataError(message);
}

export function isOneOf<const T extends readonly string[]>(
  value: unknown,
  list: T,
): value is T[number] {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function oneOf<const T extends readonly string[]>(
  value: unknown,
  list: T,
  what: string,
): T[number] {
  assert(isOneOf(value, list), `${what}: "${String(value)}" nije jedno od ${list.join(", ")}`);
  return value;
}

export function assertUnique<T>(items: readonly T[], key: (item: T) => string, what: string) {
  const seen = new Set<string>();
  for (const item of items) {
    const k = key(item);
    assert(!seen.has(k), `${what}: duplikat "${k}"`);
    seen.add(k);
  }
}

export const HEX_RE = /^#[0-9A-F]{6}$/i;
export const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
