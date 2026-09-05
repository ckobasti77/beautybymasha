import { Suspense } from "react";
import type { Metadata } from "next";
import { OrderTracker } from "@/components/cart/OrderTracker";
import { Section } from "@/components/site/Section";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Praćenje porudžbine",
  description: "Unesite broj porudžbine i telefon pa vidite dokle je stigla.",
  robots: { index: false, follow: true },
};

export default function OrderTrackingPage() {
  return (
    <>
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading
            as="h1"
            eyebrow="Porudžbina"
            title="Dokle je stigla vaša porudžbina"
            lead="Trebaju nam broj porudžbine sa potvrde i broj telefona koji ste upisali pri naručivanju."
          />
          {/* useSearchParams čita „?broj=…" iz linka na potvrdi. */}
          <Suspense fallback={<p className="mt-10 text-fg-muted">Učitavanje…</p>}>
            <OrderTracker />
          </Suspense>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
