import { v } from "convex/values";
import { query } from "./_generated/server";
import { locationKeyValidator, resourceKeyValidator } from "./schema";
import {
  getLocation,
  getService,
  getSettings,
  resourceOfGroup,
  slotsFor,
  workRangesFor,
} from "./lib/availability";
import { addDays, isValidDate } from "../lib/slots";

/**
 * `now` šalje klijent (zaokružen na 5 min) da upit ostane keširan i reaktivan —
 * upit ne sme da čita sat sa servera. Kad se izostavi, uzima se sat servera:
 * to je tu samo za ručne pozive iz konzole i skripti.
 */
const nowArg = v.optional(v.number());

const dayResult = v.object({
  locationKey: locationKeyValidator,
  resourceKey: resourceKeyValidator,
  durationMin: v.number(),
  /** Počeci u minutima od ponoći. */
  slots: v.array(v.number()),
  /** Da li lokal tog dana uopšte radi — razlika između „zatvoreno" i „nema termina". */
  open: v.boolean(),
});

/** Slobodni počeci za jedan lokal, jednu uslugu i jedan datum. */
export const slots = query({
  args: {
    locationKey: locationKeyValidator,
    serviceKey: v.string(),
    date: v.string(),
    now: nowArg,
  },
  returns: dayResult,
  handler: async (ctx, args) => {
    const nowMs = args.now ?? Date.now();
    const service = await getService(ctx, args.serviceKey);
    const resourceKey = service ? resourceOfGroup(service.groupKey) : "nokti";
    const empty = {
      locationKey: args.locationKey,
      resourceKey,
      durationMin: service?.durationMin ?? 0,
      slots: [],
      open: false,
    };
    if (!isValidDate(args.date)) return empty;
    const location = await getLocation(ctx, args.locationKey);
    if (!location || !location.active) return empty;
    const open = (await workRangesFor(ctx, args.locationKey, args.date)).length > 0;
    if (!service || service.hidden || !service.bookable) return { ...empty, open };
    const settings = await getSettings(ctx);
    return {
      locationKey: args.locationKey,
      resourceKey,
      durationMin: service.durationMin,
      slots: await slotsFor(ctx, {
        locationKey: args.locationKey,
        resourceKey,
        date: args.date,
        durationMin: service.durationMin,
        settings,
        nowMs,
      }),
      open,
    };
  },
});

/**
 * Sedam dana od `fromDate` za nedeljnu traku: koliko slobodnih početaka ima
 * tog dana i da li lokal uopšte radi.
 */
export const week = query({
  args: {
    locationKey: locationKeyValidator,
    serviceKey: v.string(),
    fromDate: v.string(),
    now: nowArg,
  },
  returns: v.array(v.object({ date: v.string(), count: v.number(), open: v.boolean() })),
  handler: async (ctx, args) => {
    if (!isValidDate(args.fromDate)) return [];
    const nowMs = args.now ?? Date.now();
    const location = await getLocation(ctx, args.locationKey);
    const service = await getService(ctx, args.serviceKey);
    const bookable = service !== null && !service.hidden && service.bookable;
    const settings = await getSettings(ctx);
    const out: { date: string; count: number; open: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(args.fromDate, i);
      if (!location || !location.active) {
        out.push({ date, count: 0, open: false });
        continue;
      }
      const open = (await workRangesFor(ctx, args.locationKey, date)).length > 0;
      const count =
        bookable && service
          ? (
              await slotsFor(ctx, {
                locationKey: args.locationKey,
                resourceKey: resourceOfGroup(service.groupKey),
                date,
                durationMin: service.durationMin,
                settings,
                nowMs,
              })
            ).length
          : 0;
      out.push({ date, count, open });
    }
    return out;
  },
});
