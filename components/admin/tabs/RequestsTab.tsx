"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Inbox, Phone, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatDayMedium } from "@/lib/dates";
import { formatDuration } from "@/lib/format";
import { RESOURCE_LABELS } from "@/lib/site";
import { fmtRange } from "@/lib/slots";
import { AdminReveal } from "../AdminReveal";
import { REJECT_REASONS, locationName, relativeTime } from "../strings";
import { EmptyState, useSave, useToast } from "../ui";

/**
 * Zahtevi koji čekaju odluku. Kartica nosi sve što joj treba da odluči bez
 * otvaranja ičega — ime, telefon, usluga, trajanje, lokal, termin, napomena —
 * i dva dugmeta ispod. Potvrda je jedan dodir; odbijanje pita za razlog.
 */

type Booking = Doc<"bookings">;

export function RequestsTab({ adminKey }: { adminKey?: string }) {
  const pending = useQuery(api.bookings.pending, { key: adminKey ?? "" });
  const [rejecting, setRejecting] = useState<Booking | null>(null);

  if (pending === undefined) return <p className="text-body text-fg-muted">Učitavam zahteve…</p>;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-h2 text-fg">Zahtevi</h1>
        <p className="mt-1 text-body-sm text-fg-muted">
          {pending.length === 0
            ? "Nema zahteva na čekanju."
            : `${pending.length} ${pending.length === 1 ? "zahtev čeka" : "zahteva čeka"} vašu odluku.`}
        </p>
      </header>

      {pending.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} strokeWidth={1.5} aria-hidden />}
          title="Sve je rešeno"
          body="Kad neko zakaže preko sajta, zahtev stiže ovde i čeka da ga potvrdite ili odbijete."
        />
      ) : (
        <AdminReveal className="flex flex-col gap-3" deps={pending.length}>
          {pending.map((b) => (
            <RequestCard key={b._id} booking={b} adminKey={adminKey} onReject={() => setRejecting(b)} />
          ))}
        </AdminReveal>
      )}

      <RejectSheet booking={rejecting} adminKey={adminKey} onClose={() => setRejecting(null)} />
    </div>
  );
}

function RequestCard({
  booking,
  adminKey,
  onReject,
}: {
  booking: Booking;
  adminKey?: string;
  onReject: () => void;
}) {
  const confirm = useMutation(api.bookings.confirm);
  const { error, run, busy } = useSave();
  const toast = useToast();

  return (
    <article data-enter className="rounded-md border border-line bg-bg-elev p-4 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-body font-semibold text-fg">{booking.serviceTitle}</h2>
          <p className="num mt-0.5 text-body-sm text-fg">
            {formatDayMedium(booking.date)} · {fmtRange(booking.startMin, booking.endMin)}
          </p>
        </div>
        <span className="shrink-0 text-caption text-fg-muted">{relativeTime(booking.createdAt)}</span>
      </header>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="mint">{locationName(booking.locationKey)}</Badge>
        <Badge>{RESOURCE_LABELS[booking.resourceKey]}</Badge>
        <Badge>{formatDuration(booking.durationMin)}</Badge>
      </div>

      <p className="mt-3 text-body font-semibold text-fg">{booking.name}</p>
      {booking.phone && (
        <a
          href={`tel:${booking.phone}`}
          className="num mt-1 inline-flex min-h-11 items-center gap-2 text-body-sm text-link underline underline-offset-4 focus-ring"
        >
          <Phone size={14} strokeWidth={1.75} aria-hidden />
          {booking.phone}
        </a>
      )}

      {booking.note && (
        <p className="mt-2 rounded-sm bg-bg-sunken px-3 py-2 text-body-sm text-fg">Napomena: {booking.note}</p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-body-sm text-danger-text">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button magnetic={false}
          className="flex-1"
          loading={busy}
          leading={<Check size={16} aria-hidden />}
          onClick={() =>
            run(async () => {
              await confirm({ key: adminKey ?? "", id: booking._id as Id<"bookings"> });
              toast.show(`Potvrđeno: ${booking.name}, ${formatDayMedium(booking.date)} u ${fmtRange(booking.startMin, booking.endMin)}.`);
            })
          }
        >
          Potvrdi
        </Button>
        <Button variant="ghost" onClick={onReject} leading={<X size={16} aria-hidden />} magnetic={false}>
          Odbij
        </Button>
      </div>
    </article>
  );
}

/**
 * Razlog odbijanja se bira iz liste, ne kuca. Prazan razlog je dozvoljen —
 * ponekad je odgovor već dat telefonom.
 */
function RejectSheet({
  booking,
  adminKey,
  onClose,
}: {
  booking: Booking | null;
  adminKey?: string;
  onClose: () => void;
}) {
  const reject = useMutation(api.bookings.reject);
  const { error, run, busy } = useSave();
  const toast = useToast();
  const [reason, setReason] = useState<string>("");

  if (!booking) return null;

  const submit = async () => {
    const ok = await run(() => reject({ key: adminKey ?? "", id: booking._id as Id<"bookings"> }));
    if (ok !== null) {
      toast.show(reason ? `Zahtev je odbijen — ${reason.toLowerCase()}.` : "Zahtev je odbijen.");
      setReason("");
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Odbijanje zahteva"
      description={`${booking.name} · ${formatDayMedium(booking.date)} u ${fmtRange(booking.startMin, booking.endMin)}`}
    >
      <div className="flex flex-col gap-4 pt-1">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-body-sm font-medium text-fg">Razlog (nije obavezan)</legend>
          {REJECT_REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-line px-3 text-body-sm text-fg has-checked:border-brand has-checked:bg-tint-wash"
            >
              <input
                type="radio"
                name="razlog"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="size-4 accent-mint-deep"
              />
              {r}
            </label>
          ))}
          <button
            type="button"
            onClick={() => setReason("")}
            className="min-h-11 self-start text-body-sm text-link underline underline-offset-4 focus-ring"
          >
            Bez razloga
          </button>
        </fieldset>

        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="danger" className="flex-1" loading={busy} onClick={submit} magnetic={false}>
            Odbij zahtev
          </Button>
          <Button variant="ghost" onClick={onClose} magnetic={false}>
            Nazad
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
