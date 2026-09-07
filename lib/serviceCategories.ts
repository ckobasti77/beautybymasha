/**
 * Pet krugova u sekciji „Usluge" (docs/BRAND.md §7). Krug je samo omotač oko
 * postojećih grupa iz `data/services.json` — nijedna nova usluga se ovde ne izmišlja.
 *
 * [POTVRDITI] BRAND.md peti krug zove „Nega lica", ali u njenom cenovniku nema
 * nijedne usluge nege lica. Grupa `ostalo` (brow lamination, kana, šminkanje,
 * detox paket) postoji samo kao Instagram highlight i nema cene — zato peti krug
 * nosi naziv te grupe, a ne izmišljenu kategoriju.
 */
import { serviceGroups, services, type ServiceGroupKey } from "./services";
import { assert } from "./data-guard";

export const SERVICE_CATEGORY_KEYS = ["nokti", "depilacija", "masaza", "pogled", "ostalo"] as const;
export type ServiceCategoryKey = (typeof SERVICE_CATEGORY_KEYS)[number];

export type ServiceCategory = {
  readonly key: ServiceCategoryKey;
  readonly title: string;
  /** Jedna rečenica ispod naslova kruga. */
  readonly blurb: string;
  readonly groups: readonly ServiceGroupKey[];
  /** Fotografija iz `data/photos.json` koja stoji u krugu. */
  readonly photoId: string;
};

const CATEGORIES: readonly ServiceCategory[] = [
  {
    key: "nokti",
    title: "Nokti",
    blurb: "Manikir, pedikir, trajni lak i ojačanje ORLY gelom.",
    groups: ["nega-ruku", "nega-nogu"],
    photoId: "bbm-05",
  },
  {
    key: "depilacija",
    title: "Depilacija",
    blurb: "Topli vosak i šećerna pasta, žensko i muško telo.",
    groups: ["depilacija-vosak-z", "depilacija-vosak-m", "depilacija-pasta-z", "depilacija-pasta-m"],
    photoId: "bbm-25",
  },
  {
    key: "masaza",
    title: "Masaža",
    blurb: "Relax, sportska, anticelulit i maderoterapija.",
    groups: ["masaza"],
    photoId: "bbm-27",
  },
  {
    key: "pogled",
    title: "Trepavice i obrve",
    blurb: "Farbanje, lash lift i brow lift sa botoksom.",
    groups: ["trepavice-obrve"],
    photoId: "bbm-09",
  },
  {
    key: "ostalo",
    title: "Ostalo",
    blurb: "Brow lamination, kana, šminkanje i detox paket. Cena na upit.",
    groups: ["ostalo"],
    photoId: "bbm-26",
  },
];

for (const c of CATEGORIES) {
  for (const g of c.groups) {
    assert(
      serviceGroups.some((x) => x.key === g),
      `serviceCategories: grupa "${g}" ne postoji u services.json`,
    );
  }
}
assert(
  serviceGroups.every((g) => CATEGORIES.some((c) => c.groups.includes(g.key))),
  "serviceCategories: postoji grupa koju nijedan krug ne pokriva",
);

export const serviceCategories: readonly ServiceCategory[] = CATEGORIES;

export function countServicesIn(category: ServiceCategory): number {
  return services.filter((s) => category.groups.includes(s.group)).length;
}

/** Krug u kome živi grupa — za skok iz „Usluge" u cenovnik sa filterom. */
export function categoryOfGroup(group: ServiceGroupKey): ServiceCategory | undefined {
  return CATEGORIES.find((c) => c.groups.includes(group));
}

/**
 * Pretraga bez dijakritike i bez veličine slova: „secer" pronalazi „šećernom".
 * Latinica sa kvačicama se svodi na osnovno slovo, `đ` na `dj`.
 */
export function foldSerbian(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("đ", "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
