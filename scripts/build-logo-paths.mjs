/**
 * Pretvara glifove logotipa u SVG putanje, jednom, da Logo.tsx ne zavisi od fontova.
 *
 *   node scripts/build-logo-paths.mjs
 *
 * Ulaz (OFL, skinuto u scripts/.fonts/ — nije u git-u):
 *   Archivo[wdth,wght].ttf   -> "BEAUTY", instanca wdth 78 / wght 800 (kao njen wordmark)
 *   Sacramento-Regular.ttf   -> "by Masha", rukopis
 * Izlaz: lib/brand/logo-paths.ts (1000 upm, y nadole, x od 0).
 *
 * Zasto: SVG <text> nema getTotalLength() pa se rukopis ne moze ispisati tacno,
 * a satori (favicon/OG) ne podrzava variable ose — putanje rade svuda isto.
 *
 * Zahteva: npm i -D fontkit
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as fontkit from "fontkit";

const ROOT = process.cwd();
const FONTS = path.join(ROOT, "scripts/.fonts");
const OUT = path.join(ROOT, "lib/brand/logo-paths.ts");
const UPM = 1000;

const SOURCES = {
  archivo: {
    file: "Archivo[wdth,wght].ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf",
  },
  sacramento: {
    file: "Sacramento-Regular.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/sacramento/Sacramento-Regular.ttf",
  },
};

async function ensureFont({ file, url }) {
  const p = path.join(FONTS, file);
  if (existsSync(p)) return p;
  await mkdir(FONTS, { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  await writeFile(p, Buffer.from(await res.arrayBuffer()));
  return p;
}

function round(n) {
  return Math.round(n * 10) / 10;
}

/** Jedan tekst u niz glifova: d (SVG path, 1000 upm, y nadole), x pomeraj, advance. */
function layoutWord(font, text, features) {
  const s = UPM / font.unitsPerEm;
  const run = font.layout(text, features);
  const glyphs = [];
  let x = 0;
  for (let i = 0; i < run.glyphs.length; i++) {
    const g = run.glyphs[i];
    const pos = run.positions[i];
    const gx = (x + pos.xOffset) * s;
    const gy = -pos.yOffset * s;
    // scale(s, -s): iz font-koordinata (y nagore) u SVG (y nadole)
    const d = g.path.scale(s, -s).translate(gx, gy).toSVG();
    const bb = g.bbox;
    glyphs.push({
      char: text[Math.min(i, text.length - 1)],
      d: d.replace(/(\d+\.\d{2})\d+/g, "$1"),
      x: round(gx),
      advance: round(pos.xAdvance * s),
      empty: !d || bb.minX === Infinity,
    });
    x += pos.xAdvance;
  }
  const width = x * s;
  return {
    width: round(width),
    ascent: round(font.ascent * s),
    descent: round(font.descent * s),
    capHeight: round((font.capHeight || font.ascent * 0.7) * s),
    xHeight: round((font.xHeight || font.ascent * 0.5) * s),
    glyphs: glyphs.filter((g) => !g.empty).map(({ empty, ...g }) => g),
  };
}

const archivoPath = await ensureFont(SOURCES.archivo);
const sacramentoPath = await ensureFont(SOURCES.sacramento);

const archivoBase = fontkit.openSync(archivoPath);
const archivo = archivoBase.getVariation({ wdth: 78, wght: 800 });
const sacramento = fontkit.openSync(sacramentoPath);

const beauty = layoutWord(archivo, "BEAUTY", { kern: true, liga: true });
const byMasha = layoutWord(sacramento, "by Masha", { kern: true, liga: true, calt: true });

const header = `/**
 * AUTO-GENERISANO — ne editovati rucno. Pokreni: node scripts/build-logo-paths.mjs
 *
 * Glifovi logotipa kao SVG putanje (1000 upm, y nadole, x od 0):
 *   beauty  — "BEAUTY", Archivo variable, wdth 78 / wght 800
 *   byMasha — "by Masha", Sacramento Regular
 * Fontovi su OFL (Google Fonts). Logo.tsx crta ove putanje pa ne zavisi od ucitavanja fontova,
 * getTotalLength() radi za stroke-dashoffset ispis, a satori (favicon/OG) ih renderuje bez fontova.
 */

export type LogoGlyph = {
  /** Karakter iz koga je glif nastao (informativno). */
  readonly char: string;
  /** SVG path data, vec pomeren na svoju x poziciju. */
  readonly d: string;
  readonly x: number;
  readonly advance: number;
};

export type LogoWord = {
  readonly width: number;
  readonly ascent: number;
  readonly descent: number;
  readonly capHeight: number;
  readonly xHeight: number;
  readonly glyphs: readonly LogoGlyph[];
};

export const LOGO_UPM = ${UPM};
`;

const body =
  header +
  `\nexport const BEAUTY: LogoWord = ${JSON.stringify(beauty, null, 2)} as const;\n` +
  `\nexport const BY_MASHA: LogoWord = ${JSON.stringify(byMasha, null, 2)} as const;\n`;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, body);
console.log(`BEAUTY: ${beauty.glyphs.length} glifova, sirina ${beauty.width}, capHeight ${beauty.capHeight}`);
console.log(`by Masha: ${byMasha.glyphs.length} glifova, sirina ${byMasha.width}, xHeight ${byMasha.xHeight}, descent ${byMasha.descent}`);
console.log(`Upisano: ${path.relative(ROOT, OUT)}`);
