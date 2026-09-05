import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ProductSwatch } from "@/components/shop/ProductSwatch";
import { formatRsd } from "@/lib/format";
import { BRAND_LABELS, type Product } from "@/lib/products";
import { FINISH_LABELS } from "@/lib/shopFilters";

/**
 * Kartica na zidu swatch-eva: krug boje, ime, brend i cena.
 *
 * Cena ima dva izvora. Statički katalog (`data/products.json`) crta karticu na
 * serveru, pa zid postoji i pre nego što se Convex javi. Kad stigne živa cena
 * (`price`), popust se vidi kao precrtana stara cena. Redosled je namerno takav:
 * nikad prazno mesto gde treba da stoji cena.
 */

export type LivePrice = {
  readonly priceRsd: number;
  readonly finalPriceRsd: number;
  readonly discountPercent: number;
  readonly inStock: boolean;
};

export function ProductPrice({ product, price }: { product: Product; price?: LivePrice }) {
  const base = price?.priceRsd ?? product.priceRsd;
  const final = price?.finalPriceRsd ?? product.priceRsd;
  if (final < base) {
    return (
      <span className="num inline-flex flex-wrap items-baseline justify-center gap-2">
        <span className="font-semibold text-fg">{formatRsd(final)}</span>
        <s className="text-fg-muted decoration-danger/60">{formatRsd(base)}</s>
      </span>
    );
  }
  return <span className="num font-semibold text-fg">{formatRsd(final)}</span>;
}

export function ProductCard({
  product,
  price,
  sizes = "(min-width: 1024px) 220px, (min-width: 768px) 30vw, 40vw",
  priority = false,
}: {
  product: Product;
  price?: LivePrice;
  sizes?: string;
  priority?: boolean;
}) {
  const soldOut = price ? !price.inStock : product.stock === 0;
  const discounted = price ? price.finalPriceRsd < price.priceRsd : false;

  return (
    <li className="group">
      <Link
        href={`/shop/${product.slug}`}
        className="flex h-full flex-col rounded-md p-2 text-center focus-ring"
      >
        <span className="relative mx-auto block w-full max-w-36">
          <ProductSwatch product={product} sizes={sizes} priority={priority} />
          {soldOut ? (
            <span className="absolute inset-x-0 bottom-1 flex justify-center">
              <Badge tone="neutral">Rasprodato</Badge>
            </span>
          ) : discounted ? (
            <span className="absolute inset-x-0 bottom-1 flex justify-center">
              <Badge tone="rose">Sniženo</Badge>
            </span>
          ) : product.bestseller ? (
            <span className="absolute inset-x-0 bottom-1 flex justify-center">
              <Badge tone="mint">Bestseler</Badge>
            </span>
          ) : null}
        </span>

        <span className="mt-4 block text-caption text-fg-muted">
          {BRAND_LABELS[product.brand]} · {FINISH_LABELS[product.finish]}
        </span>
        <span className="mt-1 block text-sm font-semibold text-fg">{product.name}</span>
        <span className="mt-1 block text-sm">
          <ProductPrice product={product} price={price} />
        </span>
      </Link>
    </li>
  );
}
