import { ExternalLink, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Section } from "@/components/site/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { locations, site } from "@/lib/site";

/**
 * Kontakt i podnožje (docs/BRAND.md §7, tačka 11): telefon, imejl, mreže, radno vreme
 * oba lokala. Svi podaci dolaze iz `data/site.json` — ništa se ne kuca dvaput.
 */

const LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-pill text-fg transition-colors duration-150 hover:text-link focus-ring";

export function SiteFooter() {
  return (
    <footer id="kontakt" className="border-t border-line bg-bg-sunken">
      <Section tone="sunken">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <SectionHeading eyebrow="Kontakt" title="Javite se" as="h2" />
            <ul className="mt-6 space-y-2">
              <li>
                <a href={site.phone.href} className={LINK}>
                  <Phone size={18} strokeWidth={1.5} aria-hidden />
                  <span className="num">{site.phone.display}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className={LINK}>
                  <Mail size={18} strokeWidth={1.5} aria-hidden />
                  {site.email}
                </a>
              </li>
              <li>
                <a href={site.social.instagram} target="_blank" rel="noreferrer" className={LINK}>
                  <ExternalLink size={18} strokeWidth={1.5} aria-hidden />
                  Instagram
                </a>
              </li>
              <li>
                <a href={site.social.facebook} target="_blank" rel="noreferrer" className={LINK}>
                  <ExternalLink size={18} strokeWidth={1.5} aria-hidden />
                  Facebook
                </a>
              </li>
            </ul>
          </div>

          {locations.map((l) => (
            <div key={l.key}>
              <h3 className="text-h3 text-fg">{l.name}</h3>
              <p className="mt-3 text-sm text-fg-muted">
                {l.address.street}, {l.address.building}
              </p>
              <p className="text-sm text-fg-muted">
                {l.address.area}, {l.address.city}
              </p>
              <dl className="mt-4 space-y-1.5">
                {l.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4">
                    <dt className="text-sm text-fg-muted">{h.days}</dt>
                    <dd className="num text-sm text-fg">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-line pt-8 sm:flex-row sm:items-center">
          <Logo variant="full" size={36} />
          <p className="text-caption text-fg-muted">
            © {new Date().getFullYear()} {site.legalName}. Fotografije su vlasništvo salona.
          </p>
        </div>
      </Section>
    </footer>
  );
}
