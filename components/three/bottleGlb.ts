import { BufferGeometry } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/**
 * Učitavanje `public/models/bocica.glb` (Blender, spec 13 → I) BEZ GLTFLoader-a.
 *
 * drei `useGLTF` povlači GLTFLoader + DRACOLoader + suspend-react: izmereno +21,9 KB gzip na
 * lenjem WebGL chunku, a budžet iz speca (J.11) je +15 KB. Naš GLB je jednostavan — tri mesha,
 * bez tekstura, skeleta i animacija, geometrija Draco-komprimovana — pa ga čita ovih pedeset
 * linija: GLB kontejner (JSON + BIN chunk) → `KHR_draco_mesh_compression` → `DRACOLoader`
 * (isti dekoder iz `public/draco/` koji bi koristio i GLTFLoader). Ukupno ≈ +5 KB gzip.
 *
 * Jedan fetch i jedno dekodiranje po strani (keš), geometrije dele hero i zid shopa.
 * `preloadBottleGlb()` se zove pri učitavanju lenjog chunka (ono što radi `useGLTF.preload`).
 */

export type BottleGeometries = {
  readonly glass: BufferGeometry;
  readonly liquid: BufferGeometry;
  readonly cap: BufferGeometry;
};

export const BOTTLE_GLB_URL = "/models/bocica.glb";
const DRACO_PATH = "/draco/";
const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

type GltfJson = {
  nodes?: { name?: string; mesh?: number }[];
  meshes?: {
    name?: string;
    primitives: {
      attributes: Record<string, number>;
      extensions?: { KHR_draco_mesh_compression?: { bufferView: number; attributes: Record<string, number> } };
    }[];
  }[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
};

/** `decodeGeometry` je javna metoda koju GLTFLoader koristi, ali je nema u @types/three. */
type DracoDecoder = DRACOLoader & {
  decodeGeometry(
    buffer: ArrayBuffer,
    taskConfig: {
      attributeIDs: Record<string, number>;
      attributeTypes: Record<string, string>;
      useUniqueIDs: boolean;
    },
  ): Promise<BufferGeometry>;
};

let dracoLoader: DracoDecoder | null = null;
let pending: Promise<BottleGeometries> | null = null;

function draco(): DracoDecoder {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader().setDecoderPath(DRACO_PATH) as DracoDecoder;
    dracoLoader.preload();
  }
  return dracoLoader;
}

function parseGlb(data: ArrayBuffer): { json: GltfJson; bin: ArrayBuffer } {
  const view = new DataView(data);
  if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) {
    throw new Error("bocica.glb: nije glTF 2.0 binarni kontejner");
  }
  let offset = 12;
  let json: GltfJson | null = null;
  let bin: ArrayBuffer | null = null;
  while (offset < view.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const chunk = data.slice(offset + 8, offset + 8 + length);
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(chunk)) as GltfJson;
    else if (type === CHUNK_BIN) bin = chunk;
    offset += 8 + length;
  }
  if (!json || !bin) throw new Error("bocica.glb: nedostaje JSON ili BIN chunk");
  return { json, bin };
}

async function decodeMesh(json: GltfJson, bin: ArrayBuffer, nodeName: string): Promise<BufferGeometry> {
  const node = json.nodes?.find((n) => n.name === nodeName);
  const mesh = node?.mesh !== undefined ? json.meshes?.[node.mesh] : undefined;
  const primitive = mesh?.primitives[0];
  const compressed = primitive?.extensions?.KHR_draco_mesh_compression;
  if (!primitive || !compressed) throw new Error(`bocica.glb: mesh "${nodeName}" bez Draco primitiva`);
  const bufferView = json.bufferViews?.[compressed.bufferView];
  if (!bufferView) throw new Error(`bocica.glb: mesh "${nodeName}" bez bufferView-a`);
  const start = bufferView.byteOffset ?? 0;
  const slice = bin.slice(start, start + bufferView.byteLength);

  // Ista mapa koju gradi GLTFLoader-ova Draco ekstenzija: glTF ime atributa → three ime.
  const attributeIDs: Record<string, number> = {};
  const attributeTypes: Record<string, string> = {};
  for (const [gltfName, id] of Object.entries(compressed.attributes)) {
    const threeName = gltfName === "POSITION" ? "position" : gltfName === "NORMAL" ? "normal" : gltfName.toLowerCase();
    attributeIDs[threeName] = id;
    attributeTypes[threeName] = "Float32Array";
  }
  const geometry = await draco().decodeGeometry(slice, { attributeIDs, attributeTypes, useUniqueIDs: true });
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  geometry.name = nodeName;
  return geometry;
}

/** Fetch + dekodiranje, keširano; greška ostaje u promise-u (Suspense boundary je hvata). */
export function loadBottleGlb(): Promise<BottleGeometries> {
  if (!pending) {
    pending = (async () => {
      const response = await fetch(BOTTLE_GLB_URL);
      if (!response.ok) throw new Error(`bocica.glb: HTTP ${response.status}`);
      const { json, bin } = parseGlb(await response.arrayBuffer());
      const [glass, liquid, cap] = await Promise.all([
        decodeMesh(json, bin, "Glass"),
        decodeMesh(json, bin, "Liquid"),
        decodeMesh(json, bin, "Cap"),
      ]);
      return { glass, liquid, cap };
    })();
    pending.catch(() => {
      // Pao fetch/dekoder: sledeći pokušaj (npr. nova strana) kreće iznova.
      pending = null;
    });
  }
  return pending;
}

export function preloadBottleGlb(): void {
  if (typeof window !== "undefined") void loadBottleGlb().catch(() => undefined);
}
