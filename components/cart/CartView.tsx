"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useCart } from "@/lib/cartStore";
import { CartTotals, type CartQuote } from "@/components/cart/CartTotals";
import { Button } from "@/components/ui/Button";
import { formatRsd } from "@/lib/format";
import { MAX_QTY_PER_LINE } from "@/lib/shop";
import type { CartItem } from "@/lib/cart";

/**
 * Korpa. Spisak želja je u `localStorage`, ali sve što se vidi kao cena stiže iz
 * `orders.quote` — server računa i redove i zbir. Ako se cena u međuvremenu
 * promenila u adminu, korpa to pokaže pri prvom otvaranju.
 *
 * Stavka koju server odbije (ugašen proizvod, rasprodato) ne blokira korpu:
 * pojavljuje se u `issues`, sa dugmetom da se izbaci.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

function Empty() {
  return (
    <div className="mt-10 rounded-lg border border-line bg-bg-elev p-8 text-center">
      <p className="text-base text-fg">Korpa je prazna.</p>
      <p className="mt-2 text-sm text-fg-muted">
        Lakovi, baze i nega su u katalogu; nijansu birate po krugu boje.
      </p>
      <p className="mt-6">
        <Button as="a" href="/shop">
          Otvorite katalog
        </Button>
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <p className="mt-10 text-fg-muted" aria-live="polite">
      Korpa se učitava…
    </p>
  );
}

function Line({
  line,
  onQty,
  onRemove,
}: {
  line: CartQuote["lines"][number];
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const max = Math.max(1, Math.min(MAX_QTY_PER_LINE, line.stock));
  return (
    <li className="flex items-start gap-4 py-5">
      <Link
        href={`/shop/${line.slug}`}
        aria-label={line.name}
        className="relative size-16 shrink-0 overflow-hidden rounded-pill ring-1 ring-line focus-ring"
        style={{ backgroundColor: line.hex }}
      >
        {line.imagePath ? (
          <Image src={line.imagePath} alt="" fill sizes="64px" className="object-cover" />
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">
          <Link href={`/shop/${line.slug}`} className="rounded-sm underline-offset-4 hover:underline focus-ring">
            {line.name}
          </Link>
        </p>
        <p className="num mt-1 text-caption text-fg-muted">
          {formatRsd(line.finalUnitPriceRsd)} po komadu
          {line.discountPercent > 0 ? <s className="ml-2">{formatRsd(line.unitPriceRsd)}</s> : null}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-pill border border-line bg-bg-elev">
            <button
              type="button"
              onClick={() => onQty(line.qty - 1)}
              aria-label={`Smanji količinu: ${line.name}`}
              className="inline-flex size-11 items-center justify-center rounded-pill text-fg hover:bg-bg-sunken focus-ring"
            >
              <Minus size={16} strokeWidth={1.5} aria-hidden />
            </button>
            <span className="num w-8 text-center text-sm font-semibold text-fg">{line.qty}</span>
            <button
              type="button"
              onClick={() => onQty(line.qty + 1)}
              disabled={line.qty >= max}
              aria-label={`Povećaj količinu: ${line.name}`}
              className="inline-flex size-11 items-center justify-center rounded-pill text-fg hover:bg-bg-sunken focus-ring disabled:opacity-40"
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center gap-2 rounded-pill px-3 text-sm text-fg-muted hover:bg-bg-sunken hover:text-danger-text focus-ring"
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden />
            Izbacite
          </button>
        </div>
      </div>

      <p className="num shrink-0 text-sm font-semibold text-fg">{formatRsd(line.lineTotal)}</p>
    </li>
  );
}

function CartWithQuote({ items }: { items: CartItem[] }) {
  const { setQty, remove } = useCart();
  const quote = useQuery(api.orders.quote, { items: items.map((i) => ({ slug: i.slug, qty: i.qty })) });

  // Server je smanjio količinu na ono što ima na stanju — korpa se poravnava
  // sa njim, da naplata ne bi prijavila istu grešku ponovo.
  useEffect(() => {
    if (!quote) return;
    for (const line of quote.lines) {
      const local = items.find((i) => i.slug === line.slug);
      if (local && local.qty !== line.qty) setQty(line.slug, line.qty);
    }
  }, [quote, items, setQty]);

  if (quote === undefined) return <Skeleton />;
  if (quote.lines.length === 0 && quote.issues.length === 0) return <Empty />;

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
      <div>
        {quote.issues.length > 0 ? (
          <ul className="mb-6 space-y-2" role="status">
            {quote.issues.map((issue) => (
              <li
                key={issue.slug}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-bg-sunken p-4 text-sm text-fg"
              >
                <span>
                  {issue.name}: {issue.reason}
                </span>
                <button
                  type="button"
                  onClick={() => remove(issue.slug)}
                  className="min-h-11 rounded-pill px-3 font-semibold text-link underline underline-offset-4 focus-ring"
                >
                  Izbacite iz korpe
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="divide-y divide-line border-y border-line" data-reveal="off">
          {quote.lines.map((line) => (
            <Line
              key={line.slug}
              line={line}
              onQty={(qty) => setQty(line.slug, qty)}
              onRemove={() => remove(line.slug)}
            />
          ))}
        </ul>

        <p className="mt-6">
          <Link href="/shop" className="text-sm font-semibold text-link underline underline-offset-4 focus-ring">
            Nastavite kupovinu
          </Link>
        </p>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-lg border border-line bg-bg-elev p-6">
          <h2 className="text-h3 text-fg">Zbir</h2>
          <div className="mt-4">
            <CartTotals quote={quote} />
          </div>
          <p className="mt-6">
            <Button
              as="a"
              href="/placanje"
              size="lg"
              className="w-full"
              aria-disabled={quote.lines.length === 0}
            >
              Nastavite na plaćanje
            </Button>
          </p>
        </div>
      </aside>
    </div>
  );
}

export function CartView() {
  const { items, hydrated } = useCart();

  if (!hydrated) return <Skeleton />;
  if (items.length === 0) return <Empty />;
  if (!HAS_BACKEND) {
    return (
      <p className="mt-10 rounded-md border border-line bg-bg-sunken p-6 text-fg-muted">
        Cene se računaju na serveru, a veza sa njim trenutno nije podešena. Pozovite salon i poručite telefonom.
      </p>
    );
  }
  return <CartWithQuote items={items} />;
}
