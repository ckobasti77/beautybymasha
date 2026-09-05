import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * PRIVREMENO. Ceo webshop je korak 05 — ova strana postoji samo da dugme „Ceo katalog"
 * sa landinga ne vodi u 404 dok se sajt pokazuje vlasnici. Korak 05 je briše i
 * zamenjuje zidom swatch-eva iz docs/BRAND.md §7.
 */
export const metadata: Metadata = { title: "Shop" };

export default function ShopPlaceholder() {
  return (
    <>
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading
            eyebrow="Shop"
            title="Katalog se upravo sklapa"
            lead="Lakovi ORLY i Entity već se prodaju u salonu. Onlajn kupovina i korpa stižu u sledećem koraku."
          />
          <p className="mt-8">
            <Button as="a" href="/#shop">
              Pogledajte istaknute lakove
            </Button>
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
