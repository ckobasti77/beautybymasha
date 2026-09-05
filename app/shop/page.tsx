import { Suspense } from "react";
import type { Metadata } from "next";
import { ShopHeroBottle } from "@/components/shop/ShopHeroBottle";
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
 *
 * U zaglavlju stoji 3D bočica čija tečnost prati nijansu pod kursorom. Cela
 * kolona je `hidden md:block` — ispod 768 px 3D ionako ne sme (ADR-005), pa
 * telefon ne dobija ni ukras ni prazno mesto.
 */

/** Nijansa koju bočica nosi dok kursor nije ni na jednoj kartici. */
const DEFAULT_SHADE =
  products.find((p) => p.bestseller && p.category === "lakovi")?.hex ?? products[0].hex;
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
      <main id="sadrzaj" className="pt-16 md:pt-20">
        <Section>
          <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
            <SectionHeading
              as="h1"
              eyebrow="ORLY i Entity"
              title="Lakovi kojima radimo u salonu"
              lead="ORLY klasični lakovi, baze, nadlakovi i nega noktiju, i Entity gel lakovi za trajni manikir. Poručujete ovde ili kupujete u salonu."
            />
            <div className="hidden md:block">
              <ShopHeroBottle defaultHex={DEFAULT_SHADE} />
            </div>
          </div>

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
