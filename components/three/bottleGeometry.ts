import { LatheGeometry, Vector2, type BufferGeometry } from "three";

/**
 * Bočica laka, napravljena u kodu (docs/3D-ASSETS.md → Model 1).
 *
 * Nema `.glb` fajla: mreža je nula bajtova na mreži, sve je u ovih par stotina
 * linija. Budžet iz `docs/3D-ASSETS.md` (≤ 40k trouglova, dno u y=0, centrirano
 * po X i Z, 1 jedinica = 1 cm, ukupna visina ≈ 9,5) važi isto kao da je fajl.
 *
 * Tri mreže, tri materijala, tri imena: `Glass`, `Liquid`, `Cap`.
 *
 * Presek NIJE krug. `LatheGeometry` po definiciji vrti profil oko ose i daje
 * okruglo telo, a bočica laka je zaobljen kvadrat. Zato se posle vrtnje svaki
 * teme gurne po superelipsi (`squircle`) — kvadratasto pri dnu, sve okruglije ka
 * vratu. Isti profil, isti broj temena, tačan oblik.
 *
 * Bez logotipa i bez teksta na modelu — tako traži i brief i `docs/3D-ASSETS.md`.
 */

/** Segmenata po obimu. 64 je dovoljno da se superelipsa ne vidi kao poligon. */
const RADIAL_SEGMENTS = 64;

/** Debljina zida stakla — za koliko je tečnost uvučena u odnosu na profil. */
const WALL = 0.13;

/** Visina tela (staklo). Dno je u y=0. */
export const BODY_HEIGHT = 6.0;

/** Ukupna visina modela sa zatvaračem, u jedinicama. */
export const TOTAL_HEIGHT = 9.48;

/** Nivo tečnosti — 80% visine tela (docs/3D-ASSETS.md). */
const LIQUID_TOP = BODY_HEIGHT * 0.8;

/** Gde presek prestaje da bude kvadratast i postaje krug (rame → vrat). */
const SQUIRCLE_FROM_Y = 4.2;
const SQUIRCLE_TO_Y = 5.5;
/** Eksponent superelipse pri dnu. 2 = krug, veće = kvadratnije. */
const SQUIRCLE_POWER = 4.6;

type Point = readonly [r: number, y: number];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Deo kruga u ravni profila — zaobljena ivica dna, ramena ili vrha zatvarača. */
function arc(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number,
  steps: number,
): Point[] {
  const out: Point[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const a = lerp(from, to, i / steps);
    out.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return out;
}

/** Kubna Bezijeova kriva u ravni profila — rame bočice. */
function bezier(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  steps: number,
): Point[] {
  const out: Point[] = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    out.push([
      w[0] * p0[0] + w[1] * p1[0] + w[2] * p2[0] + w[3] * p3[0],
      w[0] * p0[1] + w[1] * p1[1] + w[2] * p2[1] + w[3] * p3[1],
    ]);
  }
  return out;
}

const HALF_PI = Math.PI / 2;

/**
 * Profil stakla, od centra dna do zatvorenog vrha vrata.
 *
 * Vrh se zatvara pločicom umesto da ostane otvor: otvor bi kroz `transmission`
 * staklo pokazao tanku ivicu bez debljine, a zatvarač ga ionako pokriva.
 */
function glassProfile(): Point[] {
  return [
    [0, 0],
    [1.24, 0],
    // zaobljena ivica dna
    ...arc(1.24, 0.28, 0.28, -HALF_PI, 0, 8),
    // bok sa jedva primetnim stomakom
    [1.55, 1.4],
    [1.5, 4.3],
    // rame
    ...bezier([1.5, 4.3], [1.46, 5.16], [0.82, 5.18], [0.5, 5.5], 14),
    // vrat
    [0.48, 5.62],
    [0.48, 5.9],
    // usnik i zatvaranje vrha
    [0.53, 5.94],
    [0.53, 5.99],
    [0, 5.99],
  ];
}

/**
 * Profil tečnosti: isti bok, uvučen za debljinu zida, odsečen na `LIQUID_TOP`
 * i zatvoren ravnom površinom. Dno počinje malo iznad y=0 da se ne poklopi sa
 * staklom i ne zatrepće (z-fighting).
 */
function liquidProfile(): Point[] {
  const source = glassProfile().filter(([, y]) => y > 0 && y < LIQUID_TOP);
  const inset: Point[] = source.map(([r, y]) => [Math.max(0.02, r - WALL), y]);
  const topRadius = inset.length > 0 ? inset[inset.length - 1][0] : 1.2;
  return [
    [0, WALL],
    [1.24 - WALL, WALL],
    ...inset.filter(([, y]) => y > WALL),
    [topRadius, LIQUID_TOP],
    [0, LIQUID_TOP],
  ];
}

/**
 * Profil zatvarača: blago konusan cilindar sa zaobljenim vrhom. Dno mu je malo
 * niže od vrha vrata, pa se spoj ne vidi kao pukotina.
 */
function capProfile(): Point[] {
  return [
    [0, 5.82],
    [0.58, 5.82],
    ...arc(0.58, 5.9, 0.08, -HALF_PI, 0, 5),
    [0.64, 6.0],
    [0.56, 9.2],
    ...arc(0.4, 9.2, 0.18, 0, HALF_PI * 0.92, 8),
    [0, TOTAL_HEIGHT],
  ];
}

/**
 * Krug → zaobljen kvadrat. Za svaki ugao θ superelipsa daje poluprečnik
 * `1 / (|cosθ|^n + |sinθ|^n)^(1/n)`; n=2 vraća krug, veće n gura uglove napolje.
 * `n` pada sa visinom, pa je dno kvadratasto a vrat okrugao — kao i zatvarač
 * koji na njega naleže.
 */
function squircle(geometry: BufferGeometry): BufferGeometry {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;

    const n = lerp(
      SQUIRCLE_POWER,
      2,
      smoothstep(SQUIRCLE_FROM_Y, SQUIRCLE_TO_Y, y),
    );
    const c = Math.abs(x / r);
    const s = Math.abs(z / r);
    const k = 1 / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
    pos.setXYZ(i, x * k, y, z * k);
  }
  pos.needsUpdate = true;
  // Superelipsa je pomerila temena, pa su normale iz `LatheGeometry` zastarele.
  geometry.computeVertexNormals();
  return geometry;
}

function lathe(profile: Point[], segments = RADIAL_SEGMENTS): LatheGeometry {
  return new LatheGeometry(
    profile.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
}

/**
 * Tri mreže bočice. Zove se jednom po platnu i rezultat se drži u `useMemo` —
 * geometrije nose GPU bafere i moraju da se oslobode (`dispose`) pri gašenju.
 */
export function createBottleGeometries(): {
  glass: BufferGeometry;
  liquid: BufferGeometry;
  cap: BufferGeometry;
} {
  return {
    glass: squircle(lathe(glassProfile())),
    liquid: squircle(lathe(liquidProfile())),
    // Zatvarač ostaje okrugao: staklo je kvadratasto, kapica nije — tako izgleda i prava bočica.
    cap: lathe(capProfile(), 48),
  };
}
