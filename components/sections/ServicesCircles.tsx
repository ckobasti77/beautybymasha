import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { photoById } from "@/lib/photos";
import { countServicesIn, serviceCategories } from "@/lib/serviceCategories";

/**
 * Pet krugova (docs/BRAND.md §7, tačka 4). Krug je motiv iz logotipa, pa je i ikona
 * kategorije krug — bez ijedne dodatne slike, samo njena fotografija u maski.
 * Svaki krug vodi na cenovnik sa filterom (`#cenovnik?g=…` čita `PriceList`).
 *
 * Reveal animira mrežu (kontejner), text-reveal reči u naslovima. Nikad oba na
 * istom čvoru — docs/MOTION.md.
 */
export function ServicesCircles() {
  return (
    <Section id="usluge">
      <SectionHeading
        eyebrow="Usluge"
        title="Pet grupa, jedan cenovnik"
        signature="sve na jednom mestu"
        lead="Svaka grupa vodi pravo u cenovnik, na svoj deo spiska sa cenama i procenjenim trajanjem."
      />

      <Reveal as="ul" stagger className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
        {serviceCategories.map((c) => {
          const photo = photoById(c.photoId);
          return (
            <li key={c.key}>
              <a
                href={`#cenovnik-${c.groups[0]}`}
                className="group flex flex-col items-center gap-4 rounded-md p-2 text-center focus-ring"
              >
                {/* Fluidna veličina: fiksni px krug ume da bude širi od svoje kolone na 390 px. */}
                <span className="relative block aspect-square w-full max-w-32 overflow-hidden rounded-pill bg-tint ring-1 ring-line transition-[transform,box-shadow] duration-300 ease-out-expo group-hover:-translate-y-1 group-hover:shadow-card">
                  {photo ? (
                    <Image
                      src={photo.photo}
                      alt={photo.alt}
                      width={640}
                      height={Math.round(640 / photo.aspect)}
                      sizes="128px"
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>
                <span className="block">
                  <span className="block text-h3 text-fg">{c.title}</span>
                  <span className="num mt-1 block text-caption text-fg-muted">
                    {countServicesIn(c)} u cenovniku
                  </span>
                </span>
              </a>
              <p className="mt-3 text-center text-sm text-fg-muted">{c.blurb}</p>
            </li>
          );
        })}
      </Reveal>
    </Section>
  );
}
