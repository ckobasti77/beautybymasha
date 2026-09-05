/**
 * Izvlaci pravu boju laka iz skinutih ORLY slika i upisuje je u data/products.json.
 *
 *   node scripts/extract-swatches.mjs           # samo izvestaj, ne dira products.json
 *   node scripts/extract-swatches.mjs --write   # upisuje hex u products.json
 *
 * Zasto postoji: prosta "dominantna boja" preko cele slike vraca #f8f8f8 - beli
 * studijski pozadinski papir. Ovo gleda samo sredinu kadra (gde je bocica/nokat),
 * izbacuje bele i sive piksele, pa uzima prosek ponderisan zasicenoscu - tako
 * boja laka pobedjuje pozadinu i senke.
 *
 * Zahteva: sharp
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");

/** Pikseli svetliji od ovoga i manje zasiceni od ovoga su pozadina, ne lak. */
const MAX_LIGHTNESS = 0.90;
const MIN_LIGHTNESS = 0.05;
const MIN_SATURATION = 0.12;
/** Ako posle filtriranja ostane manje od ovoga, slika je prakticno bezbojna (bela bocica). */
const MIN_KEPT_RATIO = 0.04;

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

const hex = (r, g, b) =>
  "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("").toUpperCase();

async function extract(file) {
  const meta = await sharp(file).metadata();
  const w = meta.width ?? 0, h = meta.height ?? 0;
  if (!w || !h) return null;

  // Sredina kadra: 46% sirine i visine, blago spusteno - tamo je lak, ne logo na etiketi.
  const cw = Math.round(w * 0.46);
  const ch = Math.round(h * 0.46);
  const left = Math.round((w - cw) / 2);
  const top = Math.round((h - ch) / 2 + h * 0.04);

  const { data, info } = await sharp(file)
    .extract({ left, top, width: cw, height: ch })
    .resize(72, 72, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let wr = 0, wg = 0, wb = 0, wsum = 0, kept = 0;
  const total = info.width * info.height;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const { s, l } = rgbToHsl(r, g, b);
    if (l > MAX_LIGHTNESS || l < MIN_LIGHTNESS) continue;
    if (s < MIN_SATURATION) continue;
    // Ponder: zasicenost na kvadrat - najzasiceniji pikseli nose boju, sivilo se gubi.
    const weight = s * s;
    wr += r * weight; wg += g * weight; wb += b * weight; wsum += weight;
    kept++;
  }

  if (wsum === 0 || kept / total < MIN_KEPT_RATIO) {
    // Bezbojni proizvod (baze, nadlakovi, nega u prozirnoj bocici) - uzmi prosek
    // sredine bez filtera po zasicenosti, samo bez cistog belog.
    let ar = 0, ag = 0, ab = 0, n = 0;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const { l } = rgbToHsl(r, g, b);
      if (l > 0.96) continue;
      ar += r; ag += g; ab += b; n++;
    }
    if (!n) return null;
    return { hex: hex(ar / n, ag / n, ab / n), confident: false, keptRatio: kept / total };
  }

  return { hex: hex(wr / wsum, wg / wsum, wb / wsum), confident: true, keptRatio: kept / total };
}

const raw = await readFile(path.join(ROOT, "data/products.json"), "utf8");
const db = JSON.parse(raw);
const report = [];
let updated = 0;

for (const p of db.products) {
  const file = path.join(ROOT, "public", p.localAvif);
  if (!existsSync(file)) { console.log(`  ? ${p.slug}: nema slike`); continue; }
  try {
    const res = await extract(file);
    if (!res) { console.log(`  ! ${p.slug}: nije uspelo`); continue; }
    const before = p.hex;
    if (res.confident) { p.hex = res.hex; updated++; }
    report.push({ slug: p.slug, name: p.name, declared: before, extracted: res.hex, confident: res.confident, keptRatio: +res.keptRatio.toFixed(3) });
    console.log(`  ${res.confident ? "+" : "~"} ${p.slug.padEnd(26)} ${before} -> ${res.hex}${res.confident ? "" : "  (bezbojan, zadrzana rucna procena)"}`);
  } catch (err) {
    console.log(`  ! ${p.slug}: ${err.message}`);
  }
}

await writeFile(path.join(ROOT, "data/swatch-report.json"), JSON.stringify(report, null, 2));
if (WRITE) {
  await writeFile(path.join(ROOT, "data/products.json"), JSON.stringify(db, null, 2) + "\n");
  console.log(`\nUpisano u data/products.json: ${updated} boja azurirano.`);
} else {
  console.log(`\nSamo izvestaj (data/swatch-report.json). Pokreni sa --write da upise ${updated} boja u products.json.`);
}
