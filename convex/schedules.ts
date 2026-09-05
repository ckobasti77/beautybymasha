import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import schema, { locationKeyValidator, overrideKindValidator, rangeValidator } from "./schema";
import { assertAdmin, assertStaff } from "./lib/admin";
import { DEFAULT_SETTINGS, MAX_SCHEDULE_ROWS } from "./lib/availability";
import { MESSAGES, shortText, validateRanges } from "./lib/validate";
import { isValidDate } from "../lib/slots";

/** Nedeljno radno vreme oba lokala (2 lokala × 7 dana × par opsega). */
export const listWeekly = query({
  args: { key: v.string() },
  returns: v.array(schema.doc("schedules")),
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    return await ctx.db.query("schedules").take(200);
  },
});

/** Javno: radno vreme za prikaz na sajtu, bez ključa. */
export const weekly = query({
  args: {},
  returns: v.array(
    v.object({ locationKey: locationKeyValidator, weekday: v.number(), startMin: v.number(), endMin: v.number() }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("schedules").take(200);
    return rows.map((r) => ({
      locationKey: r.locationKey,
      weekday: r.weekday,
      startMin: r.startMin,
      endMin: r.endMin,
    }));
  },
});

/** Zameni sve opsege za jedan lokal + dan u nedelji. Prazan `ranges` = neradni dan. */
export const set = mutation({
  args: {
    key: v.string(),
    locationKey: locationKeyValidator,
    weekday: v.number(),
    ranges: v.array(rangeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    if (!Number.isInteger(args.weekday) || args.weekday < 0 || args.weekday > 6) throw new ConvexError(MESSAGES.range);
    if (args.ranges.length > 6) throw new ConvexError(MESSAGES.range);
    validateRanges(args.ranges);

    const existing = await ctx.db
      .query("schedules")
      .withIndex("by_location_weekday", (q) => q.eq("locationKey", args.locationKey).eq("weekday", args.weekday))
      .take(MAX_SCHEDULE_ROWS);
    for (const row of existing) await ctx.db.delete("schedules", row._id);
    for (const r of args.ranges) {
      await ctx.db.insert("schedules", {
        locationKey: args.locationKey,
        weekday: args.weekday,
        startMin: r.startMin,
        endMin: r.endMin,
      });
    }

    // Prvo čuvanje radnog vremena skriva baner „Podesi radno vreme".
    const settings = await ctx.db.query("settings").first();
    if (!settings) {
      await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, hoursConfirmed: true });
    } else if (!settings.hoursConfirmed) {
      await ctx.db.patch("settings", settings._id, { hoursConfirmed: true });
    }
    return null;
  },
});

/* ---------- Izuzeci po datumu (neradni dan / posebno radno vreme) ---------- */

export const listOverrides = query({
  args: { key: v.string(), from: v.string(), to: v.string() },
  returns: v.array(schema.doc("scheduleOverrides")),
  handler: async (ctx, args) => {
    await assertStaff(ctx, args.key);
    return await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_date", (q) => q.gte("date", args.from).lte("date", args.to))
      .take(200);
  },
});

export const upsertOverride = mutation({
  args: {
    key: v.string(),
    locationKey: locationKeyValidator,
    date: v.string(),
    kind: overrideKindValidator,
    startMin: v.optional(v.number()),
    endMin: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  returns: v.id("scheduleOverrides"),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    if (!isValidDate(args.date)) throw new ConvexError(MESSAGES.dateFormat);
    let startMin: number | undefined;
    let endMin: number | undefined;
    if (args.kind === "custom") {
      if (args.startMin === undefined || args.endMin === undefined) throw new ConvexError(MESSAGES.range);
      validateRanges([{ startMin: args.startMin, endMin: args.endMin }]);
      startMin = args.startMin;
      endMin = args.endMin;
    }
    const note = shortText(args.note);
    const existing = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_location_date", (q) => q.eq("locationKey", args.locationKey).eq("date", args.date))
      .take(10);
    // Tačno jedan izuzetak po lokalu + datumu.
    for (const dup of existing.slice(1)) await ctx.db.delete("scheduleOverrides", dup._id);
    const doc = {
      locationKey: args.locationKey,
      date: args.date,
      kind: args.kind,
      startMin,
      endMin,
      note,
    };
    const first = existing[0];
    if (first) {
      await ctx.db.replace("scheduleOverrides", first._id, doc);
      return first._id;
    }
    return await ctx.db.insert("scheduleOverrides", doc);
  },
});

export const removeOverride = mutation({
  args: { key: v.string(), id: v.id("scheduleOverrides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const doc = await ctx.db.get("scheduleOverrides", args.id);
    if (doc) await ctx.db.delete("scheduleOverrides", args.id);
    return null;
  },
});
