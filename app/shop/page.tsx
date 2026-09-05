import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopWall } from "@/components/shop/ShopWall";
import { JsonLd } from "@/components/site/JsonLd";
import { Section } from "@/components/site/Section";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { breadcrumbJsonLd, catalogJsonLd } from "@/lib/jsonLd";
import { products } from "@/lib/products";

/**
 * Zid swatch-eva. Sve kartice su u HTML-u koji stiže sa servera; `ShopWall`
 * ih samo filtrira i dopisuje živu cenu. Zato strana radi i pre nego što se
 * JavaScript izvrši, i vidljiva je pretraživačima kakva jeste.
 */
export const metadata: Metadata = {
  title: "Shop",
  description:
    "ORLY lakovi, baze, nadlakovi i nega noktiju, i Entity gel lakovi za trajni manikir. Poručite onlajn ili kupite u salonu u Belvilleu.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop · Beauty by Masha",
    description: "ORLY i Entity lakovi koje koristimo u salonu.",
    url: "/shop",
  },
};

export default function ShopPage() {
  return (
    <>
      <JsonLd data={catalogJsonLd(products)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Početna", path: "/" },
          { name: "Shop", path: "/shop" },
        ])}
      />
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading
            as="h1"
            eyebrow="ORLY i Entity"
            title="Lakovi kojima radimo u salonu"
            lead="ORLY klasični lakovi, baze, nadlakovi i nega noktiju, i Entity gel lakovi za trajni manikir. Poručujete ovde ili kupujete u salonu."
          />

          {/* useSearchParams traži granicu — bez nje cela strana ide u klijentski render. */}
          <Suspense fallback={<p className="mt-10 text-fg-muted">Katalog se učitava…</p>}>
            <ShopWall />
          </Suspense>

          <p className="mt-12 text-caption text-fg-muted">
            Cene proizvoda su okvirne dok ih ne potvrdi vlasnica. [POTVRDITI]
          </p>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
