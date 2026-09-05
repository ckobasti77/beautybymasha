"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, MessageCircle, Phone, Sun } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { formatDayLong } from "@/lib/dates";
import { formatRsd } from "@/lib/format";
import { RESOURCE_KEYS, RESOURCE_LABELS, type LocationKey, type ResourceKey } from "@/lib/site";
import { belgradeNow, fmt, fmtRange } from "@/lib/slots";
import { AdminReveal } from "../AdminReveal";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE, locationName } from "../strings";
import { ConfirmButton, EmptyState, Segmented, Stat, useSave, useToast } from "../ui";
import { MoveForm } from "./MoveForm";

/**
 * Prvi ekran — ono što joj treba dok otključava telefon.
 *
 * Odozgo nadole tačno redom kojim se gleda: koliko ih danas ima, u kom lokalu,
 * ko dolazi i kada, pa tek na dnu koliko je para ušlo. Bez grafikona: brojka
 * se čita za pola sekunde, grafikon ne.
 */

type Booking = Doc<"bookings">;
type LocationFilter = LocationKey | "sve";

/** „Danas 12 termina · 3 čekaju potvrdu · 2 nove porudžbine“ — jedna rečenica, bez tabele. */
function summaryLine(counts: { today: number; pending: number; newOrders: number }): string {
  const parts = [plural(counts.today, "termin", "termina", "termina")];
  if (counts.pending > 0) {
    parts.push(`${counts.pending} ${counts.pending === 1 ? "čeka" : "čekaju"} potvrdu`);
  }
  if (counts.newOrders > 0) {
    parts.push(plural(counts.newOrders, "nova porudžbina", "nove porudžbine", "novih porudžbina"));
  }
  return parts.join(" · ");
}

function plural(n: number, one: string, few: string, many: string): string {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return `${n} ${many}`;
  if (last === 1) return `${n} ${one}`;
  if (last >= 2 && last <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function TodayTab({ adminKey }: { adminKey?: string }) {
  const today = belgradeNow().date;
  const data = useQuery(api.admin.today, { key: adminKey, date: today });
  const [location, setLocation] = useState<LocationFilter>("sve");
  const [open, setOpen] = useState<Booking | null>(null);

  const bookings = useMemo(() => {
    if (!data) return [];
    return location === "sve" ? data.bookings : data.bookings.filter((b) => b.locationKey === location);
  }, [data, location]);

  const byResource = useMemo(() => {
    const groups = new Map<ResourceKey, Booking[]>();
    for (const key of RESOURCE_KEYS) groups.set(key, []);
    for (const b of bookings) groups.get(b.resourceKey)?.push(b);
    return [...groups.entries()].filter(([, list]) => list.length > 0);
  }, [bookings]);

  if (data === undefined) {
    return <p className="text-body text-fg-muted">Učitavam današnji dan…</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-h2 text-fg">Danas</h1>
        <p className="mt-1 text-body-sm text-fg-muted">{formatDayLong(today)}</p>
        <p className="num mt-3 text-body font-semibold text-fg">{summaryLine(data.counts)}</p>
      </header>

      <Segmented<LocationFilter>
        label="Lokal"
        value={location}
        onChange={setLocation}
        options={[
          { value: "ljubicica", label: locationName("ljubicica") },
          { value: "mimoza", label: locationName("mimoza") },
          { value: "sve", label: "Oba" },
        ]}
      />

      {byResource.length === 0 ? (
        <EmptyState
          icon={<Sun size={28} strokeWidth={1.5} aria-hidden />}
          title="Danas nema termina"
          body={
            location === "sve"
              ? "Kad neko zakaže preko sajta ili kad sami upišete termin, pojaviće se ovde."
              : "U ovom lokalu danas nema termina. Prebacite prekidač na drugi lokal ili na oba."
          }
        />
      ) : (
        <AdminReveal className="flex flex-col gap-5" deps={`${location}-${bookings.length}`}>
          {byResource.map(([resourceKey, list]) => (
            <section key={resourceKey} data-enter>
              <h2 className="mb-2 px-1 text-caption font-semibold uppercase tracking-wider text-fg-muted">
                {RESOURCE_LABELS[resourceKey]} · {list.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {list.map((b) => (
                  <li key={b._id}>
                    <BookingRow booking={b} showLocation={location === "sve"} onOpen={() => setOpen(b)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </AdminReveal>
      )}

      <section>
        <h2 className="mb-2 px-1 text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Promet danas
        </h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <Stat label="Usluge" value={formatRsd(data.revenue.servicesRsd)} />
          <Stat label="Shop" value={formatRsd(data.revenue.shopRsd)} />
          <Stat label="Ukupno" value={formatRsd(data.revenue.totalRsd)} tone="mint" />
        </div>
        <p className="mt-2 px-1 text-caption text-fg-muted">
          Usluge se računaju po cenovniku, za potvrđene termine današnjeg dana. Poštarina se ne broji u promet.
        </p>
      </section>

      <BookingSheet booking={open} adminKey={adminKey} onClose={() => setOpen(null)} />
    </div>
  );
}

function BookingRow({
  booking,
  showLocation,
  onOpen,
}: {
  booking: Booking;
  showLocation: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md border border-line bg-bg-elev px-3 py-3 text-left shadow-card transition-colors duration-150 hover:border-line-strong focus-ring"
    >
      <span className="num flex w-14 shrink-0 flex-col items-start">
        <span className="text-body font-semibold text-fg">{fmt(booking.startMin)}</span>
        <span className="text-caption text-fg-muted">{fmt(booking.endMin)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-fg">{booking.name}</span>
        <span className="block truncate text-body-sm text-fg-muted">{booking.serviceTitle}</span>
        {showLocation && (
          <span className="mt-0.5 block text-caption text-fg-muted">{locationName(booking.locationKey)}</span>
        )}
      </span>
      {booking.status === "nov" && (
        <Badge tone={BOOKING_STATUS_TONE.nov} dot>
          {BOOKING_STATUS_LABEL.nov}
        </Badge>
      )}
    </button>
  );
}

/** Termin otvoren u sheet-u: Pozovi, Viber, Pomeri, Otkaži — i ništa više. */
export function BookingSheet({
  booking,
  adminKey,
  onClose,
}: {
  booking: Booking | null;
  adminKey?: string;
  onClose: () => void;
}) {
  const cancel = useMutation(api.bookings.cancel);
  const confirm = useMutation(api.bookings.confirm);
  const { state, error, run, busy } = useSave();
  const toast = useToast();
  const [moving, setMoving] = useState(false);

  if (!booking) return null;

  const phone = booking.phone.trim();
  const viberNumber = phone.startsWith("0") ? `+381${phone.slice(1)}` : phone;

  const onCancel = async () => {
    const ok = await run(() => cancel({ key: adminKey ?? "", id: booking._id as Id<"bookings"> }));
    if (ok !== null) {
      toast.show(`Termin je otkazan — ${booking.name}, ${fmt(booking.startMin)}.`);
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={() => {
        setMoving(false);
        onClose();
      }}
      title={booking.name}
      description={`${booking.serviceTitle} · ${fmtRange(booking.startMin, booking.endMin)} · ${locationName(booking.locationKey)}`}
    >
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={BOOKING_STATUS_TONE[booking.status]} dot>
            {BOOKING_STATUS_LABEL[booking.status]}
          </Badge>
          <Badge>{RESOURCE_LABELS[booking.resourceKey]}</Badge>
        </div>

        {booking.note && (
          <p className="rounded-sm bg-bg-sunken px-3 py-2 text-body-sm text-fg">Napomena: {booking.note}</p>
        )}

        {phone ? (
          <div className="grid grid-cols-2 gap-2">
            <Button as="a" href={`tel:${phone}`} variant="ghost" leading={<Phone size={16} aria-hidden />}>
              Pozovi
            </Button>
            <Button
              as="a"
              href={`viber://chat?number=${encodeURIComponent(viberNumber)}`}
              variant="ghost"
              leading={<MessageCircle size={16} aria-hidden />}
            >
              Viber
            </Button>
          </div>
        ) : (
          <p className="text-body-sm text-fg-muted">Za ovaj termin nije ostavljen broj telefona.</p>
        )}

        {booking.status === "nov" && (
          <Button magnetic={false}
            onClick={() =>
              run(async () => {
                await confirm({ key: adminKey ?? "", id: booking._id as Id<"bookings"> });
                toast.show("Termin je potvrđen.");
                onClose();
              })
            }
            loading={busy}
          >
            Potvrdi termin
          </Button>
        )}

        {moving ? (
          <MoveForm
            booking={booking}
            adminKey={adminKey}
            onDone={() => {
              setMoving(false);
              toast.show("Termin je pomeren.");
              onClose();
            }}
            onCancel={() => setMoving(false)}
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setMoving(true)}
              leading={<CalendarClock size={16} aria-hidden />}
            >
              Pomeri
            </Button>
            <ConfirmButton
              label="Otkaži termin"
              confirmLabel="Sigurno otkaži?"
              onConfirm={onCancel}
              disabled={busy || booking.status === "otkazan"}
            />
          </div>
        )}

        {state === "error" && error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
