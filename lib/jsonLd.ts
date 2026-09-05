/**
 * JSON-LD za katalog (skill seo-ecommerce).
 *
 * Pravila kojih se držimo:
 *  - samo ono što stvarno znamo. Bez `aggregateRating` i bez `review` — ocene
 *    proizvoda nemamo, a izmišljene su i pogrešne i kažnjive.
 *  - `image` samo kad postoji fotografija. Entity gel lakovi su `swatchOnly`,
 *    pa njihov `Product` ide bez slike.
 *  - cena je ono što sajt zaista naplaćuje; `priceValidUntil` se ne izmišlja.
 *  - sve URL adrese su apsolutne, jer se struktuirani podaci čitaju van konteksta.
 */
import { BRAND_LABELS, type Product } from "./products";
import { site } from "./site";

export function absoluteUrl(path: string): string {
  return new URL(path, site.url).toString();
}

export function productUrl(product: Product): string {
  return absoluteUrl(`/shop/${product.slug}`);
}

/** Schema.org tekstualna dostupnost — jedini podatak o stanju koji sme napolje. */
function availability(inStock: boolean): string {
  return inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

export function productJsonLd(product: Product, price: { finalPriceRsd: number; inStock: boolean }) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    color: product.hex,
    brand: { "@type": "Brand", name: BRAND_LABELS[product.brand] },
    ...(product.localAvif ? { image: [absoluteUrl(product.localAvif)] } : {}),
    offers: {
      "@type": "Offer",
      url: productUrl(product),
      priceCurrency: site.currency,
      price: String(price.finalPriceRsd),
      availability: availability(price.inStock),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: site.name, url: site.url },
    },
  };
}

/** Zid swatch-eva: lista sa referencama, bez ponavljanja celog `Product` 70 puta. */
export function catalogJsonLd(products: readonly Product[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${site.name} — katalog proizvoda`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: productUrl(p),
      name: p.name,
    })),
  };
}

export function breadcrumbJsonLd(trail: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}
