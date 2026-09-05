import type { Metadata } from "next";
import { Hero } from "@/components/hero/Hero";
import { BookingSection } from "@/components/sections/BookingSection";
import { Gallery } from "@/components/sections/Gallery";
import { LocationsSection } from "@/components/sections/LocationsSection";
import { LoyaltyBar } from "@/components/sections/LoyaltyBar";
import { PriceList } from "@/components/sections/PriceList";
import { ReviewsSection } from "@/components/sections/ReviewsSection";
import { ServicesCircles } from "@/components/sections/ServicesCircles";
import { ShopHighlights } from "@/components/sections/ShopHighlights";
import { TeamSection } from "@/components/sections/TeamSection";
import { JsonLd } from "@/components/site/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonLd";
import { locations } from "@/lib/site";

export const metadata: Metadata = {
  title: "Beauty by Masha — kozmetički salon, Belville",
  description:
    "Manikir, pedikir, depilacija voskom i šećernom pastom, masaža, trepavice i obrve. Dva salona u Belvilleu, Novi Beograd. Zakazivanje onlajn, ORLY lakovi u prodaji.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Beauty by Masha — kozmetički salon, Belville",
    description:
      "Manikir, pedikir, depilacija, masaža, trepavice i obrve. Dva salona u Belvilleu. Zakazivanje onlajn.",
    url: "/",
  },
};

/**
 * Landing. Redosled sekcija je iz docs/BRAND.md §7 i ne menja se bez izmene tog fajla:
 * Nav · Hero · Loyalty · Usluge · Zakazivanje · Radovi · Naš tim · ORLY · Cenovnik ·
 * Lokacije · Recenzije · Kontakt.
 *
 * Struktuirani podaci stoje ovde, a ne u `app/layout.tsx`, jer su vezani za jednu
 * stranicu: na naslovnoj je ceo NAP oba lokala, pa je to stranica koju Google
 * spaja sa Business Profile-om. Lokali su DVA odvojena `BeautySalon` entiteta —
 * različita adresa i različito radno vreme (Mimoza ponedeljkom ne radi).
 */
export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      {locations.map((l) => (
        <JsonLd key={l.key} data={localBusinessJsonLd(l)} />
      ))}
      <SiteNav />
      <main id="sadrzaj">
        <Hero />
        <div className="pt-16 md:pt-20">
          <LoyaltyBar />
        </div>
        <ServicesCircles />
        <BookingSection />
        <Gallery />
        <TeamSection />
        <ShopHighlights />
        <PriceList />
        <LocationsSection />
        <ReviewsSection />
      </main>
      <SiteFooter />
    </>
  );
}
