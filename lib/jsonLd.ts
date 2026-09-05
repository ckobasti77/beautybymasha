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
import { site, type Location } from "./site";

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

/* =====================================================================
 * Lokalni SEO — dva lokala, dva entiteta (skill seo-local + seo-schema)
 * ===================================================================== */

/** Schema.org imena dana; indeks je isti kao u `workWeek` (0 = nedelja). */
const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * `openingHoursSpecification` iz `workWeek` jednog lokala.
 *
 * Prazan dan se NE preskače nego se upisuje kao `00:00–00:00`. To je način na
 * koji Schema.org kaže „zatvoreno", i jedini način da se u strukturiranim
 * podacima vidi da Mimoza ponedeljkom ne radi. Preskočen dan bi se čitao kao
 * „ne znamo", što nije isto.
 */
function openingHours(location: Location) {
  return location.workWeek.map((intervals, weekday) => {
    const day = SCHEMA_DAYS[weekday];
    if (intervals.length === 0) {
      return { "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: "00:00", closes: "00:00" };
    }
    // Podeljena smena bi ovde dala više redova za isti dan; oba lokala za sada
    // imaju po jedan interval dnevno, ali se raspored čita iz podataka, ne fiksno.
    return intervals.map((iv) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day,
      opens: iv.start,
      closes: iv.end,
    }));
  }).flat();
}

/** „11070 Novi Beograd" → poštanski broj i mesto odvojeno, kako schema traži. */
function postalAddress(location: Location) {
  const m = /^(\d{5})\s+(.*)$/.exec(location.address.city);
  return {
    "@type": "PostalAddress",
    streetAddress: location.address.street,
    addressLocality: m ? m[2] : location.address.city,
    ...(m ? { postalCode: m[1] } : {}),
    addressCountry: "RS",
  };
}

export function organizationId(): string {
  return `${site.url}/#organization`;
}

export function locationId(location: Location): string {
  return `${site.url}/#lokal-${location.key}`;
}

/**
 * Jedan `BeautySalon` po lokalu — dva odvojena entiteta, ne jedan sa dve adrese.
 * Google spaja Business Profile sa entitetom po NAP-u (naziv, adresa, telefon),
 * pa naziv, adresa i telefon ovde moraju da budu doslovno isti kao u footeru,
 * na Google Business profilu i na Instagramu.
 *
 * `geo` namerno NEMA: tačne koordinate oba ulaza nisu potvrđene i ne izmišljaju se.
 * `hasMap` pokriva isti posao dok koordinate ne stignu ([POTVRDITI], docs/STATUS.md).
 */
export function localBusinessJsonLd(location: Location) {
  return {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    "@id": locationId(location),
    name: location.fullName,
    url: site.url,
    image: absoluteUrl("/opengraph-image"),
    telephone: location.phone.href.replace("tel:", ""),
    email: site.email,
    address: postalAddress(location),
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.mapsQuery)}`,
    openingHoursSpecification: openingHours(location),
    priceRange: "1.200–8.200 RSD",
    currenciesAccepted: site.currency,
    paymentAccepted: "Gotovina, platne kartice",
    sameAs: [site.social.instagram, site.social.facebook, site.social.threads],
    parentOrganization: { "@id": organizationId() },
  };
}

/** Krovni entitet — pod njim stoje oba lokala i webshop. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId(),
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: absoluteUrl("/opengraph-image"),
    email: site.email,
    telephone: site.phone.href.replace("tel:", ""),
    sameAs: [site.social.instagram, site.social.facebook, site.social.threads],
    subOrganization: site.locations.map((l) => ({ "@id": locationId(l) })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    url: site.url,
    name: site.name,
    description: site.tagline,
    inLanguage: site.lang,
    publisher: { "@id": organizationId() },
  };
}
