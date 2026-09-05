/**
 * Njene Instagram objave su brendirane kartice: beo papir, wordmark gore,
 * fotografija u sredini, crna oznaka usluge dole. Za galeriju je kartica tacna
 * (to JE njen identitet), ali za hero i pozadine sekcija treba cista fotografija.
 *
 * Zato pravimo dve varijante po slici:
 *   <ime>-card-<w>.avif   cela objava, kako je ona objavila
 *   <ime>-photo-<w>.avif  samo fotografija, izvucena iz kartice
 *
 * Izvor je ~1350px, pa sirine idu 640 / 1080 / 1350 - 1600 bi bilo naduvavanje.
 *   node scripts/convert-photos.mjs [odKojeSlike] [doKojeSlike]
 */
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RAW = "public/photos/raw";
const OUT = "public/photos";
const WIDTHS = [640, 1080, 1350];
const AVIF = { quality: 58, effort: 3 };

/** Nadje fotografiju unutar bele kartice: trazi najduzi niz "zauzetih" redova i kolona. */
async function findPhotoBox(buf) {
  const S = 160;
  const { data, info } = await sharp(buf).resize(S, S, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const busyRow = new Array(info.height).fill(0);
  const busyCol = new Array(info.width).fill(0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      // "zauzet" = ima boje (sat > 22) ILI je srednje tamno (foto senke), ali NIJE cista crna slova na belom
      const colored = max - min > 22;
      const midtone = max < 235 && max > 40 && max - min > 10;
      if (colored || midtone) { busyRow[y]++; busyCol[x]++; }
    }
  }
  const longestRun = (arr, thresh) => {
    let best = [0, -1], cur = -1;
    for (let i = 0; i <= arr.length; i++) {
      const on = i < arr.length && arr[i] >= thresh;
      if (on && cur < 0) cur = i;
      if (!on && cur >= 0) { if (i - cur > best[1] - best[0]) best = [cur, i]; cur = -1; }
    }
    return best;
  };
  const [y0, y1] = longestRun(busyRow, info.width * 0.30);
  const [x0, x1] = longestRun(busyCol, info.height * 0.20);
  if (y1 - y0 < S * 0.25 || x1 - x0 < S * 0.25) return null; // nije nadjeno pouzdano
  return { top: y0 / S, bottom: y1 / S, left: x0 / S, right: x1 / S };
}

await mkdir(OUT, { recursive: true });
const files = (await readdir(RAW)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? files.length);
const slice = files.slice(from, to);
const manifestPath = "data/photos.json";
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};

for (const f of slice) {
  const base = f.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const buf = await readFile(path.join(RAW, f));
  const meta = await sharp(buf).metadata();
  const box = await findPhotoBox(buf);

  for (const w of WIDTHS) {
    const cardOut = path.join(OUT, `${base}-card-${w}.avif`);
    if (!existsSync(cardOut)) {
      const img = sharp(buf).rotate();
      await (meta.width > w ? img.resize({ width: w }) : img).avif(AVIF).toFile(cardOut);
    }
    if (box) {
      const photoOut = path.join(OUT, `${base}-photo-${w}.avif`);
      if (!existsSync(photoOut)) {
        const left = Math.round(box.left * meta.width);
        const top = Math.round(box.top * meta.height);
        const width = Math.round((box.right - box.left) * meta.width);
        const height = Math.round((box.bottom - box.top) * meta.height);
        const img = sharp(buf).rotate().extract({ left, top, width, height });
        await (width > w ? img.resize({ width: w }) : img).avif(AVIF).toFile(photoOut);
      }
    }
  }
  manifest[base] = {
    widths: WIDTHS,
    card: `/photos/${base}-card-1350.avif`,
    photo: box ? `/photos/${base}-photo-1350.avif` : null,
    aspect: +(meta.width / meta.height).toFixed(4),
  };
  console.log(`  ${base}  ${box ? "kartica + fotografija" : "samo kartica (crop nije pouzdan)"}`);
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nObradjeno ${slice.length} (${from}-${to}). Manifest: ${manifestPath}`);
