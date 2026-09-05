import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { locationKeyValidator, resourceKeyValidator } from "./schema";
import { assertAdminKey } from "./lib/admin";
import { MESSAGES } from "./lib/validate";

/** Najveći broj paralelnih mesta po resursu — brana od greške u kucanju. */
export const MAX_CAPACITY = 20;

const capacityRow = v.object({
  locationKey: locationKeyValidator,
  resourceKey: resourceKeyValidator,
  count: v.number(),
});

/**
 * Javno: koliko ljudi istovremeno radi koji resurs u kom lokalu.
 * Bez ličnih podataka — birač termina po ovome zna da li lokal uopšte radi tu uslugu.
 */
export const list = query({
  args: {},
  returns: v.array(capacityRow),
  handler: async (ctx) => {
    const rows = await ctx.db.query("capacities").take(50);
    return rows.map((r) => ({ locationKey: r.locationKey, resourceKey: r.resourceKey, count: r.count }));
  },
});

/** Postavi kapacitet za (lokal, resurs). 0 = taj lokal ne radi tu grupu usluga. */
export const set = mutation({
  args: {
    key: v.string(),
    locationKey: locationKeyValidator,
    resourceKey: resourceKeyValidator,
    count: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdminKey(args.key);
    if (!Number.isInteger(args.count) || args.count < 0 || args.count > MAX_CAPACITY) {
      throw new ConvexError(MESSAGES.capacity);
    }
    const rows = await ctx.db
      .query("capacities")
      .withIndex("by_location", (q) => q.eq("locationKey", args.locationKey))
      .take(10);
    const existing = rows.find((r) => r.resourceKey === args.resourceKey);
    if (existing) {
      await ctx.db.patch("capacities", existing._id, { count: args.count });
    } else {
      await ctx.db.insert("capacities", {
        locationKey: args.locationKey,
        resourceKey: args.resourceKey,
        count: args.count,
      });
    }
    return null;
  },
});
