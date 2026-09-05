import Image from "next/image";
import type { Product } from "@/lib/products";

/**
 * Krug boje laka — motiv iz logotipa (docs/BRAND.md §4).
 *
 * Hover pušta gloss sweep (`swatch-gloss` u globals.css, 600 ms dijagonalni
 * specular). ORLY ima fotografiju, pa se ona posle sweep-a crossfade-uje preko
 * boje. Entity nema fotografiju (`swatchOnly`) — tu ostaje samo boja i sweep;
 * slika koje nemamo se ne izmišlja.
 *
 * Kontejner mora da nosi klasu `group`. Na dodir nema hovera: `can-hover:`
 * varijanta gasi crossfade, a kartica se na tap blago uveća.
 */
export function ProductSwatch({
  product,
  sizes,
  priority = false,
  className,
}: {
  product: Product;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[
        "swatch-gloss relative block aspect-square w-full rounded-pill ring-1 ring-line",
        "transition-transform duration-300 ease-out-expo can-hover:group-hover:scale-[1.02] group-active:scale-[1.04]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: product.hex }}
      aria-hidden
    >
      {product.localAvif ? (
        <Image
          src={product.localAvif}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          // Slika je već u toku (`fill`), pa crossfade ne pomera ništa u rasporedu.
          // Kreće sa zadrškom da sweep prvi pređe preko boje.
          className="rounded-pill object-cover opacity-0 transition-opacity delay-300 duration-300 ease-out-expo can-hover:group-hover:opacity-100 can-hover:group-focus-within:opacity-100"
        />
      ) : null}
    </span>
  );
}
