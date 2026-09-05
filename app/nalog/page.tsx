import type { Metadata } from "next";
import { AccountView } from "@/components/nalog/AccountView";
import { Section } from "@/components/site/Section";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatPercent } from "@/lib/format";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Moj nalog",
  description: `Nalog nosi ${formatPercent(site.loyalty.discountPercent)} popusta na sledeći račun, člansku karticu sa QR kodom i pregled termina i porudžbina.`,
  alternates: { canonical: "/nalog" },
  robots: { index: true, follow: true },
};

export default function AccountPage() {
  return (
    <>
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading
            as="h1"
            eyebrow="Nalog"
            title="Vaša članska kartica"
            lead={`Nalog nosi ${formatPercent(site.loyalty.discountPercent)} popusta na sledeći račun, i u salonu i na sajtu. Registracija traži imejl i lozinku, ništa više.`}
          />
          <AccountView />
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
