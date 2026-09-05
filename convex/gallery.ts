import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertAdmin } from "./lib/admin";

/**
 * Galerija radova — njene fotografije, njen redosled.
 *
 * Slika živi u Convex storage-u; ovde stoji samo veza, opis za čitače ekrana
 * i mesto u nizu. `featured` je ono što ide na naslovnu.
 */

export const GALLERY_MESSAGES = {
  notFound: "Ta fotografija više ne postoji.",
  alt: "Opis sme da ima najviše 160 znakova.",
} as const;

const MAX_ALT = 160;
const MAX_IMAGES = 300;

const galleryItem = v.object({
  _id: v.id("gallery"),
  url: v.union(v.string(), v.null()),
  alt: v.string(),
  featured: v.boolean(),
  order: v.number(),
});

/** Javno: galerija za landing. Slika bez URL-a (obrisan fajl) se ne prikazuje. */
export const list = query({
  args: { featuredOnly: v.optional(v.boolean()) },
  returns: v.array(galleryItem),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("gallery").withIndex("by_order").take(MAX_IMAGES);
    const wanted = args.featuredOnly ? rows.filter((r) => r.featured) : rows;
    const items = await Promise.all(
      wanted
        .sort((a, b) => a.order - b.order)
        .map(async (r) => ({
          _id: r._id,
          url: await ctx.storage.getUrl(r.storageId),
          alt: r.alt,
          featured: r.featured,
          order: r.order,
        })),
    );
    return items.filter((i) => i.url !== null);
  },
});

/** Fotografija je već u storage-u (upload ide pravo tamo); ovde se samo upisuje. */
export const add = mutation({
  args: { key: v.optional(v.string()), storageId: v.id("_storage"), alt: v.optional(v.string()) },
  returns: v.id("gallery"),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const alt = (args.alt ?? "").trim();
    if (alt.length > MAX_ALT) throw new ConvexError(GALLERY_MESSAGES.alt);

    const rows = await ctx.db.query("gallery").withIndex("by_order").take(MAX_IMAGES);
    const nextOrder = rows.reduce((m, r) => Math.max(m, r.order), -1) + 1;
    return await ctx.db.insert("gallery", {
      storageId: args.storageId,
      alt,
      featured: false,
      order: nextOrder,
      createdAt: Date.now(),
    });
  },
});

export const setAlt = mutation({
  args: { key: v.optional(v.string()), id: v.id("gallery"), alt: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const alt = args.alt.trim();
    if (alt.length > MAX_ALT) throw new ConvexError(GALLERY_MESSAGES.alt);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError(GALLERY_MESSAGES.notFound);
    await ctx.db.patch(args.id, { alt });
    return null;
  },
});

export const setFeatured = mutation({
  args: { key: v.optional(v.string()), id: v.id("gallery"), featured: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError(GALLERY_MESSAGES.notFound);
    await ctx.db.patch(args.id, { featured: args.featured });
    return null;
  },
});

/** Novi redosled u celini — panel šalje ceo niz posle prevlačenja. */
export const reorder = mutation({
  args: { key: v.optional(v.string()), ids: v.array(v.id("gallery")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    for (const [index, id] of args.ids.entries()) {
      const row = await ctx.db.get(id);
      if (row && row.order !== index) await ctx.db.patch(id, { order: index });
    }
    return null;
  },
});

/** Briše i zapis i sam fajl — neiskorišćen fajl u storage-u se i dalje plaća. */
export const remove = mutation({
  args: { key: v.optional(v.string()), id: v.id("gallery") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const row = await ctx.db.get(args.id);
    if (!row) return null;
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete(args.id);
    return null;
  },
});
