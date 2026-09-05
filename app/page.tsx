import { Hero } from "@/components/hero/Hero";
import { BookingSection } from "@/components/sections/BookingSection";
import { Gallery } from "@/components/sections/Gallery";
import { LocationsSection } from "@/components/sections/LocationsSection";
import { LoyaltyBar } from "@/components/sections/LoyaltyBar";
import { PriceList } from "@/components/sections/PriceList";
import { ReviewsSection } from "@/components/sections/ReviewsSection";
import { ServicesCircles } from "@/components/sections/ServicesCircles";
import { ShopHighlights } from "@/components/sections/ShopHighlights";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

/**
 * Landing. Redosled sekcija je iz docs/BRAND.md §7 i ne menja se bez izmene tog fajla:
 * Nav · Hero · Loyalty · Usluge · Zakazivanje · Radovi · ORLY · Cenovnik · Lokacije ·
 * Recenzije · Kontakt.
 */
export default function Home() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <div className="pt-16 md:pt-20">
          <LoyaltyBar />
        </div>
        <ServicesCircles />
        <BookingSection />
        <Gallery />
        <ShopHighlights />
        <PriceList />
        <LocationsSection />
        <ReviewsSection />
      </main>
      <SiteFooter />
    </>
  );
}
