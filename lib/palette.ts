/**
 * Iste hex vrednosti kao u app/globals.css, za mesta gde CSS var nije dostupan:
 * shader uniformi (hero), OG slika, favicon, kontrolna tabla.
 * Izvor: data/design-dna.json → design_system.color + docs/BRAND.md.
 * Ako menjaš ovde — menjaj i globals.css. (Bez React importa.)
 */
export const palette = {
  mint: "#57BFA8",
  mintDeep: "#2E8E7B",
  mintSoft: "#C9E9E1",
  mintWash: "#F0F9F6",
  rose: "#E85A9B",
  roseSoft: "#FBDCE9",
  ink: "#12100F",
  inkSoft: "#5A5450",
  paper: "#FAF6F1",
  paperElev: "#FFFFFF",
  sand: "#EDE2D6",
  success: "#2E8E7B",
  warning: "#B57A2B",
  danger: "#C0442F",
} as const;

export const neutralScale = [
  "#FAF6F1",
  "#F4EDE4",
  "#EDE2D6",
  "#D9CCBD",
  "#A79B8F",
  "#7A716A",
  "#5A5450",
  "#2B2624",
  "#12100F",
] as const;

export const darkTheme = {
  bg: "#14100E",
  bgElev: "#1E1917",
  fg: "#F5EFE9",
} as const;

/** Paleta hero shadera (DNA background_effects.params.color_palette), redom. */
export const heroPalette = [palette.mint, palette.mintSoft, palette.roseSoft, palette.paper] as const;

export type PaletteKey = keyof typeof palette;
