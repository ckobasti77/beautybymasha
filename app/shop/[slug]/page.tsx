import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { AddToCartForm } from "@/components/shop/AddToCartForm";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductSwatch } from "@/components/shop/ProductSwatch";
import { BottleShowcase } from "@/components/three/BottleShowcase";
import { JsonLd } from "@/components/site/JsonLd";
import { Section } from "@/components/site/Section";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/jsonLd";
import { BRAND_LABELS, productBySlug, products, productCategoryByKey } from "@/lib/products";
import { FAMILY_LABELS, FINISH_LABELS, filtersToQuery } from "@/lib/shopFilters";
import { site } from "@/lib/site";

/**
 * Strana proizvoda. Katalog je statičan, pa se svih 70 strana gradi unapred;
 * cena i stanje su jedino što se traži uživo (`AddToCartForm`).
 *
 * Ispod fotografije stoji 3D bočica u nijansi ovog proizvoda. Ona je dodatak, ne
 * zamena: fotografija ostaje glavni prikaz i ono što ide u Google Images. Kad 3D
 * ne sme (telefon, „smanji kretanje“, bez WebGL2), blok jednostavno izostane —
 * slika koja mu je fallback stoji tačno iznad njega.
 */

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) return { title: "Proizvod nije pronađen" };

  return {
    title: `${product.name} · ${BRAND_LABELS[product.brand]}`,
    description: product.description,
    alternates: { canonical: `/shop/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} · ${BRAND_LABELS[product.brand]}`,
      description: product.description,
      url: `/shop/${product.slug}`,
      ...(product.localAvif ? { images: [{ url: product.localAvif }] } : {}),
    },
  };
}

/** Srodni: prvo ista porodica boje, pa isti brend kao dopuna. Nikad prazan red. */
function related(slug: string, family: string, brand: string) {
  const sameFamily = products.filter((p) => p.slug !== slug && p.family === family);
  const sameBrand = products.filter((p) => p.slug !== slug && p.brand === brand && p.family !== family);
  return [...sameFamily, ...sameBrand].slice(0, 5);
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const { slug } = await params;
  const product = productBySlug(slug);
  if (!product) notFound();

  const category = productCategoryByKey(product.category);
  const siblings = related(product.slug, product.family, product.brand);
  const only = (key: "category" | "family") =>
    `/shop${filtersToQuery({
      brand: null,
      category: key === "category" ? product.category : null,
      family: key === "family" ? product.family : null,
      finish: null,
      price: null,
    })}`;

  return (
    <>
      <JsonLd data={productJsonLd(product, { finalPriceRsd: product.priceRsd, inStock: product.stock > 0 })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Početna", path: "/" },
          { name: "Shop", path: "/shop" },
          { name: product.name, path: `/shop/${product.slug}` },
        ])}
      />

      <SiteNav alwaysSolid />
      <main id="sadrzaj" className="pt-16 md:pt-20">
        <Section>
          <nav aria-label="Putanja" className="flex flex-wrap items-center gap-1 text-caption text-fg-muted">
            <Link href="/shop" className="rounded-sm underline-offset-4 hover:text-fg hover:underline focus-ring">
              Shop
            </Link>
            <ChevronRight size={14} strokeWidth={1.5} aria-hidden />
            <Link
              href={only("category")}
              className="rounded-sm underline-offset-4 hover:text-fg hover:underline focus-ring"
            >
              {category.title}
            </Link>
            <ChevronRight size={14} strokeWidth={1.5} aria-hidden />
            <span className="text-fg">{product.name}</span>
          </nav>

          <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <Reveal variant="clip" className="group overflow-hidden rounded-lg bg-bg-sunken" revealOff>
                {product.localAvif ? (
                  <Image
                    src={product.localAvif}
                    alt={`${BRAND_LABELS[product.brand]} ${product.name}, lak za nokte`}
                    width={900}
                    height={900}
                    sizes="(min-width: 768px) 50vw, 100vw"
                    priority
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  // Entity nema fotografiju: veliki krug boje je ceo prikaz.
                  <div className="flex aspect-square w-full items-center justify-center p-10">
                    <ProductSwatch product={product} sizes="(min-width: 768px) 40vw, 80vw" priority />
                  </div>
                )}
              </Reveal>

              <div className="mt-4">
                <BottleShowcase
                  hex={product.hex}
                  label={`Bočica laka u nijansi ${product.name}. Povucite da je okrenete.`}
                  caption="Nijansa na bočici, prikazana u tri dimenzije. Povucite da je okrenete."
                  className="aspect-[4/3] w-full rounded-lg bg-bg-sunken"
                />
              </div>
            </div>

            <div>
              <p className="text-overline text-link">{BRAND_LABELS[product.brand]}</p>
              <h1 className="mt-3 text-h1 text-fg">{product.name}</h1>

              <ul className="mt-5 flex flex-wrap gap-2" data-reveal="off">
                <li>
                  <Link href={only("family")} className="rounded-pill focus-ring">
                    <Badge tone="mint">{FAMILY_LABELS[product.family]}</Badge>
                  </Link>
                </li>
                <li>
                  <Badge tone="neutral">{FINISH_LABELS[product.finish]}</Badge>
                </li>
                <li>
                  <Badge tone="neutral">{category.title}</Badge>
                </li>
                {product.bestseller ? (
                  <li>
                    <Badge tone="rose">Bestseler</Badge>
                  </li>
                ) : null}
              </ul>

              <p className="mt-6 text-base leading-relaxed text-fg-muted">{product.description}</p>

              <div className="mt-8">
                <AddToCartForm product={product} />
              </div>

              <div className="mt-10 rounded-md border border-line bg-bg-elev p-5">
                <h2 className="text-h3 text-fg">Dostupno i u salonu</h2>
                <p className="mt-2 text-sm text-fg-muted">
                  Isti proizvod prodajemo i u oba lokala u Belvilleu. Ako vam je bliže da svratite, pozovite{" "}
                  {site.phone.display} pa proverimo da li je nijansa na polici.
                </p>
                <p className="mt-3">
                  <Link
                    href="/#lokacije"
                    className="text-sm font-semibold text-link underline underline-offset-4 focus-ring"
                  >
                    Adrese i radno vreme
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </Section>

        {siblings.length > 0 ? (
          <Section tone="wash">
            <SectionHeading
              eyebrow="Slično"
              title="Još nijansi iz iste porodice"
              lead={`Boje koje stoje uz nijansu ${product.name} u istom manikiru.`}
            />
            <Reveal
              as="ul"
              stagger={0.05}
              revealOff
              className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-5"
            >
              {siblings.map((p) => (
                <ProductCard key={p.slug} product={p} sizes="(min-width: 768px) 20vw, 40vw" />
              ))}
            </Reveal>
          </Section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
