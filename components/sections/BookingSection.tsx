import { BookingWizard } from "@/components/booking/BookingWizard";
import { Section } from "@/components/site/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { booking } from "@/components/booking/strings";

/**
 * Zakazivanje je ugrađeno u landing (docs/BRAND.md §7, tačka 5), ne vodi na zaseban
 * ekran. Naslov je izvan čarobnjaka, pa ga hvata site-wide reč-po-reč prolaz; sve
 * unutar `<form>`-a je chrome i mora da bude čitljivo istog trena.
 */
export function BookingSection() {
  return (
    <Section id="zakazivanje" tone="sunken">
      <SectionHeading eyebrow={booking.eyebrow} title={booking.title} lead={booking.lead} />
      <div className="mt-12">
        <BookingWizard />
      </div>
    </Section>
  );
}
