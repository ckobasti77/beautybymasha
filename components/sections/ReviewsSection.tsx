import { ExternalLink, Star } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Recenzije (docs/BRAND.md §7, tačka 10).
 *
 * NAMERNO BEZ CITATA. `docs/BRIEF.md` beleži samo da 011info navodi 28 ocena i članstvo
 * od 10 godina; nijedan pojedinačni komentar nemamo, a izmišljati ga se ne sme
 * (CLAUDE.md). Zato ovde stoje samo broj i link na izvor.
 *
 * [POTVRDITI da smemo da citiramo] — pre javnog objavljivanja treba dozvola da se
 * ocene sa 011info uopšte prikazuju na njenom sajtu.
 */

const REVIEWS_URL = "https://www.011info.com/kozmeticki-saloni/salon-beauty-by-masha";
const RATINGS_COUNT = 28;
const MEMBER_YEARS = 10;

export function ReviewsSection() {
  return (
    <Section id="recenzije">
      <Reveal className="mx-auto max-w-2xl rounded-lg border border-line bg-bg-elev p-8 text-center shadow-card">
        <span aria-hidden className="inline-flex gap-1 text-accent">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={20} strokeWidth={1.5} fill="currentColor" />
          ))}
        </span>
        <SectionHeading
          as="h2"
          align="center"
          eyebrow="Recenzije"
          title={`${RATINGS_COUNT} ocena na 011info`}
          className="mt-5"
          lead={`Salon je na 011info profilu ${MEMBER_YEARS} godina. Ocene čitate na izvoru, kod nas nema prepričavanja.`}
        />
        <p className="mx-auto mt-6">
          <Button
            as="a"
            href={REVIEWS_URL}
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            trailing={<ExternalLink size={16} strokeWidth={1.5} aria-hidden />}
          >
            Otvorite 011info profil
          </Button>
        </p>
        <p className="mt-6 text-caption text-fg-muted">
          [POTVRDITI] pre objave: da li smemo da prikazujemo ocene sa 011info na sajtu salona.
        </p>
      </Reveal>
    </Section>
  );
}
