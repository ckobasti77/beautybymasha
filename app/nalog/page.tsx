import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatPercent } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * PRIVREMENO. Registracija, članska kartica i loyalty status su korak 05 — backend za
 * njih već postoji (convex/auth.ts, convex/loyalty.ts). Ova strana postoji samo da
 * dugme „Registrujte se" sa landinga ne vodi u 404. Korak 05 je briše.
 */
export const metadata: Metadata = { title: "Moj nalog" };

export default function NalogPlaceholder() {
  return (
    <>
      <SiteNav alwaysSolid />
      <main className="pt-16 md:pt-20">
        <Section>
          <SectionHeading
            eyebrow="Nalog"
            title="Registracija stiže uskoro"
            lead={`Nalog nosi ${formatPercent(site.loyalty.discountPercent)} popusta na sledeći račun, člansku karticu i istoriju termina. Do tada termin zakazujete i bez naloga.`}
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <Button as="a" href="/#zakazivanje">
              Zakažite termin
            </Button>
            <Button as="a" href={site.phone.href} variant="ghost">
              Pozovite {site.phone.display}
            </Button>
          </div>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
