/**
 * Meri koliko JS-a strana povuče pri PRVOM učitavanju, u gzip bajtovima.
 *
 * `next build` štampa svoju tabelu, ali ona meša deljene chunkove i ne kaže
 * koliko je porasla baš jedna ruta. Ovde se čitaju `<script src>` iz sagrađenog
 * HTML-a (`.next/server/app/<ruta>.html`) — tačno ono što browser stvarno povuče
 * pre nego što išta dinamično krene — i svaki chunk se gzip-uje pojedinačno.
 *
 * Ono što se učitava kroz `next/dynamic` (hero shader, 3D bočica) namerno NIJE
 * unutra: tamo mu i jeste mesto.
 *
 * Upotreba:  node scripts/measure-bundle.mjs shop shop/vintage index
 */
import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const pages = process.argv.slice(2);
if (pages.length === 0) {
  console.error("Upotreba: node scripts/measure-bundle.mjs <ruta> [ruta...]   (npr. index shop shop/vintage)");
  process.exit(1);
}

for (const page of pages) {
  const html = join(root, ".next/server/app", `${page}.html`);
  if (!existsSync(html)) {
    console.log(`${page.padEnd(20)} — nema ${html}`);
    continue;
  }
  const sources = new Set(
    [...readFileSync(html, "utf8").matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
  );

  let gz = 0;
  let raw = 0;
  let counted = 0;
  for (const src of sources) {
    const file = join(root, ".next", src.replace(/^\/_next\//, ""));
    if (!existsSync(file)) continue;
    const buf = readFileSync(file);
    raw += buf.length;
    gz += gzipSync(buf).length;
    counted += 1;
  }
  console.log(
    `${page.padEnd(20)} ${(gz / 1024).toFixed(1).padStart(7)} KB gzip  ${(raw / 1024).toFixed(1).padStart(8)} KB raw  ${counted} chunkova`,
  );
}
