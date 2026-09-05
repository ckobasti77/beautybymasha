import { products } from "@/lib/products";
import { services } from "@/lib/services";
import { SiteNavClient } from "./SiteNavClient";

/**
 * Lepljiva navigacija (docs/BRAND.md §7). Ovo je server omotač: brojevi uz „Cenovnik"
 * (144) i „Shop" (70) u mobilnom meniju dolaze iz `data/services.json` i
 * `data/products.json`, ali ta dva JSON-a ne treba da uđu u klijentski JS svake strane
 * zbog dva broja — pa se izbroje ovde i prosleđuju kao dva `number`-a.
 *
 * Ponašanje (frosted podloga, logo, mobilni meni) je u `SiteNavClient.tsx`.
 */
export function SiteNav({ alwaysSolid = false }: { alwaysSolid?: boolean } = {}) {
  return (
    <SiteNavClient
      alwaysSolid={alwaysSolid}
      counts={{ services: services.length, products: products.length }}
    />
  );
}
