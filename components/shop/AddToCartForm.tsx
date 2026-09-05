"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cartStore";
import { Button } from "@/components/ui/Button";
import { formatRsd } from "@/lib/format";
import { MAX_QTY_PER_LINE } from "@/lib/shop";
import type { Product } from "@/lib/products";

/**
 * Količina i „Dodaj u korpu" na strani proizvoda.
 *
 * Cena i stanje se čitaju iz baze i prepisuju statički katalog — u adminu se i
 * jedno i drugo menja bez novog deploy-a. Statička cena je samo prvi kadar, da
 * mesto za cenu ne bude prazno dok Convex ne odgovori.
 *
 * Dodavanje u korpu ne šalje cenu. Korpa nosi `slug` i količinu; koliko to
 * košta odlučuje `orders.quote`, pa `orders.create` još jednom pre upisa.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

function QuantityStepper({
  qty,
  max,
  onChange,
}: {
  qty: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const step = (delta: number) => onChange(Math.min(max, Math.max(1, qty + delta)));
  return (
    <div className="inline-flex items-center gap-1 rounded-pill border border-line bg-bg-elev p-1">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={qty <= 1}
        aria-label="Smanji količinu"
        className="inline-flex size-11 items-center justify-center rounded-pill text-fg transition-colors hover:bg-bg-sunken focus-ring disabled:opacity-40"
      >
        <Minus size={18} strokeWidth={1.5} aria-hidden />
      </button>
      <output aria-live="polite" className="num w-10 text-center text-base font-semibold text-fg">
        {qty}
      </output>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={qty >= max}
        aria-label="Povećaj količinu"
        className="inline-flex size-11 items-center justify-center rounded-pill text-fg transition-colors hover:bg-bg-sunken focus-ring disabled:opacity-40"
      >
        <Plus size={18} strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}

function Form({
  product,
  live,
}: {
  product: Product;
  live: { priceRsd: number; finalPriceRsd: number; inStock: boolean; stock: number } | null;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const base = live?.priceRsd ?? product.priceRsd;
  const final = live?.finalPriceRsd ?? product.priceRsd;
  const stock = live?.stock ?? product.stock;
  const inStock = live ? live.inStock : product.stock > 0;
  const max = Math.max(1, Math.min(MAX_QTY_PER_LINE, stock));

  return (
    <div data-reveal="off">
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="num text-h2 text-fg">{formatRsd(final)}</span>
        {final < base ? <s className="num text-lg text-fg-muted">{formatRsd(base)}</s> : null}
      </p>

      {inStock ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <QuantityStepper qty={Math.min(qty, max)} max={max} onChange={(n) => { setQty(n); setAdded(false); }} />
            <Button
              size="lg"
              leading={added ? <Check size={18} strokeWidth={2} aria-hidden /> : <ShoppingBag size={18} strokeWidth={1.5} aria-hidden />}
              onClick={() => {
                add(product.slug, Math.min(qty, max));
                setAdded(true);
              }}
            >
              {added ? "Dodato u korpu" : "Dodajte u korpu"}
            </Button>
          </div>
          <p aria-live="polite" className="mt-3 min-h-6 text-sm text-fg-muted">
            {added ? (
              <>
                U korpi je.{" "}
                <Link href="/korpa" className="font-semibold text-link underline underline-offset-4 focus-ring">
                  Otvorite korpu
                </Link>
              </>
            ) : stock <= 3 ? (
              `Na stanju je još ${stock} kom.`
            ) : null}
          </p>
        </>
      ) : (
        <p className="mt-6 rounded-md border border-line bg-bg-sunken p-4 text-sm text-fg-muted">
          Trenutno nema na stanju. Pozovite salon i recite koju nijansu tražite.
        </p>
      )}
    </div>
  );
}

function FormWithLivePrice({ product }: { product: Product }) {
  const row = useQuery(api.products.bySlug, { slug: product.slug });
  return (
    <Form
      product={product}
      live={
        row
          ? { priceRsd: row.priceRsd, finalPriceRsd: row.finalPriceRsd, inStock: row.inStock, stock: row.stock }
          : null
      }
    />
  );
}

export function AddToCartForm({ product }: { product: Product }) {
  if (!HAS_BACKEND) return <Form product={product} live={null} />;
  return <FormWithLivePrice product={product} />;
}
