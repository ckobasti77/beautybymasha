"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, Phone, ShoppingBag } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatRsd } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/site";
import { AdminReveal } from "../AdminReveal";
import {
  ORDER_NEXT,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  relativeTime,
  type OrderStatus,
} from "../strings";
import { ConfirmButton, EmptyState, Segmented, useSave, useToast } from "../ui";

/**
 * Porudžbine iz webshopa.
 *
 * Kartica pokazuje sve što treba da spakuje paket, a dugme nudi samo SLEDEĆI
 * korak — ne ceo spisak statusa. Nova → U obradi → Poslata → Završena.
 */

type Order = Doc<"orders">;
type Filter = OrderStatus | "sve";

export function OrdersTab({ adminKey }: { adminKey?: string }) {
  const [filter, setFilter] = useState<Filter>("sve");
  const orders = useQuery(api.orders.list, {
    key: adminKey,
    status: filter === "sve" ? undefined : filter,
    limit: 100,
  });
  const [open, setOpen] = useState<Order | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-h2 text-fg">Porudžbine</h1>
        <p className="mt-1 text-body-sm text-fg-muted">Najnovija je prva.</p>
      </header>

      <Segmented<Filter>
        label="Status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "sve", label: "Sve" },
          { value: "nova", label: "Nove" },
          { value: "u_obradi", label: "U obradi" },
          { value: "poslata", label: "Poslate" },
        ]}
      />

      {orders === undefined ? (
        <p className="text-body text-fg-muted">Učitavam porudžbine…</p>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={28} strokeWidth={1.5} aria-hidden />}
          title={filter === "sve" ? "Još nema porudžbina" : "Nema porudžbina u ovom stanju"}
          body="Kad neko poruči sa sajta, porudžbina stiže ovde sa svim što vam treba za slanje."
        />
      ) : (
        <AdminReveal className="flex flex-col gap-2" deps={`${filter}-${orders.length}`}>
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} onOpen={() => setOpen(o)} />
          ))}
        </AdminReveal>
      )}

      <OrderSheet order={open} adminKey={adminKey} onClose={() => setOpen(null)} />
    </div>
  );
}

function OrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <button
      data-enter
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-2 rounded-md border border-line bg-bg-elev p-4 text-left shadow-card transition-colors duration-150 hover:border-line-strong focus-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="num block text-body font-semibold text-fg">{order.orderNumber}</span>
          <span className="block truncate text-body-sm text-fg-muted">{order.customer.name}</span>
        </div>
        <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </div>

      <div className="num flex items-baseline justify-between gap-2">
        <span className="text-body-sm text-fg-muted">
          {order.items.length} {order.items.length === 1 ? "stavka" : "stavke"} ·{" "}
          {PAYMENT_METHOD_LABELS[order.paymentMethod]}
        </span>
        <span className="text-body font-semibold text-fg">{formatRsd(order.totalRsd)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {order.loyaltyDiscountRsd > 0 && (
          <Badge tone="rose">
            <span className="num">Loyalty −{formatRsd(order.loyaltyDiscountRsd)}</span>
          </Badge>
        )}
        {order.paymentMethod === "ips" && (
          <Badge tone={order.paymentStatus === "placeno" ? "success" : "warning"}>
            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </Badge>
        )}
        <span className="ml-auto text-caption text-fg-muted">{relativeTime(order.createdAt)}</span>
      </div>
    </button>
  );
}

function OrderSheet({
  order,
  adminKey,
  onClose,
}: {
  order: Order | null;
  adminKey?: string;
  onClose: () => void;
}) {
  const setStatus = useMutation(api.orders.setStatus);
  const confirmPayment = useMutation(api.orders.confirmPayment);
  const { error, run, busy } = useSave();
  const toast = useToast();

  if (!order) return null;

  const next = ORDER_NEXT[order.status];
  const address = `${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}`;

  return (
    <Sheet open onClose={onClose} title={order.orderNumber} description={order.customer.name}>
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
          <Badge>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</Badge>
          {order.paymentMethod === "ips" && (
            <Badge tone={order.paymentStatus === "placeno" ? "success" : "warning"}>
              {PAYMENT_STATUS_LABEL[order.paymentStatus]}
            </Badge>
          )}
        </div>

        <section className="rounded-md bg-bg-sunken px-3 py-3">
          <h3 className="text-caption font-semibold uppercase tracking-wider text-fg-muted">Dostava</h3>
          <p className="mt-1 text-body-sm text-fg">{address}</p>
          <a
            href={`tel:${order.customer.phone}`}
            className="num mt-1 inline-flex min-h-11 items-center gap-2 text-body-sm text-link underline underline-offset-4 focus-ring"
          >
            <Phone size={14} strokeWidth={1.75} aria-hidden />
            {order.customer.phone}
          </a>
          {order.customer.note && (
            <p className="mt-2 text-body-sm text-fg-muted">Napomena: {order.customer.note}</p>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-caption font-semibold uppercase tracking-wider text-fg-muted">Stavke</h3>
          <ul className="flex flex-col gap-1">
            {order.items.map((item, i) => (
              <li key={`${item.slug}-${i}`} className="num flex justify-between gap-3 text-body-sm">
                <span className="min-w-0 truncate text-fg">
                  {item.qty}× {item.name}
                </span>
                <span className="shrink-0 text-fg-muted">{formatRsd(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="num mt-3 flex flex-col gap-1 border-t border-line pt-3 text-body-sm">
            <div className="flex justify-between">
              <dt className="text-fg-muted">Roba</dt>
              <dd className="text-fg">{formatRsd(order.subtotalRsd)}</dd>
            </div>
            {order.loyaltyDiscountRsd > 0 && (
              <div className="flex justify-between">
                <dt className="text-fg-muted">Loyalty popust</dt>
                <dd className="text-accent">−{formatRsd(order.loyaltyDiscountRsd)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-fg-muted">Poštarina</dt>
              <dd className="text-fg">{order.shippingRsd === 0 ? "besplatno" : formatRsd(order.shippingRsd)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1 text-body font-semibold">
              <dt className="text-fg">Ukupno</dt>
              <dd className="text-fg">{formatRsd(order.totalRsd)}</dd>
            </div>
          </dl>
        </section>

        {order.paymentMethod === "ips" && order.paymentStatus !== "placeno" && (
          <section className="rounded-md border border-line px-3 py-3">
            <p className="text-body-sm text-fg">
              Na izvodu tražite poziv na broj{" "}
              <span className="num font-semibold">{order.paymentReference ?? order.orderNumber}</span>.
            </p>
            <Button
              className="mt-3"
              variant="ghost"
              loading={busy}
              leading={<BadgeCheck size={16} aria-hidden />}
              magnetic={false}
              onClick={() =>
                run(async () => {
                  await confirmPayment({ key: adminKey, id: order._id });
                  toast.show("Uplata je zabeležena.");
                })
              }
            >
              Uplata je stigla
            </Button>
          </section>
        )}

        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {next && (
            <Button magnetic={false}
              className="flex-1"
              loading={busy}
              onClick={() =>
                run(async () => {
                  await setStatus({ key: adminKey, id: order._id, status: next.status });
                  toast.show(`${order.orderNumber} — ${ORDER_STATUS_LABEL[next.status].toLowerCase()}.`);
                  onClose();
                })
              }
            >
              {next.label}
            </Button>
          )}
          {order.status !== "zavrsena" && order.status !== "otkazana" && (
            <ConfirmButton
              label="Otkaži"
              confirmLabel="Sigurno otkaži?"
              disabled={busy}
              onConfirm={() =>
                run(async () => {
                  await setStatus({ key: adminKey, id: order._id, status: "otkazana" });
                  toast.show("Porudžbina je otkazana, roba je vraćena na stanje.");
                  onClose();
                })
              }
            />
          )}
        </div>
      </div>
    </Sheet>
  );
}
