import { Email } from "@convex-dev/auth/providers/Email";
import { site } from "../../lib/site";

/**
 * Potvrda imejla šestocifrenim kodom preko Resend-a.
 *
 * ZASTAVICA: potvrda je isključena dok `AUTH_EMAIL_VERIFICATION` nije `"true"`.
 * Uključuje se jednom komandom, bez izmene koda:
 *
 *   npx convex env set AUTH_EMAIL_VERIFICATION true [--prod]
 *   npx convex env set RESEND_API_KEY re_xxx [--prod]
 *   npx convex env set RESEND_FROM "Beauty by Masha <nalozi@domen.rs>" [--prod]
 *
 * Bez `RESEND_API_KEY` slanje puca namerno: bolje da registracija stane nego da
 * korisnik čeka kod koji nikad ne stiže.
 */
export const EMAIL_VERIFICATION_ENABLED = process.env.AUTH_EMAIL_VERIFICATION === "true";

const OTP_TTL_SECONDS = 15 * 60;

export const ResendOtp = Email({
  id: "resend-otp",
  maxAge: OTP_TTL_SECONDS,

  async generateVerificationToken() {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return String(bytes[0] % 1_000_000).padStart(6, "0");
  },

  async sendVerificationRequest({ identifier: email, token }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Potvrda imejla je uključena, ali RESEND_API_KEY nije postavljen.");
    }
    const from = process.env.RESEND_FROM || `${site.name} <onboarding@resend.dev>`;
    const minutes = OTP_TTL_SECONDS / 60;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${token} — kod za potvrdu naloga`,
        text: `Tvoj kod za potvrdu naloga na sajtu ${site.name} je ${token}. Važi ${minutes} minuta.`,
        html:
          `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#2f2a2e">` +
          `<p style="margin:0 0 12px">Kod za potvrdu naloga:</p>` +
          `<p style="font-size:30px;letter-spacing:6px;margin:0 0 12px"><strong>${token}</strong></p>` +
          `<p style="margin:0;font-size:13px;color:#7a6f75">Važi ${minutes} minuta. Ako ovo nisi ti, ignoriši poruku.</p>` +
          `</div>`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend nije poslao kod (${res.status}).`);
    }
  },
});
