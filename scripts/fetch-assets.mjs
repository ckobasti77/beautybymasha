/**
 * Skida sve spoljne slike u projekat i konvertuje ih u AVIF.
 *
 *   node scripts/fetch-assets.mjs
 *
 * 1) ORLY proizvodi  -> data/products.json (polje `image`) -> public/products/orly/<slug>.avif
 * 2) Fotografije salona -> sve sto rucno spustis u public/photos/raw/ -> public/photos/<ime>.avif
 *
 * Instagram fotografije se NE skidaju automatski (CDN linkovi isticu i traze prijavu).
 * Sacuvaj ih rucno iz njenog profila u public/photos/raw/ i pusti skriptu.
 *
 * Zahteva: npm i -D sharp
 */
import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_PRODUCTS = path.join(ROOT, "public/products/orly");
const RAW_PHOTOS = path.join(ROOT, "public/photos/raw");
const OUT_PHOTOS = path.join(ROOT, "public/photos");

/** Sirine koje next/image trazi; AVIF kvalitet 62 je vizuelno cist a duplo lakši od WebP. */
const PRODUCT_WIDTH = 1200;
const PHOTO_WIDTHS = [640, 1080, 1600];
const AVIF = { quality: 62, effort: 6 };

async function toAvif(buf, outPath, width) {
  await mkdir(path.dirname(outPath), { recursive: true });
  const img = sharp(buf).rotate();
  const meta = await img.metadata();
  const pipeline = meta.width && meta.width > width ? img.resize({ width }) : img;
  await pipeline.avif(AVIF).toFile(outPath);
  return outPath;
}

async function fetchProducts() {
  const raw = await readFile(path.join(ROOT, "data/products.json"), "utf8");
  const { products } = JSON.parse(raw);
  console.log(`ORLY: ${products.length} proizvoda`);

  const results = [];
  for (const p of products) {
    const out = path.join(ROOT, "public", p.localAvif);
    if (existsSync(out)) { console.log(`  = ${p.slug} (vec postoji)`); continue; }
    try {
      const res = await fetch(p.image, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await toAvif(buf, out, PRODUCT_WIDTH);

      // dominantna boja -> predlog za `hex` swatch
      const { dominant } = await sharp(buf).stats();
      const hex = "#" + [dominant.r, dominant.g, dominant.b].map(n => n.toString(16).padStart(2, "0")).join("");
      results.push({ slug: p.slug, dominantHex: hex, declaredHex: p.hex });
      console.log(`  + ${p.slug}  dominantna ${hex} / upisana ${p.hex}`);
    } catch (err) {
      console.error(`  ! ${p.slug}: ${err.message}`);
    }
  }
  if (results.length) {
    await writeFile(path.join(ROOT, "data/swatch-report.json"), JSON.stringify(results, null, 2));
    console.log(`\nIzvestaj o bojama: data/swatch-report.json (uporedi pa po potrebi prepisi hex u products.json)`);
  }
}

async function convertPhotos() {
  if (!existsSync(RAW_PHOTOS)) return;
  const files = (await readdir(RAW_PHOTOS)).filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f));
  if (!files.length) {
    console.log("\nFotografije: public/photos/raw/ je prazan - spusti tu slike salona pa pokreni ponovo.");
    return;
  }
  console.log(`\nFotografije: ${files.length} fajlova`);
  for (const f of files) {
    const buf = await readFile(path.join(RAW_PHOTOS, f));
    const base = f.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    for (const w of PHOTO_WIDTHS) {
      await toAvif(buf, path.join(OUT_PHOTOS, `${base}-${w}.avif`), w);
    }
    console.log(`  + ${base} (${PHOTO_WIDTHS.join(", ")})`);
  }
}

await mkdir(OUT_PRODUCTS, { recursive: true });
await fetchProducts();
await convertPhotos();
console.log("\nGotovo.");
