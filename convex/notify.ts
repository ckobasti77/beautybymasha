import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { site } from "../lib/site";

/**
 * Mejl vlasnici o novom zahtevu (Resend). Bez `RESEND_API_KEY` samo zapiše u log
 * i ne puca — zahtev je već u bazi i vidi se u /admin.
 *
 *   npx convex env set RESEND_API_KEY re_xxx [--prod]
 *   npx convex env set NOTIFY_EMAIL beautybymasha@yahoo.com [--prod]   (podrazumevano: site.email)
 *   npx convex env set RESEND_FROM "Beauty by Masha <termini@domen.rs>" [--prod]
 *   npx convex env set SITE_URL https://... [--prod]                   (podrazumevano: site.url)
 *
 * `onboarding@resend.dev` kao pošiljalac radi bez verifikovanog domena, ali Resend
 * tada isporučuje samo na adresu vlasnika Resend naloga.
 */
export const newRequest = internalAction({
  args: {
    name: v.string(),
    phone: v.string(),
    serviceTitle: v.string(),
    locationName: v.string(),
    date: v.string(),
    timeRange: v.string(),
    note: v.string(),
    /** settings.holdHours u trenutku zahteva — posle toliko sati zahtev sam ističe. */
    holdHours: v.number(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(
        `notify.newRequest: RESEND_API_KEY nije postavljen — preskačem mejl (${args.serviceTitle}, ${args.date} ${args.timeRange})`,
      );
      return null;
    }
    const to = process.env.NOTIFY_EMAIL || site.email;
    const from = process.env.RESEND_FROM || `${site.name} <onboarding@resend.dev>`;
    const adminUrl = `${(process.env.SITE_URL || site.url).replace(/\/$/, "")}/admin`;

    const [y, m, d] = args.date.split("-");
    const prettyDate = `${d}.${m}.${y}.`;
    const subject = `Nov zahtev: ${args.serviceTitle} · ${prettyDate} ${args.timeRange}`;
    const lines = [
      `Usluga: ${args.serviceTitle}`,
      `Lokal: ${args.locationName}`,
      `Termin: ${prettyDate} ${args.timeRange}`,
      `Ime: ${args.name}`,
      `Telefon: ${args.phone}`,
      args.note ? `Napomena: ${args.note}` : "",
      "",
      `Potvrdi ili odbij u panelu: ${adminUrl}`,
      `Zahtev sam ističe posle ${args.holdHours} h ako ga ne potvrdiš.`,
    ].filter(Boolean);

    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = [
      `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#2f2a2e">`,
      `<p style="font-size:18px;margin:0 0 12px"><strong>${esc(args.serviceTitle)}</strong> · ${esc(prettyDate)} ${esc(args.timeRange)}</p>`,
      `<p style="margin:0 0 4px">Lokal: ${esc(args.locationName)}</p>`,
      `<p style="margin:0 0 4px">Ime: ${esc(args.name)}</p>`,
      `<p style="margin:0 0 4px">Telefon: <a href="tel:${esc(args.phone)}">${esc(args.phone)}</a></p>`,
      args.note ? `<p style="margin:0 0 4px">Napomena: ${esc(args.note)}</p>` : "",
      `<p style="margin:16px 0 0"><a href="${esc(adminUrl)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#c9899b;color:#fff;text-decoration:none">Otvori panel</a></p>`,
      `<p style="margin:12px 0 0;font-size:13px;color:#7a6f75">Zahtev sam ističe posle ${args.holdHours} h ako ga ne potvrdiš.</p>`,
      `</div>`,
    ].join("");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text: lines.join("\n"), html }),
      });
      if (!res.ok) {
        console.warn("Resend nije uspeo", res.status, await res.text());
      }
    } catch (err) {
      console.warn("Resend zahtev je pukao", err instanceof Error ? err.message : String(err));
    }
    return null;
  },
});
