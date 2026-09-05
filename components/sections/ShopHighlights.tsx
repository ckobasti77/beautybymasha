import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { ProductSwatch } from "@/components/shop/ProductSwatch";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatRsd } from "@/lib/format";
import { bestsellers, products, type Product } from "@/lib/products";
import { SPILL_LAYOUT, spillPicks } from "@/lib/swatchSpill";

/**
 * ORLY i Entity — osam istaknutih (docs/BRAND.md §7, tačka 7). Kartica je krupan
 * swatch krug u pravoj boji laka, ime i cena; hover pušta gloss sweep preko kruga
 * i, ako proizvod ima fotografiju, crossfade-uje je preko boje.
 *
 * Zaglavlje sekcije je panel „prosutih kapi" (korak 12, spec K): promo fotografija
 * `bbm-24` („SAJAMSKI POPUST") je izbačena na zahtev klijenta, a dok ne stigne generisana
 * slika zida lakova (`public/photos/zid-lakova-1350.avif`), mesto drži kompozicija od 12
 * kapi iz `lib/swatchSpill.ts` na mint-wash podlozi, sa naslovom sekcije preko. Kad slika
 * stigne: zameniti `<SpillPanel>` sa `next/image` u istom omotaču.
 *
 * Boje i cene dolaze iz `data/products.json`. Cene su okvirne i to piše u sekciji —
 * `products.meta.priceNote` je [POTVRDITI kod vlasnice].
 */

function highlights(): Product[] {
  const picked = [...bestsellers].filter((p) => p.category === "lakovi" || p.category === "gel-lak");
  for (const p of products) {
    if (picked.length >= 8) break;
    if (picked.some((x) => x.slug === p.slug)) continue;
    if (p.category === "lakovi" || p.category === "gel-lak") picked.push(p);
  }
  return picked.slice(0, 8);
}

const PICKED = highlights();
const SPILL = spillPicks();

/**
 * Kapi su Sistem 2 (GSAP, `Reveal stagger`): prazni spanovi bez teksta, pa `revealOff`
 * da ih hideCss() ne sakrije zauvek. Naslov levo je običan copy — Sistem 1 ga otkriva
 * reč po reč; dva sistema se ovde ne dodiruju (docs/MOTION.md).
 *
 * Svaka kap stoji u apsolutnom spanu BEZ transforma (GSAP mu vozi `y`); centriranje po
 * visini radi negativna `margin-top` u % — procenat margine se računa od ŠIRINE roditelja,
 * a kap je kvadratna, pa je -size/2 tačno pola njene visine.
 */
function SpillPanel() {
  return (
    <Reveal
      stagger={0.05}
      revealOff
      className="relative mx-4 mb-6 h-44 md:absolute md:inset-y-0 md:right-0 md:m-0 md:h-auto md:w-1/2"
    >
      {SPILL.map((p, i) => {
        const spot = SPILL_LAYOUT[i];
        if (!spot) return null;
        return (
          <span
            key={p.slug}
            className="absolute"
            style={{
              left: `${spot.x - spot.size / 2}%`,
              top: `${spot.y}%`,
              width: `${spot.size}%`,
              marginTop: `${-spot.size / 2}%`,
            }}
          >
            <ProductSwatch hex={p.hex} finish={p.finish} className="w-full" />
          </span>
        );
      })}
    </Reveal>
  );
}

export function ShopHighlights() {
  return (
    <Section id="shop">
      <div className="relative overflow-hidden rounded-lg bg-tint-wash">
        <div className="relative z-10 flex flex-col items-start gap-8 px-6 py-10 md:w-1/2 md:px-10 md:py-14">
          <SectionHeading
            eyebrow="ORLY i Entity"
            title="Lakovi koje koristi u salonu"
            lead="Isti lakovi kojima radi trajni i klasični manikir. Kupujete ih ovde ili u salonu."
          />
          <Button as="a" href="/shop" variant="ghost" size="lg" className="shrink-0">
            Ceo katalog
          </Button>
        </div>
        <SpillPanel />
      </div>

      <Reveal as="ul" stagger={0.05} className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {PICKED.map((p) => (
          <li key={p.slug} className="group">
            {/* Fluidna veličina: fiksni px krug ume da bude širi od svoje kolone na 390 px. */}
            <ProductSwatch hex={p.hex} finish={p.finish} className="mx-auto w-full max-w-32">
              {p.localAvif ? (
                <Image
                  src={p.localAvif}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover opacity-0 transition-opacity delay-300 duration-300 ease-out-expo can-hover:group-hover:opacity-100"
                />
              ) : null}
            </ProductSwatch>
            <p className="mt-4 text-center text-sm font-semibold text-fg">{p.name}</p>
            <p className="num mt-1 text-center text-sm text-fg-muted">{formatRsd(p.priceRsd)}</p>
            {p.bestseller ? (
              <p className="mt-2 text-center">
                <Badge tone="rose">Bestseler</Badge>
              </p>
            ) : null}
          </li>
        ))}
      </Reveal>

      <p className="mt-10 text-caption text-fg-muted">
        Cene proizvoda su okvirne dok ih ne potvrdi vlasnica. [POTVRDITI]
      </p>
    </Section>
  );
}
