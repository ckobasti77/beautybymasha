"use client";

import Link from "next/link";
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { AuthPanel } from "@/components/nalog/AuthPanel";
import { MemberCard } from "@/components/nalog/MemberCard";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDayMedium } from "@/lib/dates";
import { formatRsd } from "@/lib/format";
import { locationByKey } from "@/lib/site";
import { fmtRange } from "@/lib/slots";

/**
 * `/nalog`. Neulogovan vidi formu, ulogovan karticu i svoju istoriju.
 *
 * Bez `NEXT_PUBLIC_CONVEX_URL` nema auth provider-a, pa se ni jedan od ovih
 * hook-ova ne sme pozvati — stranu tada crta `NoBackend`.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

const BOOKING_LABELS = {
  nov: "Čeka potvrdu",
  potvrdjen: "Potvrđen",
  otkazan: "Otkazan",
  odbijen: "Odbijen",
} as const;

const BOOKING_TONES: Record<keyof typeof BOOKING_LABELS, BadgeTone> = {
  nov: "warning",
  potvrdjen: "success",
  otkazan: "neutral",
  odbijen: "danger",
};

const ORDER_LABELS = {
  nova: "Primljena",
  u_obradi: "U pripremi",
  poslata: "Poslata",
  zavrsena: "Završena",
  otkazana: "Otkazana",
} as const;

const ORDER_TONES: Record<keyof typeof ORDER_LABELS, BadgeTone> = {
  nova: "mint",
  u_obradi: "warning",
  poslata: "mint",
  zavrsena: "success",
  otkazana: "neutral",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-bg-elev p-6">
      <h2 className="text-h3 text-fg">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-fg-muted">{children}</p>;
}

function Bookings() {
  const rows = useQuery(api.bookings.mine, {});
  if (rows === undefined) return <Empty>Učitavanje…</Empty>;
  if (rows.length === 0) {
    return (
      <Empty>
        Ovde stoje termini koje zakažete dok ste prijavljeni.{" "}
        <Link href="/#zakazivanje" className="font-semibold text-link underline underline-offset-4 focus-ring">
          Zakažite termin
        </Link>
      </Empty>
    );
  }
  return (
    <ul className="divide-y divide-line" data-reveal="off">
      {rows.map((b) => (
        <li key={b._id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{b.serviceTitle}</p>
            <p className="num mt-1 text-caption text-fg-muted">
              {formatDayMedium(b.date)} · {fmtRange(b.startMin, b.endMin)} ·{" "}
              {locationByKey(b.locationKey).name}
            </p>
          </div>
          <Badge tone={BOOKING_TONES[b.status]} dot>
            {BOOKING_LABELS[b.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function Orders() {
  const rows = useQuery(api.orders.mine, {});
  if (rows === undefined) return <Empty>Učitavanje…</Empty>;
  if (rows.length === 0) {
    return (
      <Empty>
        Još nema porudžbina.{" "}
        <Link href="/shop" className="font-semibold text-link underline underline-offset-4 focus-ring">
          Otvorite katalog
        </Link>
      </Empty>
    );
  }
  return (
    <ul className="divide-y divide-line" data-reveal="off">
      {rows.map((o) => (
        <li key={o._id} className="flex flex-wrap items-start justify-between gap-3 py-4">
          <div className="min-w-0">
            <p className="num text-sm font-semibold text-fg">{o.orderNumber}</p>
            <p className="mt-1 text-caption text-fg-muted">
              {o.items.length === 1 ? o.items[0].name : `${o.items.length} stavki`} ·{" "}
              <span className="num">{formatRsd(o.totalRsd)}</span>
            </p>
          </div>
          <Badge tone={ORDER_TONES[o.status]} dot>
            {ORDER_LABELS[o.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function SignedIn() {
  const { signOut } = useAuthActions();
  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[360px_1fr] lg:gap-12">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <MemberCard />
        <p className="mt-5">
          <Button variant="ghost" onClick={() => void signOut()} className="w-full">
            Odjavite se
          </Button>
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <Panel title="Moji termini">
          <Bookings />
        </Panel>
        <Panel title="Moje porudžbine">
          <Orders />
        </Panel>
      </div>
    </div>
  );
}

function NoBackend() {
  return (
    <p className="mt-10 rounded-md border border-line bg-bg-sunken p-6 text-fg-muted">
      Nalozi rade preko servera koji trenutno nije podešen. Termin i dalje možete da zakažete telefonom.
    </p>
  );
}

export function AccountView() {
  if (!HAS_BACKEND) return <NoBackend />;
  return (
    <>
      <AuthLoading>
        <p className="mt-10 text-fg-muted" aria-live="polite">
          Proveravamo prijavu…
        </p>
      </AuthLoading>
      <Unauthenticated>
        <AuthPanel />
      </Unauthenticated>
      <Authenticated>
        <SignedIn />
      </Authenticated>
    </>
  );
}
