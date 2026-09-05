import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import schema, { locationKeyValidator, resourceKeyValidator } from "./schema";
import { assertStaff } from "./lib/admin";
import { MAX_BLOCKS_PER_DAY } from "./lib/availability";
import { MESSAGES, shortText, validateRanges } from "./lib/validate";
import { isValidDate } from "../lib/slots";

/**
 * Pauze jednog lokala za jedan datum. Pauza je vezana za resurs: pauza u
 * masaži ne dira nokte.
 */
export const listDay = query({
  args: { key: v.string(), locationKey: locationKeyValidator, date: v.string() },
  returns: v.array(schema.doc("blocks")),
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    return await ctx.db
      .query("blocks")
      .withIndex("by_location_date", (q) => q.eq("locationKey", args.locationKey).eq("date", args.date))
      .take(MAX_BLOCKS_PER_DAY);
  },
});

/** Pauze lokala za celu nedelju — kalendar ih traži jednim upitom, ne sedam puta. */
export const listRange = query({
  args: { key: v.string(), locationKey: locationKeyValidator, from: v.string(), to: v.string() },
  returns: v.array(schema.doc("blocks")),
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    return await ctx.db
      .query("blocks")
      .withIndex("by_location_date", (q) =>
        q.eq("locationKey", args.locationKey).gte("date", args.from).lte("date", args.to),
      )
      .take(MAX_BLOCKS_PER_DAY * 7);
  },
});

export const add = mutation({
  args: {
    key: v.string(),
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    date: v.string(),
    startMin: v.number(),
    endMin: v.number(),
    reason: v.optional(v.string()),
  },
  returns: v.id("blocks"),
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    if (!isValidDate(args.date)) throw new ConvexError(MESSAGES.dateFormat);
    validateRanges([{ startMin: args.startMin, endMin: args.endMin }]);
    return await ctx.db.insert("blocks", {
      locationKey: args.locationKey,
      resourceKey: args.resourceKey,
      date: args.date,
      startMin: args.startMin,
      endMin: args.endMin,
      reason: shortText(args.reason),
    });
  },
});

export const remove = mutation({
  args: { key: v.string(), id: v.id("blocks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    const doc = await ctx.db.get("blocks", args.id);
    if (doc) await ctx.db.delete("blocks", args.id);
    return null;
  },
});
