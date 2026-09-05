import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type Ctx = QueryCtx | MutationCtx;

export const ADMIN_MESSAGES = {
  badKey: "Neispravan ključ",
  notSignedIn: "Prijavi se.",
  forbidden: "Nemaš pristup ovoj stranici.",
} as const;

/** Ulogovani korisnik ili `null`. Jedini put do identiteta — `userId` se nikad ne prima kao argument. */
export async function currentUser(ctx: Ctx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  return userId === null ? null : await ctx.db.get(userId);
}

export async function hasAdminAccount(ctx: Ctx): Promise<boolean> {
  const admin = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .first();
  return admin !== null;
}

/**
 * JEDINO mesto gde se odlučuje ko sme u admin.
 *
 * Glavni put je uloga: ulogovan korisnik sa `role: "admin"` prolazi bez ključa.
 *
 * Rezervni put je `ADMIN_KEY` iz env-a i radi SAMO dok u bazi ne postoji nijedan
 * admin nalog. Bez toga bi prazna baza bila zaključana spolja: panel bi tražio
 * admin nalog, a admin nalog se pravi kroz panel. Čim se prvi admin napravi
 * (registracija sa `OWNER_EMAIL`, vidi convex/auth.ts), ključ prestaje da važi.
 *
 *   npx convex env set ADMIN_KEY <ključ>          (dev)
 *   npx convex env set OWNER_EMAIL <njen imejl>   (postaje admin pri registraciji)
 */
export async function assertAdmin(ctx: Ctx, key?: string): Promise<Doc<"users"> | null> {
  const user = await currentUser(ctx);
  if (user?.role === "admin") return user;

  if (await hasAdminAccount(ctx)) {
    // Admin postoji — rezervni ključ je ugašen, traži se prava prijava.
    throw new ConvexError(user ? ADMIN_MESSAGES.forbidden : ADMIN_MESSAGES.badKey);
  }

  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || key !== adminKey) throw new ConvexError(ADMIN_MESSAGES.badKey);
  return user;
}

/** Vlasnica i radnice — sve što admin sme, plus radnice za loyalty na pultu. */
export async function assertStaff(ctx: Ctx, key?: string): Promise<Doc<"users"> | null> {
  const user = await currentUser(ctx);
  if (user?.role === "admin" || user?.role === "staff") return user;
  return await assertAdmin(ctx, key);
}

/** Prijavljen korisnik ili greška — za „moje porudžbine", profil, loyalty karticu. */
export async function assertSignedIn(ctx: Ctx): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) throw new ConvexError(ADMIN_MESSAGES.notSignedIn);
  return user;
}
