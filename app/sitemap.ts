import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

/**
 * Mapa sajta: samo javne rute. Panel, nalog, korpa, plaćanje i potvrda
 * porudžbine ovde namerno ne postoje — vidi `app/robots.ts`.
 *
 * `lastModified` je vreme builda: sajt se gradi kad se sadržaj promeni, pa je
 * to jedini datum koji ovde nije izmišljen.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${site.url}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/shop`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    ...products.map((p) => ({
      url: `${site.url}/shop/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
