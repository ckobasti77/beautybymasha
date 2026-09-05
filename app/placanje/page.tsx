import type { Metadata } from "next";
import { CheckoutView } from "@/components/cart/CheckoutView";
import { Section } from "@/components/site/Section";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Plaćanje",
  description: "Podaci za dostavu i način plaćanja.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading as="h1" eyebrow="Plaćanje" title="Gde šaljemo i kako plaćate" />
          <CheckoutView />
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
