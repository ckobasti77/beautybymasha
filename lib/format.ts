/**
 * Formatiranje po docs/BRAND.md → Glas: cene `2.300 RSD`, trajanja `45 min`, `1 h 30 min`.
 * Bez Intl (Convex runtime nema pun ICU) i bez React importa.
 */

/** 2300 → "2.300" (tačka kao hiljadarski separator, bez decimala). */
export function formatNumber(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.round(Math.abs(n));
  return sign + String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 2300 → "2.300 RSD". */
export function formatRsd(n: number): string {
  return `${formatNumber(n)} RSD`;
}

/** 105 → "1 h 45 min", 60 → "1 h", 45 → "45 min". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h} h`;
  return `${h} h ${rest} min`;
}

/** 10 → "10%". */
export function formatPercent(n: number): string {
  return `${formatNumber(n)}%`;
}
