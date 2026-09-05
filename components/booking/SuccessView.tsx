"use client";

import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDayLong } from "@/lib/dates";
import { fmtRange } from "@/lib/slots";
import { locationByKey, site, type LocationKey } from "@/lib/site";
import { booking } from "./strings";

export type SuccessData = {
  name: string;
  serviceTitle: string;
  locationKey: LocationKey;
  date: string;
  startMin: number;
  endMin: number;
};

/**
 * Peti ekran: „Potvrda". Zahtev je primljen, termin još nije potvrđen — razlika je
 * bitna i zato je u tekstu doslovno. `holdHours` dolazi iz Convex podešavanja.
 */
export function SuccessView({
  data,
  holdHours,
  onAgain,
}: {
  data: SuccessData;
  holdHours: number;
  onAgain: () => void;
}) {
  const location = locationByKey(data.locationKey);
  return (
    <div className="text-center">
      <span
        aria-hidden
        className="mx-auto inline-flex size-14 items-center justify-center rounded-pill bg-brand text-brand-fg"
      >
        <Check size={26} strokeWidth={2} />
      </span>
      <h3 className="mt-5 text-h3 text-fg">{booking.success.title}</h3>
      <p className="mt-2 text-fg-muted">{booking.success.body(holdHours)}</p>

      <dl className="mx-auto mt-6 max-w-sm space-y-3 rounded-md border border-line bg-bg-sunken p-5 text-left">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-fg-muted">{booking.summary.service}</dt>
          <dd className="text-right text-sm font-medium text-fg">{data.serviceTitle}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-fg-muted">{booking.summary.location}</dt>
          <dd className="text-right text-sm font-medium text-fg">{location.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-fg-muted">{booking.summary.when}</dt>
          <dd className="num text-right text-sm font-medium text-fg">
            {formatDayLong(data.date)}
            <br />
            {fmtRange(data.startMin, data.endMin)}
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-caption text-fg-muted">{booking.success.note}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button type="button" variant="ghost" magnetic={false} onClick={onAgain}>
          {booking.success.again}
        </Button>
        <Button as="a" href={site.phone.href} variant="ghost" leading={<Phone size={16} strokeWidth={1.5} aria-hidden />}>
          {booking.success.call}
        </Button>
      </div>
    </div>
  );
}
