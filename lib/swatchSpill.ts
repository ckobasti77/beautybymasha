/**
 * „Prosute kapi" — kompozicija od 12 swatch kapi koja u ORLY sekciji na landingu menja
 * promo fotografiju `bbm-24` (spec 12 → K) dok ne stigne generisana slika zida lakova.
 *
 * BEZ React importa: izbor i raspored su čista funkcija kataloga, pa su deterministični
 * (isti HTML sa servera i klijenta) i testiraju se u vitest-u.
 */
import { bestsellers, swatchProducts, type Brand, type Product } from "./products";

export const SPILL_COUNT = 12;

export type SpillSpot = {
  /** Centar kapi po x, u % širine kutije. */
  readonly x: number;
  /** Centar kapi po y, u % visine kutije. */
  readonly y: number;
  /** Prečnik kapi, u % širine kutije. */
  readonly size: number;
};

/**
 * Dvanaest mesta, ručno raspoređenih: bez preklapanja i na kutiji 16:9 (desna polovina
 * panela na desktopu) i na traci 2:1 (ispod naslova na telefonu); gušće ka desnoj ivici,
 * da tekst levo ima vazduha. Krupnije kapi u sredini, sitnije po obodu — kao da su
 * prosute sa jedne strane.
 */
export const SPILL_LAYOUT: readonly SpillSpot[] = [
  { x: 12, y: 30, size: 13 },
  { x: 26, y: 18, size: 8 },
  { x: 30, y: 62, size: 10 },
  { x: 44, y: 36, size: 15 },
  { x: 62, y: 14, size: 9 },
  { x: 58, y: 74, size: 11 },
  { x: 76, y: 44, size: 17 },
  { x: 88, y: 18, size: 10 },
  { x: 90, y: 78, size: 12 },
  { x: 48, y: 84, size: 7 },
  { x: 72, y: 88, size: 8 },
  { x: 8, y: 74, size: 9 },
];

function isShade(p: Product): boolean {
  return p.category === "lakovi" || p.category === "gel-lak";
}

/**
 * Naizmenično po brendu (ORLY, Entity, ORLY…), prvo bestseleri pa ostale nijanse, dok se
 * ne skupi `SPILL_COUNT`. Kad jedan brend presuši, ostatak popunjava drugi — kompozicija
 * je uvek puna.
 */
export function spillPicks(count = SPILL_COUNT): readonly Product[] {
  const byBrand = (brand: Brand): Product[] => {
    const best = bestsellers.filter((p) => isShade(p) && p.brand === brand);
    const rest = swatchProducts.filter((p) => p.brand === brand && !p.bestseller);
    return [...best, ...rest];
  };
  const queues: Record<Brand, Product[]> = { orly: byBrand("orly"), entity: byBrand("entity") };
  const order: Brand[] = ["orly", "entity"];

  const out: Product[] = [];
  let i = 0;
  while (out.length < count && (queues.orly.length || queues.entity.length)) {
    const brand = order[i % order.length];
    i += 1;
    const next = queues[brand].shift();
    if (next) out.push(next);
  }
  return out;
}
