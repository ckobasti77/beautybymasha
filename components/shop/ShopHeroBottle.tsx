"use client";

import { BottleShowcase } from "@/components/three/BottleShowcase";
import { useHoveredShade } from "@/components/shop/hoveredShade";
import { ProductSwatch } from "@/components/shop/ProductSwatch";
import { products } from "@/lib/products";

/**
 * Bočica u zaglavlju `/shop`. Tečnost prati nijansu nad kojom je pokazivač na
 * zidu swatch-eva; kad kursor ode sa zida, vraća se na podrazumevanu.
 *
 * Ceo blok je desktop-only (`hidden md:block` na roditelju u `app/shop/page.tsx`),
 * jer 3D ionako ne sme ispod 768 px — tako telefon ne dobije ni prazno mesto.
 * Kad je desktop ali WebGL ne sme (npr. „smanji kretanje"), ostaje kap laka u toj
 * nijansi; finiš se nađe po hex-u u katalogu (hover nosi samo hex).
 */
export function ShopHeroBottle({ defaultHex }: { defaultHex: string }) {
  const hovered = useHoveredShade();
  const hex = hovered ?? defaultHex;
  const finish = products.find((p) => p.hex === hex)?.finish ?? "creme";

  return (
    <BottleShowcase
      hex={hex}
      label="Bočica laka u izabranoj nijansi. Povucite da je okrenete."
      className="aspect-[3/4] w-full"
      fallback={
        <div className="flex aspect-[3/4] w-full items-center justify-center">
          <ProductSwatch hex={hex} finish={finish} className="w-2/3" />
        </div>
      }
    />
  );
}
