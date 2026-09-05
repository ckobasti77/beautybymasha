"use client";

import { BottleShowcase } from "@/components/three/BottleShowcase";
import { useHoveredShade } from "@/components/shop/hoveredShade";

/**
 * Bočica u zaglavlju `/shop`. Tečnost prati nijansu nad kojom je pokazivač na
 * zidu swatch-eva; kad kursor ode sa zida, vraća se na podrazumevanu.
 *
 * Ceo blok je desktop-only (`hidden md:block` na roditelju u `app/shop/page.tsx`),
 * jer 3D ionako ne sme ispod 768 px — tako telefon ne dobije ni prazno mesto.
 * Kad je desktop ali WebGL ne sme (npr. „smanji kretanje"), ostaje krug boje.
 */
export function ShopHeroBottle({ defaultHex }: { defaultHex: string }) {
  const hovered = useHoveredShade();
  const hex = hovered ?? defaultHex;

  return (
    <BottleShowcase
      hex={hex}
      label="Bočica laka u izabranoj nijansi. Povucite da je okrenete."
      className="aspect-[3/4] w-full"
      fallback={
        <div className="flex aspect-[3/4] w-full items-center justify-center">
          <span
            aria-hidden
            className="block aspect-square w-2/3 rounded-pill ring-1 ring-line"
            style={{ backgroundColor: hex }}
          />
        </div>
      }
    />
  );
}
