import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { locationKeyValidator } from "./schema";
import { assertAdmin } from "./lib/admin";
import { getLocation } from "./lib/availability";

/** Javno: lokali koje birač termina nudi. Adrese i telefoni su u data/site.json. */
export const list = query({
  args: {},
  returns: v.array(v.object({ key: locationKeyValidator, name: v.string(), order: v.number() })),
  handler: async (ctx) => {
    const rows = await ctx.db.query("locations").take(10);
    return rows
      .filter((l) => l.active)
      .sort((a, b) => a.order - b.order)
      .map((l) => ({ key: l.key, name: l.name, order: l.order }));
  },
});

/** Privremeno zatvaranje lokala: `active: false` ga sklanja iz zakazivanja. */
export const setActive = mutation({
  args: { key: v.string(), locationKey: locationKeyValidator, active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const location = await getLocation(ctx, args.locationKey);
    if (location) await ctx.db.patch("locations", location._id, { active: args.active });
    return null;
  },
});
