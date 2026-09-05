"use client";

import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { formatPercent, formatRsd } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Zbir korpe. Svaki red dolazi sa servera (`orders.quote`) — ovde se ništa ne
 * računa, samo ispisuje. Kad bi se ovde sabiralo, postojala bi druga istina o
 * ceni pored one iz baze.
 *
 * Loyalty popust je NAMERNO zaseban red, a ne niža cena po stavci: kupac treba
 * da vidi koliko ga članstvo tačno štedi na ovom računu.
 */

export type CartQuote = FunctionReturnType<typeof api.orders.quote>;

function Row({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "muted" | "accent" | "total";
}) {
  const valueClass =
    tone === "accent" ? "text-success-text" : tone === "total" ? "text-h3 text-fg" : "text-fg";
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={tone === "total" ? "text-base font-semibold text-fg" : "text-sm text-fg-muted"}>
        {label}
      </dt>
      <dd className={`num text-right text-sm font-semibold ${valueClass}`}>{value}</dd>
    </div>
  );
}

export function CartTotals({ quote }: { quote: CartQuote }) {
  const { loyalty } = quote;
  const freeShipping = quote.shippingRsd === 0 && quote.subtotalRsd > 0;
  const toFreeShipping = site.shipping.freeOverRsd - quote.subtotalRsd;

  return (
    <div data-reveal="off">
      <dl className="divide-y divide-line">
        <Row label="Roba" value={formatRsd(quote.subtotalRsd)} />

        {quote.loyaltyDiscountRsd > 0 ? (
          <Row
            label={`Loyalty popust ${formatPercent(loyalty.discountPercent)}`}
            value={`− ${formatRsd(quote.loyaltyDiscountRsd)}`}
            tone="accent"
          />
        ) : null}

        <Row label="Dostava" value={freeShipping ? "Besplatno" : formatRsd(quote.shippingRsd)} />
        <Row label="Ukupno" value={formatRsd(quote.totalRsd)} tone="total" />
      </dl>

      {!freeShipping && toFreeShipping > 0 ? (
        <p className="mt-3 text-caption text-fg-muted">
          Do besplatne dostave nedostaje {formatRsd(toFreeShipping)}.
        </p>
      ) : null}

      {/*
        Tri stanja loyalty programa, tri različite poruke. Neulogovanom se nudi
        registracija; članu koji je popust već potrošio se kaže zašto ga sad nema.
      */}
      {!loyalty.signedIn ? (
        <p className="mt-4 rounded-md border border-line bg-accent-soft p-4 text-sm text-fg">
          Članovi imaju {formatPercent(site.loyalty.discountPercent)} popusta na sledeći račun.{" "}
          <Link href="/nalog" className="font-semibold text-link underline underline-offset-4 focus-ring">
            Registrujte se
          </Link>{" "}
          pre naplate i popust ulazi u ovaj zbir.
        </p>
      ) : loyalty.applies ? (
        <p className="mt-4 text-caption text-fg-muted">
          Popust je već uračunat. Troši se na ovoj porudžbini, pa novo pravo stičete posle sledeće posete.
        </p>
      ) : (
        <p className="mt-4 text-caption text-fg-muted">
          Popust ste već iskoristili. Novo pravo stičete posle sledeće plaćene posete ili porudžbine.
        </p>
      )}
    </div>
  );
}
