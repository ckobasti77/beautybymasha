import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Šta pretraživač sme da indeksira.
 *
 * Napolje ide javni sajt i katalog. Sve što je lično ili prolazno — panel,
 * nalog, korpa, plaćanje i potvrda porudžbine — ostaje zatvoreno. Iste rute
 * imaju i `robots: noindex` u svojoj `metadata`; robots.txt zaustavlja
 * obilazak, meta oznaka zaustavlja indeksiranje ako se do stranice ipak dođe.
 */
const PRIVATE_PATHS = ["/admin", "/nalog", "/korpa", "/placanje", "/porudzbina"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS.map((p) => `${p}/`).concat(PRIVATE_PATHS) },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
