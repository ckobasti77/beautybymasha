/**
 * Njene fotografije iz data/photos.json (Instagram, ručno spuštene i konvertovane u AVIF).
 * BEZ React importa. Svaka ima dva reza: `card` (za kartice/mrežu) i `photo` (pun kadar),
 * u širinama iz `widths` (`/photos/<id>-card-<w>.avif`). `alt` je opis koji smo napisali.
 */
import raw from "../data/photos.json";
import { assert } from "./data-guard";

export type Photo = {
  readonly id: string;
  readonly widths: readonly number[];
  /** Najveći rez za kartice. */
  readonly card: string;
  /** Najveći pun kadar. */
  readonly photo: string;
  /** širina / visina */
  readonly aspect: number;
  readonly alt: string;
  readonly tags: readonly string[];
  readonly use: readonly string[];
};

type RawPhoto = {
  widths: number[];
  card: string;
  photo: string;
  aspect: number;
  alt: string;
  tags?: string[];
  use?: string[];
};

function parsePhoto(id: string, p: RawPhoto): Photo {
  assert(/^[a-z0-9-]+$/.test(id), `photo ${id}: id sme da sadrži samo a-z, 0-9 i -`);
  assert(Array.isArray(p.widths) && p.widths.length > 0, `photo ${id}: widths`);
  assert(p.card.startsWith("/photos/") && p.card.endsWith(".avif"), `photo ${id}: card mora biti /photos/…avif`);
  assert(p.photo.startsWith("/photos/") && p.photo.endsWith(".avif"), `photo ${id}: photo mora biti /photos/…avif`);
  assert(typeof p.aspect === "number" && p.aspect > 0, `photo ${id}: aspect`);
  assert(typeof p.alt === "string" && p.alt.trim().length > 0, `photo ${id}: alt je obavezan`);
  return {
    id,
    widths: [...p.widths].sort((a, b) => a - b),
    card: p.card,
    photo: p.photo,
    aspect: p.aspect,
    alt: p.alt,
    tags: p.tags ?? [],
    use: p.use ?? [],
  };
}

/** Ključevi koji počinju sa `_` (npr. `_meta`) nisu fotografije. */
const all: readonly Photo[] = Object.entries(raw as Record<string, unknown>)
  .filter(([id]) => !id.startsWith("_"))
  .map(([id, p]) => parsePhoto(id, p as RawPhoto));

export const photos: readonly Photo[] = all;
export const photosMeta = ((raw as Record<string, unknown>)._meta ?? {}) as Readonly<Record<string, unknown>>;

export function photoById(id: string): Photo | undefined {
  return all.find((p) => p.id === id);
}

export function photosByUse(use: string): readonly Photo[] {
  return all.filter((p) => p.use.includes(use));
}

export function photosByTag(tag: string): readonly Photo[] {
  return all.filter((p) => p.tags.includes(tag));
}

/** Putanja određene širine: `/photos/bbm-01-card-640.avif`. */
export function photoSrc(photo: Photo, variant: "card" | "photo", width: number): string {
  return `/photos/${photo.id}-${variant}-${width}.avif`;
}

/** `sizes`/`srcSet` pomoć za next/image sa `unoptimized` ili za <picture>. */
export function photoSrcSet(photo: Photo, variant: "card" | "photo"): string {
  return photo.widths.map((w) => `${photoSrc(photo, variant, w)} ${w}w`).join(", ");
}
