import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { Section } from "@/components/site/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatRsd } from "@/lib/format";
import { photoById } from "@/lib/photos";
import { bestsellers, products, type Product } from "@/lib/products";

/**
 * ORLY i Entity — osam istaknutih (docs/BRAND.md §7, tačka 7). Kartica je krupan
 * swatch krug u pravoj boji laka, ime i cena; hover pušta gloss sweep preko kruga
 * i, ako proizvod ima fotografiju, crossfade-uje je preko boje.
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
const WALL = photoById("bbm-24");

export function ShopHighlights() {
  return (
    <Section id="shop">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="ORLY i Entity"
          title="Lakovi koje koristi u salonu"
          lead="Isti lakovi kojima radi trajni i klasični manikir. Kupujete ih ovde ili u salonu."
        />
        <Button as="a" href="/shop" variant="ghost" size="lg" className="shrink-0">
          Ceo katalog
        </Button>
      </div>

      {WALL ? (
        <Reveal variant="clip" className="mt-12 overflow-hidden rounded-lg" revealOff>
          <Image
            src={WALL.card}
            alt={WALL.alt}
            width={1350}
            height={Math.round(1350 / WALL.aspect)}
            sizes="(min-width: 1024px) 1200px, 100vw"
            className="max-h-[420px] w-full object-cover object-center"
          />
        </Reveal>
      ) : null}

      <Reveal as="ul" stagger={0.05} className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {PICKED.map((p) => (
          <li key={p.slug} className="group">
            <span
              // Fluidna veličina: fiksni px krug ume da bude širi od svoje kolone na 390 px.
              className="swatch-gloss mx-auto block aspect-square w-full max-w-32 rounded-pill ring-1 ring-line"
              style={{ backgroundColor: p.hex }}
              aria-hidden
            >
              {p.localAvif ? (
                <Image
                  src={p.localAvif}
                  alt=""
                  width={320}
                  height={320}
                  sizes="128px"
                  className="size-full rounded-pill object-cover opacity-0 transition-opacity duration-300 ease-out-expo group-hover:opacity-100"
                />
              ) : null}
            </span>
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
