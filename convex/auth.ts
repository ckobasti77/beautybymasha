import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { EMAIL_VERIFICATION_ENABLED, ResendOtp } from "./lib/emailOtp";
import { formatLoyaltyNumber } from "./lib/loyalty";

/**
 * Nalozi za ceo sajt (ADR-003). Isti login za kupce i za vlasnicu — razlika je `role`.
 *
 * Registracija je NAMERNO minimalna: imejl, lozinka, potvrda lozinke. Ime, telefon
 * i adresa se traže tek na naplati, kad kupac ionako mora da ih unese.
 */

export const AUTH_MESSAGES = {
  email: "Upiši ispravnu imejl adresu.",
  password: "Lozinka mora imati bar 8 znakova.",
  passwordMismatch: "Lozinke se ne poklapaju.",
} as const;

const MIN_PASSWORD_LENGTH = 8;

function normalizeEmail(raw: unknown): string {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (email.length > 120 || !/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError(AUTH_MESSAGES.email);
  }
  return email;
}

/**
 * „BM" + 6 cifara, jedinstveno. Šest cifara je milion kombinacija na salon sa
 * par hiljada članova — sudar je redak, ali se ipak proverava, pa se pokušava
 * ponovo. Posle 12 promašaja pada, jer je tada nešto drugo u kvaru.
 */
async function issueLoyaltyNumber(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const candidate = formatLoyaltyNumber(bytes[0]);
    const taken = await ctx.db
      .query("users")
      .withIndex("by_loyaltyNumber", (q) => q.eq("loyaltyNumber", candidate))
      .first();
    if (!taken) return candidate;
  }
  throw new Error("Ne mogu da dodelim jedinstven broj članske kartice.");
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // Potvrda imejla je iza jedne zastavice (vidi convex/lib/emailOtp.ts).
      verify: EMAIL_VERIFICATION_ENABLED ? ResendOtp : undefined,

      profile(params) {
        const email = normalizeEmail(params.email);
        // Potvrda lozinke se proverava i na serveru — ne samo u formi.
        if (params.flow === "signUp") {
          const password = typeof params.password === "string" ? params.password : "";
          const confirm = params.confirmPassword;
          if (typeof confirm === "string" && confirm !== password) {
            throw new ConvexError(AUTH_MESSAGES.passwordMismatch);
          }
        }
        return { email };
      },

      validatePasswordRequirements(password) {
        if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
          throw new ConvexError(AUTH_MESSAGES.password);
        }
      },
    }),
  ],

  callbacks: {
    /**
     * Convex Auth prvo ubaci `users` dokument sa samo `email`. Ovde mu se dopisuje
     * ono što je naše: uloga, broj članske kartice i datum upisa.
     *
     * Prva registracija sa `OWNER_EMAIL` dobija `role: "admin"` — bez toga
     * vlasnica ne bi mogla u panel posle gašenja rezervnog `ADMIN_KEY` puta.
     */
    async afterUserCreatedOrUpdated(rawCtx, { userId }) {
      // `callbacks` daju netipizovan ctx; naša šema je ovde poznata.
      const ctx = rawCtx as unknown as MutationCtx;
      const id = userId as Id<"users">;
      const user = await ctx.db.get(id);
      if (!user) return;

      const patch: { role?: "admin" | "customer"; loyaltyNumber?: string; createdAt?: number } = {};

      if (!user.role) {
        const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
        patch.role = ownerEmail && user.email?.toLowerCase() === ownerEmail ? "admin" : "customer";
      }
      if (!user.loyaltyNumber) {
        patch.loyaltyNumber = await issueLoyaltyNumber(ctx);
      }
      if (!user.createdAt) {
        patch.createdAt = Date.now();
      }

      if (Object.keys(patch).length > 0) await ctx.db.patch(id, patch);
    },
  },
});
