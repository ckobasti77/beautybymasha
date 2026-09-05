import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";
import { LoyaltyBar } from "@/components/sections/LoyaltyBar";
import { Section } from "@/components/site/Section";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { SectionHeading } from "@/components/ui/SectionHeading";

/** Korpa se ne indeksira — svaki poseti izgleda drugačije i nema šta da rangira. */
export const metadata: Metadata = {
  title: "Korpa",
  description: "Pregled izabranih proizvoda pre naplate.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading as="h1" eyebrow="Korpa" title="Šta nosite kući" />
          <CartView />
          <div className="mt-16">
            <LoyaltyBar bare />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
