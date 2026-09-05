import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { inquiryStatusValidator } from "./schema";
import { assertAdmin } from "./lib/admin";
import { MESSAGES, validateEmail, validateName } from "./lib/validate";

/** Kontakt forma sa sajta. Poruka stiže u panel; mejl ide preko `notify` kasnije. */

export const INQUIRY_MESSAGES = {
  message: "Poruka mora imati između 5 i 2000 znakova.",
  emailRequired: "Upiši imejl da bismo mogli da odgovorimo.",
  notFound: "Poruka nije pronađena.",
} as const;

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const create = mutation({
  args: { name: v.string(), email: v.string(), message: v.string() },
  returns: v.id("inquiries"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = validateEmail(args.email);
    if (!email) throw new ConvexError(INQUIRY_MESSAGES.emailRequired);
    const name = validateName(args.name);
    const message = args.message.trim();
    if (message.length < 5 || message.length > 2000) throw new ConvexError(INQUIRY_MESSAGES.message);

    const recent = await ctx.db
      .query("inquiries")
      .withIndex("by_createdAt", (q) => q.gt("createdAt", now - RATE_LIMIT_WINDOW_MS))
      .collect();
    if (recent.filter((i) => i.email === email).length >= RATE_LIMIT_MAX) {
      throw new ConvexError(MESSAGES.rateLimit);
    }

    return await ctx.db.insert("inquiries", { name, email, message, status: "nova", createdAt: now });
  },
});

export const list = query({
  args: { key: v.optional(v.string()), status: v.optional(inquiryStatusValidator) },
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    if (args.status) {
      return await ctx.db
        .query("inquiries")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(200);
    }
    return await ctx.db.query("inquiries").withIndex("by_createdAt").order("desc").take(200);
  },
});

export const setStatus = mutation({
  args: { key: v.optional(v.string()), id: v.id("inquiries"), status: inquiryStatusValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertAdmin(ctx, args.key);
    const inquiry = await ctx.db.get(args.id);
    if (!inquiry) throw new ConvexError(INQUIRY_MESSAGES.notFound);
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});
