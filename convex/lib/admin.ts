import { ConvexError } from "convex/values";

export const ADMIN_MESSAGES = {
  badKey: "Neispravan ključ",
} as const;

/**
 * JEDINO mesto gde se odlučuje ko sme u admin. Svaka admin funkcija prima
 * `key` i prvo zove ovo.
 *
 *   npx convex env set ADMIN_KEY <ključ>          (dev)
 *   npx convex env set ADMIN_KEY <ključ> --prod   (produkcija)
 *
 * Prompt 3 uvodi Convex Auth i role — tada telo ove funkcije postaje provera
 * `ctx.auth.getUserIdentity()` + `role === "admin"`, a pozivi ostaju isti.
 */
export function assertAdminKey(key: string): void {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || key !== adminKey) {
    throw new ConvexError(ADMIN_MESSAGES.badKey);
  }
}
