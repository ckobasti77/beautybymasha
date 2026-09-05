/**
 * Pretraga cenovnika sa sinonimima: „gel" nalazi „trajni lak" i „ORLY gel", „obrve"
 * nalazi i kanu i lift, „šećer" i „secer" daju isto. Bez React-a — testira se u node-u.
 *
 * Sinonimi su naši pojmovi za pretragu, ne novi nazivi usluga: naslov i cena ostaju
 * verbatim iz cenovnika, a ovo samo širi šta gost sme da ukuca.
 */
import { GROUP_LABELS } from "./priceList";
import { foldSerbian } from "./serviceCategories";
import { serviceGroupByKey, services, type Service, type ServiceGroupKey } from "./services";

type Rule = { readonly when: (s: Service) => boolean; readonly terms: string };

const inGroup =
  (...keys: readonly ServiceGroupKey[]) =>
  (s: Service) =>
    keys.includes(s.group);

const titleHas =
  (...parts: readonly string[]) =>
  (s: Service) => {
    const t = foldSerbian(s.title);
    return parts.some((p) => t.includes(foldSerbian(p)));
  };

const RULES: readonly Rule[] = [
  { when: inGroup("nega-ruku"), terms: "ruke nokti manikir" },
  { when: inGroup("nega-nogu"), terms: "noge stopala nokti pedikir" },
  { when: inGroup("depilacija-vosak-z", "depilacija-vosak-m"), terms: "depilacija vosak voskom dlake dlačice" },
  {
    when: inGroup("depilacija-pasta-z", "depilacija-pasta-m"),
    terms: "depilacija šećer šećerna pasta šugaring sugaring dlake dlačice",
  },
  { when: inGroup("depilacija-vosak-z", "depilacija-pasta-z"), terms: "žene ženska" },
  { when: inGroup("depilacija-vosak-m", "depilacija-pasta-m"), terms: "muškarci muška" },
  { when: inGroup("masaza"), terms: "masaža tretman tela opuštanje" },
  { when: inGroup("trepavice-obrve"), terms: "trepavice obrve pogled" },
  { when: titleHas("trajni lak"), terms: "gel gel lak gel-lak gelisanje shellac šelak" },
  { when: titleHas("ORLY gel"), terms: "gel nadogradnja ojačanje jačanje gel nokti" },
  { when: titleHas("Korekcija obrva"), terms: "obrve čupanje oblikovanje" },
  { when: titleHas("Lash lift"), terms: "trepavice lifting laš lift botox" },
  { when: titleHas("Brow lift"), terms: "obrve lifting laminacija botox" },
  { when: titleHas("Brow lamination"), terms: "obrve laminacija" },
  { when: titleHas("Kana"), terms: "obrve kana henna farbanje" },
  { when: titleHas("Farbanje"), terms: "boja bojenje" },
  { when: titleHas("Intima", "Prepone"), terms: "bikini brazilka brazilska intimna zona" },
  { when: titleHas("Nausnice"), terms: "brkovi brčići gornja usna nausnice" },
  { when: titleHas("Pazuh"), terms: "pazusi ispod pazuha" },
  { when: titleHas("Aparaturni"), terms: "aparat mašinski" },
  { when: titleHas("Medicinski"), terms: "podološki podolog" },
  { when: titleHas("Urasli"), terms: "uraslo urastao nokat" },
  { when: titleHas("Kurje oko"), terms: "žulj žuljevi" },
  { when: titleHas("Relax"), terms: "relaks opuštajuća opuštanje" },
  { when: titleHas("Sportska"), terms: "sport" },
  { when: titleHas("Anticelulit"), terms: "celulit anticelulitna" },
  { when: titleHas("Maderoterapija"), terms: "madero drvo drvenim" },
  { when: titleHas("Terapeutska", "Parcijalna"), terms: "leđa vrat bol" },
  { when: titleHas("Antistres"), terms: "stres opuštanje" },
  { when: titleHas("Masaza stopala"), terms: "stopala noge" },
  { when: titleHas("Build"), terms: "nadogradnja izgradnja" },
  { when: titleHas("French"), terms: "frenč francuski" },
  { when: titleHas("Nail art", "Ukrasi"), terms: "crtanje dizajn ukras" },
  { when: titleHas("Skidanje"), terms: "uklanjanje" },
  { when: titleHas("Sminkanje"), terms: "šminka make up makeup" },
  { when: titleHas("Detox"), terms: "detoks" },
  { when: titleHas("Ojacanje"), terms: "ojačanje jačanje" },
  { when: titleHas("Lakiranje"), terms: "lak običan lak" },
  { when: titleHas("Extra top"), terms: "nadlak top coat" },
  { when: titleHas("Krpljenje"), terms: "popravka slomljen nokat" },
  { when: (s) => s.package === true, terms: "serija deset tretmana" },
];

const HAYSTACK = new Map<string, string>();

/** Sve po čemu se usluga sme naći: naslov, grupa i sinonimi — bez dijakritike. */
export function haystackOf(s: Service): string {
  const cached = HAYSTACK.get(s.key);
  if (cached !== undefined) return cached;
  const terms = RULES.filter((r) => r.when(s))
    .map((r) => r.terms)
    .join(" ");
  const h = foldSerbian(`${s.title} ${GROUP_LABELS[s.group]} ${serviceGroupByKey(s.group).title} ${terms}`);
  HAYSTACK.set(s.key, h);
  return h;
}

export function queryTokens(query: string): string[] {
  return foldSerbian(query).split(/\s+/).filter(Boolean);
}

/** Svaka reč upita mora da se nađe (AND). Prazan upit pogađa sve. */
export function matchesQuery(s: Service, query: string): boolean {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return true;
  const h = haystackOf(s);
  return tokens.every((t) => h.includes(t));
}

export function searchServices(query: string): Service[] {
  return services.filter((s) => matchesQuery(s, query));
}

/**
 * Fold koji čuva dužinu stringa (za bojenje pogotka u naslovu): `š` → `s`, `đ` → `d`.
 * `foldSerbian` pretvara `đ` u `dj` i time pomera indekse, pa se ovde ne koristi.
 */
function foldKeepLength(input: string): string {
  return input
    .toLowerCase()
    .replaceAll("đ", "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Opsezi u naslovu koje treba obojiti — samo pravi pogoci u tekstu naslova. Kad je
 * stavka nađena preko sinonima („gel" → „Manikir + trajni lak"), nema šta da se boji.
 */
export function matchRanges(title: string, query: string): [number, number][] {
  const folded = foldKeepLength(title);
  const hits: [number, number][] = [];
  for (const token of queryTokens(query)) {
    let from = 0;
    while (from <= folded.length - token.length) {
      const at = folded.indexOf(token, from);
      if (at === -1) break;
      hits.push([at, at + token.length]);
      from = at + token.length;
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of hits) {
    const last = merged[merged.length - 1];
    // Susedni pogoci razdvojeni samo razmakom („trajni lak") boje se kao jedna fraza.
    if (last && folded.slice(last[1], start).trim() === "") last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
