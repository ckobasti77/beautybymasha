"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatRsd } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Praćenje porudžbine bez naloga: broj porudžbine + telefon sa kojim je poručeno.
 *
 * Server na pogrešan telefon i na nepostojeći broj odgovara isto (`null`), pa se
 * brojevi porudžbina ne mogu nagađati. UI zato ima jednu poruku za oba slučaja.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

const STATUS_LABELS = {
  nova: "Primljena",
  u_obradi: "U pripremi",
  poslata: "Poslata",
  zavrsena: "Završena",
  otkazana: "Otkazana",
} as const;

const STATUS_TONES: Record<keyof typeof STATUS_LABELS, BadgeTone> = {
  nova: "mint",
  u_obradi: "warning",
  poslata: "mint",
  zavrsena: "success",
  otkazana: "danger",
};

const PAYMENT_LABELS = {
  nije_potrebno: "Plaćanje pouzećem",
  ceka_uplatu: "Čeka uplatu",
  placeno: "Plaćeno",
} as const;

function Result({ orderNumber, phone }: { orderNumber: string; phone: string }) {
  const order = useQuery(api.orders.byNumber, { orderNumber, phone });

  if (order === undefined) {
    return (
      <p className="mt-8 text-fg-muted" aria-live="polite">
        Tražimo porudžbinu…
      </p>
    );
  }
  if (order === null) {
    return (
      <p className="mt-8 rounded-md border border-line bg-bg-sunken p-5 text-sm text-fg" role="status">
        Ne nalazimo porudžbinu sa tim brojem i telefonom. Proverite oba podatka ili pozovite{" "}
        {site.phone.display}.
      </p>
    );
  }

  return (
    <section className="mt-8 rounded-lg border border-line bg-bg-elev p-6" data-reveal="off">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="num text-h3 text-fg">{order.orderNumber}</p>
        <Badge tone={STATUS_TONES[order.status]} dot>
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      <ul className="mt-5 divide-y divide-line border-y border-line">
        {order.items.map((item) => (
          <li key={item.slug} className="flex justify-between gap-4 py-3 text-sm">
            <span className="text-fg">
              {item.name}
              <span className="num text-fg-muted"> × {item.qty}</span>
            </span>
            <span className="num shrink-0 font-semibold text-fg">{formatRsd(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <p className="text-base font-semibold text-fg">Ukupno</p>
        <p className="num text-h3 text-fg">{formatRsd(order.totalRsd)}</p>
      </div>
      <p className="mt-2 text-caption text-fg-muted">{PAYMENT_LABELS[order.paymentStatus]}</p>
    </section>
  );
}

export function OrderTracker() {
  const params = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get("broj") ?? "");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState<{ orderNumber: string; phone: string } | null>(null);

  if (!HAS_BACKEND) {
    return (
      <p className="mt-10 rounded-md border border-line bg-bg-sunken p-6 text-fg-muted">
        Pretraga porudžbina radi preko servera koji trenutno nije podešen. Pozovite {site.phone.display}.
      </p>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const number = orderNumber.trim().toUpperCase();
    if (number.length < 4 || phone.trim().length < 6) return;
    setQuery({ orderNumber: number, phone: phone.trim() });
  };

  return (
    <div className="max-w-prose">
      <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-5 md:grid-cols-2">
        <Input
          label="Broj porudžbine"
          placeholder="BM-2609-0042"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          autoComplete="off"
        />
        <Input
          label="Telefon sa porudžbine"
          type="tel"
          inputMode="tel"
          placeholder="060 123 4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
        <p className="md:col-span-2">
          <Button type="submit">Pronađite porudžbinu</Button>
        </p>
      </form>

      {query ? <Result orderNumber={query.orderNumber} phone={query.phone} /> : null}
    </div>
  );
}
