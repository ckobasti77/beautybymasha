"use client";

import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import { Check } from "lucide-react";
import type { api } from "@/convex/_generated/api";
import { QrCode } from "@/components/ui/QrCode";
import { formatPercent, formatRsd } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Potvrda posle poslate porudžbine. Broj porudžbine je najvažnija stvar na
 * ekranu jer se njime porudžbina prati i diktira telefonom.
 *
 * IPS blok se crta samo ako ga je server poslao. Kad podaci primaoca nisu
 * potvrđeni, `buildIpsPaymentDetails` vraća `null` i QR se ne pravi — račun se
 * ne izmišlja.
 */

export type PlacedOrder = FunctionReturnType<typeof api.orders.create>;

export function OrderReceipt({ order }: { order: PlacedOrder }) {
  return (
    <div className="mt-10 max-w-prose" data-reveal="off">
      <p className="inline-flex items-center gap-2 rounded-pill bg-tint px-4 py-2 text-sm font-semibold text-fg">
        <Check size={18} strokeWidth={2} aria-hidden />
        Porudžbina je primljena
      </p>

      <h2 className="mt-6 text-h2 text-fg">Broj porudžbine</h2>
      <p className="num mt-2 text-h1 tracking-tight text-link">{order.orderNumber}</p>
      <p className="mt-4 text-base text-fg-muted">
        Zapišite ovaj broj. Sa njim i brojem telefona koji ste upisali pratite porudžbinu, a i mi je po
        njemu nalazimo kad pozovete.
      </p>

      <dl className="mt-8 divide-y divide-line border-y border-line">
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-sm text-fg-muted">Roba</dt>
          <dd className="num text-sm font-semibold text-fg">{formatRsd(order.subtotalRsd)}</dd>
        </div>
        {order.loyaltyDiscountRsd > 0 ? (
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-sm text-fg-muted">
              Loyalty popust {formatPercent(site.loyalty.discountPercent)}
            </dt>
            <dd className="num text-sm font-semibold text-success-text">
              − {formatRsd(order.loyaltyDiscountRsd)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-sm text-fg-muted">Dostava</dt>
          <dd className="num text-sm font-semibold text-fg">
            {order.shippingRsd === 0 ? "Besplatno" : formatRsd(order.shippingRsd)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-base font-semibold text-fg">Ukupno</dt>
          <dd className="num text-h3 text-fg">{formatRsd(order.totalRsd)}</dd>
        </div>
      </dl>

      {order.paymentMethod === "pouzecem" ? (
        <p className="mt-6 rounded-md border border-line bg-bg-elev p-5 text-sm text-fg-muted">
          Plaćate kuriru pri preuzimanju. Javljamo se telefonom pre slanja.
        </p>
      ) : order.ips ? (
        <section className="mt-8 rounded-lg border border-line bg-bg-elev p-6">
          <h3 className="text-h3 text-fg">IPS nalog za plaćanje</h3>
          <p className="mt-2 text-sm text-fg-muted">
            Otvorite aplikaciju svoje banke, izaberite plaćanje skeniranjem i uslikajte kod.
          </p>
          <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-start">
            <QrCode
              value={order.ips.payload}
              label={`IPS QR kod za porudžbinu ${order.orderNumber}`}
              size={176}
            />
            <dl className="min-w-0 flex-1 space-y-2 text-sm">
              <div>
                <dt className="text-fg-muted">Primalac</dt>
                <dd className="font-semibold text-fg">{order.ips.recipientName}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Račun</dt>
                <dd className="num font-semibold text-fg">{order.ips.formattedAccount}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Iznos</dt>
                <dd className="num font-semibold text-fg">{formatRsd(order.ips.amountRsd)}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Svrha</dt>
                <dd className="font-semibold text-fg">{order.ips.purpose}</dd>
              </div>
              <div>
                <dt className="text-fg-muted">Poziv na broj</dt>
                <dd className="num font-semibold text-fg">
                  {order.ips.reference} <span className="text-fg-muted">(model 00)</span>
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-5 text-caption text-fg-muted">
            Robu šaljemo kad uplata bude vidljiva na izvodu.
          </p>
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href={`/porudzbina?broj=${encodeURIComponent(order.orderNumber)}`}
          className="text-sm font-semibold text-link underline underline-offset-4 focus-ring"
        >
          Pratite porudžbinu
        </Link>
        <Link href="/shop" className="text-sm font-semibold text-fg-muted underline underline-offset-4 focus-ring">
          Nazad u katalog
        </Link>
      </div>
    </div>
  );
}
