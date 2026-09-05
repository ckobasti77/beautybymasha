import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { photoById } from "@/lib/photos";

/**
 * „Naš tim" — jedna timska fotografija (bbm-10) uz kratak opis. Ide između „Radova"
 * i „ORLY / Shop" sekcije (app/page.tsx).
 *
 * Koristi se `-card` rez: `photo` (kadar) je po napomeni u data/photos.json odsekao deo
 * tima, pa se prikazuje cela njena objava. `alt` je iz photos.json, doslovno.
 *
 * [POTVRDITI kod vlasnice] imena, broj i uloge članova tima — dok se ne potvrde, tekst
 * ne navodi nijedno ime, godinu ni broj (docs/BRAND.md pominje samo „šest žena",
 * IG-opservacija, ne potvrđen roster).
 */

const TEAM = photoById("bbm-10");

export function TeamSection() {
  if (!TEAM) return null;

  return (
    <Section id="nas-tim">
      <div className="grid gap-10 md:grid-cols-2 md:items-center">
        <SectionHeading
          eyebrow="Naš tim"
          title="Ekipa koja radi u salonu"
          lead="U oba salona u Belvilleu radi tim kozmetičarki i manikirki. Ono što vidite na fotografijama iznad njihov je rad."
        />

        <Reveal
          variant="clip"
          revealOff
          className="mx-auto w-full max-w-sm overflow-hidden rounded-lg md:max-w-md"
        >
          <Image
            src={TEAM.card}
            alt={TEAM.alt}
            width={1080}
            height={Math.round(1080 / TEAM.aspect)}
            sizes="(min-width: 768px) 448px, 384px"
            className="w-full"
          />
        </Reveal>
      </div>
    </Section>
  );
}
