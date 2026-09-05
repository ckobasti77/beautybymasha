import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertAdminKey } from "./lib/admin";
import { DEFAULT_SETTINGS, getSettings, type Settings } from "./lib/availability";
import { MESSAGES } from "./lib/validate";

const settingsShape = v.object({
  slotStepMin: v.number(),
  leadTimeMin: v.number(),
  horizonDays: v.number(),
  holdHours: v.number(),
  hoursConfirmed: v.boolean(),
});

/**
 * Javno (bez ključa): brojke koje birač termina pokazuje gostu — horizont za
 * nedeljnu traku i rok potvrde u poruci uspeha. Bez ličnih podataka.
 */
export const publicInfo = query({
  args: {},
  returns: v.object({
    slotStepMin: v.number(),
    leadTimeMin: v.number(),
    horizonDays: v.number(),
    holdHours: v.number(),
  }),
  handler: async (ctx) => {
    const s = await getSettings(ctx);
    return {
      slotStepMin: s.slotStepMin,
      leadTimeMin: s.leadTimeMin,
      horizonDays: s.horizonDays,
      holdHours: s.holdHours,
    };
  },
});

export const get = query({
  args: { key: v.string() },
  returns: settingsShape,
  handler: async (ctx, args) => {
    assertAdminKey(args.key);
    return await getSettings(ctx);
  },
});

/** „Potvrdi radno vreme" bez izmena — podrazumevani raspored je već tačan, baner nestaje. */
export const confirmHours = mutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdminKey(args.key);
    const existing = await ctx.db.query("settings").first();
    if (!existing) {
      await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, hoursConfirmed: true });
    } else if (!existing.hoursConfirmed) {
      await ctx.db.patch("settings", existing._id, { hoursConfirmed: true });
    }
    return null;
  },
});

function assertInt(n: number | undefined, min: number, max: number): void {
  if (n === undefined) return;
  if (!Number.isInteger(n) || n < min || n > max) throw new ConvexError(MESSAGES.range);
}

export const update = mutation({
  args: {
    key: v.string(),
    slotStepMin: v.optional(v.number()),
    leadTimeMin: v.optional(v.number()),
    horizonDays: v.optional(v.number()),
    holdHours: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertAdminKey(args.key);
    assertInt(args.slotStepMin, 5, 120);
    assertInt(args.leadTimeMin, 0, 7 * 24 * 60);
    assertInt(args.horizonDays, 1, 365);
    assertInt(args.holdHours, 1, 24 * 30);
    const patch: Partial<Omit<Settings, "hoursConfirmed">> = {};
    if (args.slotStepMin !== undefined) patch.slotStepMin = args.slotStepMin;
    if (args.leadTimeMin !== undefined) patch.leadTimeMin = args.leadTimeMin;
    if (args.horizonDays !== undefined) patch.horizonDays = args.horizonDays;
    if (args.holdHours !== undefined) patch.holdHours = args.holdHours;
    const existing = await ctx.db.query("settings").first();
    if (existing) {
      await ctx.db.patch("settings", existing._id, patch);
    } else {
      await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, ...patch, hoursConfirmed: false });
    }
    return null;
  },
});
