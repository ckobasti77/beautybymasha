import { MapPin, Navigation, Phone } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { locations } from "@/lib/site";

/**
 * Dva lokala, rame uz rame (docs/BRAND.md §7, tačka 9). Radno vreme se ispisuje za
 * SVAKI lokal posebno, iz `data/site.json` — Mimoza ponedeljkom ne radi i to mora da
 * se vidi bez otvaranja mape.
 *
 * „Navigacija" vodi u Google Maps preko `mapsQuery`, „Pozovite" na `tel:` broj.
 */
function mapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function LocationsSection() {
  return (
    <Section id="lokacije" tone="wash">
      <SectionHeading
        eyebrow="Lokacije"
        title="Dva lokala u Belvilleu"
        lead="Ljubičica i Mimoza su u istom bloku, na pet minuta hoda. Isti tim, isti cenovnik, isti broj telefona."
      />

      <Reveal as="ul" stagger className="mt-14 grid gap-6 md:grid-cols-2">
        {locations.map((l) => (
          <li key={l.key} className="rounded-md border border-line bg-bg-elev p-6 shadow-card">
            <span
              aria-hidden
              className="inline-flex size-11 items-center justify-center rounded-pill bg-tint text-link"
            >
              <MapPin size={20} strokeWidth={1.5} />
            </span>
            <h3 className="mt-4 text-h3 text-fg">{l.name}</h3>
            <p className="mt-2 text-fg-muted">
              {l.address.street}, {l.address.building}
            </p>
            <p className="text-fg-muted">
              {l.address.area}, {l.address.city}
            </p>

            <dl className="mt-5 space-y-1.5 border-t border-line pt-5">
              {l.hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4">
                  <dt className="text-sm text-fg-muted">{h.days}</dt>
                  <dd className="num text-sm font-medium text-fg">{h.time}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                as="a"
                href={l.phone.href}
                magnetic={false}
                leading={<Phone size={16} strokeWidth={1.5} aria-hidden />}
              >
                Pozovite
              </Button>
              <Button
                as="a"
                href={mapsUrl(l.mapsQuery)}
                target="_blank"
                rel="noreferrer"
                variant="ghost"
                leading={<Navigation size={16} strokeWidth={1.5} aria-hidden />}
              >
                Navigacija
              </Button>
            </div>
          </li>
        ))}
      </Reveal>
    </Section>
  );
}
