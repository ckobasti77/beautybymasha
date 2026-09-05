import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import schema, {
  brandValidator,
  colorFamilyValidator,
  finishValidator,
  productCategoryKeyValidator,
} from "./schema";
import { assertAdmin, type Ctx } from "./lib/admin";
import { MAX_DISCOUNT_PERCENT, clampDiscount, discountedUnitPrice } from "../lib/shop";
import { HEX_RE } from "../lib/data-guard";

export const PRODUCT_MESSAGES = {
  notFound: "Proizvod nije pronađen.",
  slug: "Slug sme da sadrži samo mala slova, cifre i crticu.",
  sku: "Šifra (SKU) ne sme biti prazna.",
  price: "Cena mora biti ceo broj veći od nule.",
  discount: `Popust mora biti između 0 i ${MAX_DISCOUNT_PERCENT}.`,
  stock: "Stanje mora biti ceo broj ≥ 0.",
  hex: "Boja mora biti u obliku #RRGGBB.",
  slugTaken: "Proizvod sa tim slug-om već postoji.",
  skuTaken: "Proizvod sa tom šifrom već postoji.",
} as const;

/* =====================================================================
 * Zajedničko
 * ===================================================================== */

/** Cena za prikaz — ista računica koju server koristi pri naplati. */
function withPrice(p: Doc<"products">) {
  return {
    ...p,
    finalPriceRsd: discountedUnitPrice(p.priceRsd, p.discountPercent),
    inStock: p.stock > 0,
  };
}

export async function productBySku(ctx: Ctx, sku: string): Promise<Doc<"products"> | null> {
  return await ctx.db
    .query("products")
    .withIndex("by_sku", (q) => q.eq("sku", sku))
    .first();
}

export async function productBySlug(ctx: Ctx, slug: string): Promise<Doc<"products"> | null> {
  return await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
}

function validateSlug(raw: string): string {
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) throw new ConvexError(PRODUCT_MESSAGES.slug);
  return slug;
}

function validateSku(raw: string): string {
  const sku = raw.trim();
  if (sku.length === 0 || sku.length > 40) throw new ConvexError(PRODUCT_MESSAGES.sku);
  return sku;
}

function validatePrice(priceRsd: number): number {
  if (!Number.isInteger(priceRsd) || priceRsd <= 0) throw new ConvexError(PRODUCT_MESSAGES.price);
  return priceRsd;
}

function validateDiscount(discountPercent: number): number {
  if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > MAX_DISCOUNT_PERCENT) {
    throw new ConvexError(PRODUCT_MESSAGES.discount);
  }
  return clampDiscount(discountPercent);
}

function validateStock(stock: number): number {
  if (!Number.isInteger(stock) || stock < 0) throw new ConvexError(PRODUCT_MESSAGES.stock);
  return stock;
}

function validateHex(raw: string): string {
  const hex = raw.trim().toUpperCase();
  if (!HEX_RE.test(hex)) throw new ConvexError(PRODUCT_MESSAGES.hex);
  return hex;
}

/* =====================================================================
 * Javno — katalog
 * ===================================================================== */

export const categories = query({
  args: {},
  returns: v.array(schema.doc("productCategories")),
  handler: async (ctx) => {
    const rows = await ctx.db.query("productCategories").collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

/**
 * Katalog za sajt. Podrazumevano samo aktivni proizvodi; admin sme i skrivene
 * (`includeInactive` traži admin pristup, da se skriveni ne cure na sajt).
 */
export const list = query({
  args: {
    categoryKey: v.optional(productCategoryKeyValidator),
    brand: v.optional(brandValidator),
    includeInactive: v.optional(v.boolean()),
    key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.includeInactive) await assertAdmin(ctx, args.key);

    const rows = args.categoryKey
      ? await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("categoryKey", args.categoryKey!))
          .collect()
      : args.brand
        ? await ctx.db
            .query("products")
            .withIndex("by_brand", (q) => q.eq("brand", args.brand!))
            .collect()
        : await ctx.db.query("products").collect();

    return rows
      .filter((p) => (args.includeInactive ? true : p.active))
      .filter((p) => (args.brand ? p.brand === args.brand : true))
      .filter((p) => (args.categoryKey ? p.categoryKey === args.categoryKey : true))
      .sort((a, b) => a.order - b.order)
      .map(withPrice);
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await productBySlug(ctx, args.slug);
    if (!product || !product.active) return null;
    return withPrice(product);
  },
});

/* =====================================================================
 * Admin — pojedinačne izmene
 * ===================================================================== */

/** Polja koja admin sme da menja. Sve je opciono: šalje se samo ono što se menja. */
const editableFields = {
  name: v.optional(v.string()),
  brand: v.optional(brandValidator),
  categoryKey: v.optional(productCategoryKeyValidator),
  priceRsd: v.optional(v.number()),
  discountPercent: v.optional(v.number()),
  hex: v.optional(v.string()),
  finish: v.optional(finishValidator),
  family: v.optional(colorFamilyValidator),
  description: v.optional(v.string()),
  swatchOnly: v.optional(v.boolean()),
  imagePath: v.optional(v.union(v.string(), v.null())),
  stock: v.optional(v.number()),
  bestseller: v.optional(v.boolean()),
  active: v.optional(v.boolean()),
  order: v.optional(v.number()),
};

export const update = mutation({
  args: { key: v.optional(v.string()), id: v.id("products"), ...editableFields },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const { id, ...rest } = args;
    const product = await ctx.db.get(id);
    if (!product) throw new ConvexError(PRODUCT_MESSAGES.notFound);

    const patch: Partial<Doc<"products">> = {};
    if (rest.name !== undefined) patch.name = rest.name.trim();
    if (rest.brand !== undefined) patch.brand = rest.brand;
    if (rest.categoryKey !== undefined) patch.categoryKey = rest.categoryKey;
    if (rest.priceRsd !== undefined) patch.priceRsd = validatePrice(rest.priceRsd);
    if (rest.discountPercent !== undefined) patch.discountPercent = validateDiscount(rest.discountPercent);
    if (rest.hex !== undefined) patch.hex = validateHex(rest.hex);
    if (rest.finish !== undefined) patch.finish = rest.finish;
    if (rest.family !== undefined) patch.family = rest.family;
    if (rest.description !== undefined) patch.description = rest.description.trim();
    if (rest.swatchOnly !== undefined) patch.swatchOnly = rest.swatchOnly;
    if (rest.imagePath !== undefined) patch.imagePath = rest.imagePath;
    if (rest.stock !== undefined) patch.stock = validateStock(rest.stock);
    if (rest.bestseller !== undefined) patch.bestseller = rest.bestseller;
    if (rest.active !== undefined) patch.active = rest.active;
    if (rest.order !== undefined) patch.order = rest.order;

    await ctx.db.patch(id, patch);
    return null;
  },
});

/* =====================================================================
 * Admin — uvoz (temelj CSV/XLSX uvoza iz panela, korak 06)
 * ===================================================================== */

const bulkRowValidator = v.object({
  /** Jedini obavezan podatak — po njemu se uparuje. */
  sku: v.string(),
  slug: v.optional(v.string()),
  name: v.optional(v.string()),
  brand: v.optional(brandValidator),
  categoryKey: v.optional(productCategoryKeyValidator),
  priceRsd: v.optional(v.number()),
  discountPercent: v.optional(v.number()),
  hex: v.optional(v.string()),
  finish: v.optional(finishValidator),
  family: v.optional(colorFamilyValidator),
  description: v.optional(v.string()),
  swatchOnly: v.optional(v.boolean()),
  imagePath: v.optional(v.union(v.string(), v.null())),
  stock: v.optional(v.number()),
  bestseller: v.optional(v.boolean()),
  active: v.optional(v.boolean()),
  order: v.optional(v.number()),
});

/**
 * Uvoz cenovnika iz tabele. Uparuje se po `sku`:
 *   - `sku` postoji → ažurira se SAMO ono što je u redu poslato
 *   - `sku` ne postoji → dodaje se nov proizvod (tada su naziv i cena obavezni)
 *   - proizvod koji nije u tabeli se NE dira i NE briše
 *
 * Red koji ne prođe validaciju ne ruši ceo uvoz — upada u `skipped` sa razlogom,
 * a ostatak tabele prolazi. Vlasnica tako vidi šta tačno da popravi.
 */
export const bulkUpsert = mutation({
  args: { key: v.optional(v.string()), rows: v.array(bulkRowValidator) },
  returns: v.object({
    updated: v.number(),
    created: v.number(),
    skipped: v.array(v.object({ sku: v.string(), reason: v.string() })),
  }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);

    let updated = 0;
    let created = 0;
    const skipped: { sku: string; reason: string }[] = [];
    const seen = new Set<string>();
    let nextOrder = (await ctx.db.query("products").collect()).reduce((m, p) => Math.max(m, p.order), -1) + 1;

    for (const row of args.rows) {
      let sku: string;
      try {
        sku = validateSku(row.sku);
      } catch {
        skipped.push({ sku: row.sku, reason: PRODUCT_MESSAGES.sku });
        continue;
      }
      if (seen.has(sku)) {
        skipped.push({ sku, reason: "Ista šifra se u tabeli pojavljuje dvaput." });
        continue;
      }
      seen.add(sku);

      try {
        const existing = await productBySku(ctx, sku);

        if (existing) {
          const patch: Partial<Doc<"products">> = {};
          if (row.slug !== undefined) {
            const slug = validateSlug(row.slug);
            const bySlugRow = await productBySlug(ctx, slug);
            if (bySlugRow && bySlugRow._id !== existing._id) throw new ConvexError(PRODUCT_MESSAGES.slugTaken);
            patch.slug = slug;
          }
          if (row.name !== undefined) patch.name = row.name.trim();
          if (row.brand !== undefined) patch.brand = row.brand;
          if (row.categoryKey !== undefined) patch.categoryKey = row.categoryKey;
          if (row.priceRsd !== undefined) patch.priceRsd = validatePrice(row.priceRsd);
          if (row.discountPercent !== undefined) patch.discountPercent = validateDiscount(row.discountPercent);
          if (row.hex !== undefined) patch.hex = validateHex(row.hex);
          if (row.finish !== undefined) patch.finish = row.finish;
          if (row.family !== undefined) patch.family = row.family;
          if (row.description !== undefined) patch.description = row.description.trim();
          if (row.swatchOnly !== undefined) patch.swatchOnly = row.swatchOnly;
          if (row.imagePath !== undefined) patch.imagePath = row.imagePath;
          if (row.stock !== undefined) patch.stock = validateStock(row.stock);
          if (row.bestseller !== undefined) patch.bestseller = row.bestseller;
          if (row.active !== undefined) patch.active = row.active;
          if (row.order !== undefined) patch.order = row.order;

          await ctx.db.patch(existing._id, patch);
          updated++;
          continue;
        }

        // Nov proizvod: naziv i cena su obavezni, ostalo ima razuman podrazumevani.
        if (!row.name?.trim()) throw new ConvexError("Nov proizvod mora imati naziv.");
        if (row.priceRsd === undefined) throw new ConvexError("Nov proizvod mora imati cenu.");

        const slug = validateSlug(row.slug ?? slugify(row.name));
        if (await productBySlug(ctx, slug)) throw new ConvexError(PRODUCT_MESSAGES.slugTaken);

        const imagePath = row.imagePath ?? null;
        await ctx.db.insert("products", {
          slug,
          sku,
          name: row.name.trim(),
          brand: row.brand ?? "orly",
          categoryKey: row.categoryKey ?? "lakovi",
          priceRsd: validatePrice(row.priceRsd),
          discountPercent: validateDiscount(row.discountPercent ?? 0),
          hex: validateHex(row.hex ?? "#CCCCCC"),
          finish: row.finish ?? "creme",
          family: row.family ?? "multi",
          description: row.description?.trim() ?? "",
          swatchOnly: row.swatchOnly ?? imagePath === null,
          imagePath,
          storageImageIds: [],
          stock: validateStock(row.stock ?? 0),
          bestseller: row.bestseller ?? false,
          active: row.active ?? true,
          order: row.order ?? nextOrder++,
        });
        created++;
      } catch (err) {
        skipped.push({ sku, reason: err instanceof ConvexError ? String(err.data) : "Neispravan red." });
      }
    }

    return { updated, created, skipped };
  },
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =====================================================================
 * Admin — slike koje ona sama uploaduje
 * ===================================================================== */

/** Kratkotrajni URL na koji admin panel šalje fajl pravo u Convex storage. */
export const generateUploadUrl = mutation({
  args: { key: v.optional(v.string()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Zakači uploadovane slike za proizvod. `replace` briše prethodne iz storage-a
 * da neiskorišćeni fajlovi ne ostaju da se plaćaju.
 */
export const saveProductImages = mutation({
  args: {
    key: v.optional(v.string()),
    id: v.id("products"),
    storageIds: v.array(v.id("_storage")),
    replace: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError(PRODUCT_MESSAGES.notFound);

    if (args.replace) {
      for (const old of product.storageImageIds) {
        if (!args.storageIds.includes(old)) await ctx.storage.delete(old);
      }
    }
    const storageImageIds = args.replace
      ? args.storageIds
      : [...product.storageImageIds, ...args.storageIds.filter((id) => !product.storageImageIds.includes(id))];

    await ctx.db.patch(args.id, { storageImageIds, swatchOnly: storageImageIds.length === 0 && !product.imagePath });
    return null;
  },
});

/** URL-ovi uploadovanih slika jednog proizvoda; `imagePath` iz `public/` je fallback. */
export const imageUrls = query({
  args: { id: v.id("products") },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return [];
    const urls = await Promise.all(product.storageImageIds.map((id) => ctx.storage.getUrl(id)));
    const uploaded = urls.filter((u): u is string => u !== null);
    return uploaded.length > 0 ? uploaded : product.imagePath ? [product.imagePath] : [];
  },
});

/* =====================================================================
 * Admin — brze radnje nad više odabranih proizvoda
 * ===================================================================== */

const bulkActionValidator = v.union(
  /** Promeni cenu za procenat: +10 poskupi, −10 pojeftini. Cena nikad ne padne ispod 1 RSD. */
  v.object({ kind: v.literal("cenaProcenat"), percent: v.number() }),
  v.object({ kind: v.literal("popust"), discountPercent: v.number() }),
  v.object({ kind: v.literal("vidljivost"), active: v.boolean() }),
  v.object({ kind: v.literal("stanje"), stock: v.number() }),
);

/**
 * Jedna izmena nad više odabranih proizvoda odjednom.
 *
 * Red koji ne prođe validaciju ne ruši ostale — vraća se broj promenjenih,
 * pa panel kaže „12 proizvoda promenjeno" umesto da ćuti.
 */
export const bulkAction = mutation({
  args: {
    key: v.optional(v.string()),
    ids: v.array(v.id("products")),
    action: bulkActionValidator,
  },
  returns: v.object({ changed: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    let changed = 0;
    let skipped = 0;

    for (const id of args.ids) {
      const product = await ctx.db.get(id);
      if (!product) {
        skipped++;
        continue;
      }
      try {
        switch (args.action.kind) {
          case "cenaProcenat": {
            const factor = (100 + args.action.percent) / 100;
            const priceRsd = Math.max(1, Math.round(product.priceRsd * factor));
            await ctx.db.patch(id, { priceRsd: validatePrice(priceRsd) });
            break;
          }
          case "popust":
            await ctx.db.patch(id, { discountPercent: validateDiscount(args.action.discountPercent) });
            break;
          case "vidljivost":
            await ctx.db.patch(id, { active: args.action.active });
            break;
          case "stanje":
            await ctx.db.patch(id, { stock: validateStock(args.action.stock) });
            break;
        }
        changed++;
      } catch {
        skipped++;
      }
    }
    return { changed, skipped };
  },
});

/**
 * Masovni upload slika: fajl je već u storage-u, a naziv fajla nosi `sku` ili `slug`.
 * „orly-1234.jpg" → traži se `sku` „orly-1234", pa `slug`. Bez pogotka fajl se
 * briše iz storage-a da ne ostane da se plaća, a panel prijavi koji naziv nije prepoznat.
 */
export const attachImageByName = mutation({
  args: { key: v.optional(v.string()), storageId: v.id("_storage"), fileName: v.string() },
  returns: v.object({ matched: v.boolean(), name: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const stem = args.fileName.replace(/\.[a-z0-9]+$/i, "").trim();

    // Šifre su verzalne („GUMDROP"), slug-ovi mala slova („kiss-the-bride") —
    // naziv fajla sa telefona ume da bude bilo šta, pa se probaju svi oblici.
    const product =
      (await productBySku(ctx, stem)) ??
      (await productBySku(ctx, stem.toUpperCase())) ??
      (await productBySlug(ctx, stem.toLowerCase()));
    if (!product) {
      await ctx.storage.delete(args.storageId);
      return { matched: false, name: null };
    }

    await ctx.db.patch(product._id, {
      storageImageIds: [...product.storageImageIds, args.storageId],
      swatchOnly: false,
    });
    return { matched: true, name: product.name };
  },
});

/**
 * Brisanje probnog proizvoda po šifri — za čišćenje posle testiranja uvoza.
 * Nije izloženo panelu: katalog se u adminu SKLANJA (`active: false`), ne briše,
 * jer stare porudžbine i dalje pokazuju šta je kupljeno.
 *
 *   npx convex run products:purgeBySku '{"sku":"TESTNOVI"}'
 */
export const purgeBySku = internalMutation({
  args: { sku: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const product = await productBySku(ctx, args.sku.trim());
    if (!product) return 0;
    for (const id of product.storageImageIds) await ctx.storage.delete(id);
    await ctx.db.delete(product._id);
    return 1;
  },
});
