import { PriceBrowser } from "@/components/pricelist/PriceBrowser";
import { priceList as t } from "@/components/pricelist/strings";
import { Section } from "@/components/site/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { servicesMeta } from "@/lib/services";

/**
 * Cenovnik: 144 stavke, ali ne kao zid — čipovi grupa, pretraga sa sinonimima,
 * „Najčešće" na vrhu i „Zakažite" na svakom redu (spec 11 A). Sve interaktivno je u
 * `PriceBrowser` (klijent); naslov, uvod i fusnota ostaju serverski i ulaze kroz
 * site-wide reč-po-reč prolaz.
 *
 * Cene su VERBATIM iz njenog cenovnika i ne diraju se. Stavka bez cene (`priceRsd`
 * null) piše „na upit". Trajanje je procena i menja se samo kroz admin.
 */
export function PriceList() {
  return (
    <Section id="cenovnik" tone="paper">
      <SectionHeading eyebrow="Cenovnik" title="Sve usluge i sve cene" lead={t.lead} />
      <div className="mt-10">
        <PriceBrowser />
      </div>
      <p className="mt-8 text-caption text-fg-muted">{t.source(servicesMeta.source)}</p>
    </Section>
  );
}
