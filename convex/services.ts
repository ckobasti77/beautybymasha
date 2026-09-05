import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import schema, { resourceKeyValidator, serviceGroupKeyValidator } from "./schema";
import { assertAdmin } from "./lib/admin";
import { MAX_SERVICES, getService, resourceOfGroup } from "./lib/availability";
import { MESSAGES } from "./lib/validate";

export const MAX_PRICE_RSD = 1_000_000;
export const MIN_DURATION_MIN = 5;
export const MAX_DURATION_MIN = 8 * 60;

const publicService = v.object({
  key: v.string(),
  groupKey: serviceGroupKeyValidator,
  resourceKey: resourceKeyValidator,
  title: v.string(),
  durationMin: v.number(),
  priceRsd: v.union(v.number(), v.null()),
  bookable: v.boolean(),
  addon: v.boolean(),
  order: v.number(),
});

/**
 * Javno: katalog za sajt. Sakrivene usluge se ne šalju klijentu.
 * Cena je verbatim iz cenovnika; trajanje je procena koju vlasnica menja ovde.
 */
export const list = query({
  args: { groupKey: v.optional(serviceGroupKeyValidator) },
  returns: v.array(publicService),
  handler: async (ctx, args) => {
    const rows = args.groupKey
      ? await ctx.db
          .query("services")
          .withIndex("by_group", (q) => q.eq("groupKey", args.groupKey!))
          .take(MAX_SERVICES)
      : await ctx.db.query("services").take(MAX_SERVICES);
    return rows
      .filter((s) => !s.hidden)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        key: s.key,
        groupKey: s.groupKey,
        resourceKey: resourceOfGroup(s.groupKey),
        title: s.title,
        durationMin: s.durationMin,
        priceRsd: s.priceRsd,
        bookable: s.bookable,
        addon: s.addon,
        order: s.order,
      }));
  },
});

/** Admin: ceo katalog, uključujući sakrivene. */
export const listAll = query({
  args: { key: v.string() },
  returns: v.array(schema.doc("services")),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const rows = await ctx.db.query("services").take(MAX_SERVICES);
    return rows.sort((a, b) => a.order - b.order);
  },
});

function assertDuration(durationMin: number): void {
  if (!Number.isInteger(durationMin) || durationMin < MIN_DURATION_MIN || durationMin > MAX_DURATION_MIN) {
    throw new ConvexError(MESSAGES.duration);
  }
}

function assertPrice(priceRsd: number | null): void {
  if (priceRsd === null) return;
  if (!Number.isInteger(priceRsd) || priceRsd < 0 || priceRsd > MAX_PRICE_RSD) throw new ConvexError(MESSAGES.price);
}

export const create = mutation({
  args: {
    key: v.string(),
    serviceKey: v.string(),
    groupKey: serviceGroupKeyValidator,
    title: v.string(),
    durationMin: v.number(),
    priceRsd: v.union(v.number(), v.null()),
    bookable: v.optional(v.boolean()),
    addon: v.optional(v.boolean()),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    // Ključ bez dijakritika i razmaka — ide u URL i u indeks.
    const serviceKey = args.serviceKey.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,60}$/.test(serviceKey)) throw new ConvexError(MESSAGES.service);
    const title = args.title.trim();
    if (title.length < 2 || title.length > 120) throw new ConvexError(MESSAGES.service);
    assertDuration(args.durationMin);
    assertPrice(args.priceRsd);
    if (await getService(ctx, serviceKey)) throw new ConvexError(MESSAGES.serviceExists);

    const all = await ctx.db.query("services").take(MAX_SERVICES);
    const order = all.reduce((max, s) => Math.max(max, s.order), 0) + 1;
    return await ctx.db.insert("services", {
      key: serviceKey,
      groupKey: args.groupKey,
      title,
      durationMin: args.durationMin,
      priceRsd: args.priceRsd,
      bookable: args.bookable ?? true,
      addon: args.addon ?? false,
      hidden: false,
      order,
    });
  },
});

/**
 * Izmena postojeće usluge. Prosleđuju se samo polja koja se menjaju.
 * Cene su verbatim iz cenovnika — menja ih samo vlasnica, svesno.
 */
export const update = mutation({
  args: {
    key: v.string(),
    serviceKey: v.string(),
    title: v.optional(v.string()),
    groupKey: v.optional(serviceGroupKeyValidator),
    durationMin: v.optional(v.number()),
    priceRsd: v.optional(v.union(v.number(), v.null())),
    bookable: v.optional(v.boolean()),
    addon: v.optional(v.boolean()),
    hidden: v.optional(v.boolean()),
    order: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const service = await getService(ctx, args.serviceKey);
    if (!service) throw new ConvexError(MESSAGES.service);
    if (args.durationMin !== undefined) assertDuration(args.durationMin);
    if (args.priceRsd !== undefined) assertPrice(args.priceRsd);
    if (args.order !== undefined && !Number.isInteger(args.order)) throw new ConvexError(MESSAGES.range);
    const title = args.title?.trim();
    if (title !== undefined && (title.length < 2 || title.length > 120)) throw new ConvexError(MESSAGES.service);

    await ctx.db.patch("services", service._id, {
      ...(title !== undefined ? { title } : {}),
      ...(args.groupKey !== undefined ? { groupKey: args.groupKey } : {}),
      ...(args.durationMin !== undefined ? { durationMin: args.durationMin } : {}),
      ...(args.priceRsd !== undefined ? { priceRsd: args.priceRsd } : {}),
      ...(args.bookable !== undefined ? { bookable: args.bookable } : {}),
      ...(args.addon !== undefined ? { addon: args.addon } : {}),
      ...(args.hidden !== undefined ? { hidden: args.hidden } : {}),
      ...(args.order !== undefined ? { order: args.order } : {}),
    });
    return null;
  },
});

/**
 * Usluga se ne briše — sakriva se. Postojeći termini čuvaju svoj `serviceTitle`,
 * pa istorija ostaje čitljiva.
 */
export const setHidden = mutation({
  args: { key: v.string(), serviceKey: v.string(), hidden: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const service = await getService(ctx, args.serviceKey);
    if (!service) throw new ConvexError(MESSAGES.service);
    await ctx.db.patch("services", service._id, { hidden: args.hidden });
    return null;
  },
});
