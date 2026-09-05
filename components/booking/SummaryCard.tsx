"use client";

import { formatDayMedium } from "@/lib/dates";
import { formatDuration, formatRsd } from "@/lib/format";
import { fmtRange } from "@/lib/slots";
import { locationByKey, type LocationKey } from "@/lib/site";
import { serviceByKey } from "@/lib/services";
import { booking } from "./strings";

export type SummaryData = {
  locationKey: LocationKey | null;
  serviceKey: string | null;
  date: string | null;
  startMin: number | null;
};

/**
 * Rezime uz čarobnjak: puni se dok gost prolazi korake, prazan red se ne prikazuje.
 * `onChangeService` (usluga stigla iz cenovnika) daje „Promenite uslugu" ispod reda.
 */
export function SummaryCard({ data, onChangeService }: { data: SummaryData; onChangeService?: () => void }) {
  const location = data.locationKey ? locationByKey(data.locationKey) : null;
  const service = data.serviceKey ? serviceByKey(data.serviceKey) : undefined;
  const when =
    data.date && data.startMin !== null && service
      ? `${formatDayMedium(data.date)}, ${fmtRange(data.startMin, data.startMin + service.durationMin)}`
      : null;

  const rows: { label: string; value: string }[] = [];
  if (location) rows.push({ label: booking.summary.location, value: location.name });
  if (service) rows.push({ label: booking.summary.service, value: service.title });
  if (when) rows.push({ label: booking.summary.when, value: when });
  if (service) rows.push({ label: booking.summary.duration, value: formatDuration(service.durationMin) });
  if (service?.priceRsd !== null && service !== undefined) {
    rows.push({ label: booking.summary.price, value: formatRsd(service.priceRsd) });
  }

  return (
    <aside
      aria-label={booking.summary.title}
      className="rounded-md border border-line bg-bg-elev p-5 shadow-card"
    >
      <p className="text-overline text-link">{booking.summary.title}</p>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">{booking.summary.empty}</p>
      ) : (
        <dl className="mt-4 space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
              <dt className="text-sm text-fg-muted">{r.label}</dt>
              <dd className="num text-right text-sm font-medium text-fg">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {service && onChangeService ? (
        // div, ne p: text-reveal bi <p> sa dugmetom sakrio do ulaska u kadar.
        <div className="mt-3">
          <button
            type="button"
            onClick={onChangeService}
            className="min-h-11 rounded-pill text-sm font-semibold text-link underline underline-offset-4 focus-ring"
          >
            {booking.preset.change}
          </button>
        </div>
      ) : null}
      <p className="mt-4 text-caption text-fg-muted">{booking.summary.priceNote}</p>
    </aside>
  );
}
