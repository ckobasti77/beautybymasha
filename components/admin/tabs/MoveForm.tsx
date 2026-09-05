"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LOCATION_KEYS, type LocationKey } from "@/lib/site";
import { fmt } from "@/lib/slots";
import { locationName } from "../strings";
import { useSave } from "../ui";

/**
 * Pomeranje termina: drugi dan, drugo vreme, drugi lokal.
 *
 * Server ponovo proverava kapacitet, pa ako je novo mesto zauzeto — izmena ne
 * prolazi i ona vidi zašto. Bolje odbijena izmena nego dva termina u isto vreme.
 */

/** Ponuđena vremena: 07:00–21:45 na 15 minuta. Ručni termin sme i van radnog vremena. */
const TIME_OPTIONS = Array.from({ length: ((22 - 7) * 60) / 15 }, (_, i) => {
  const min = 7 * 60 + i * 15;
  return { value: String(min), label: fmt(min) };
});

const LOCATION_OPTIONS = LOCATION_KEYS.map((key) => ({ value: key, label: locationName(key) }));

export function MoveForm({
  booking,
  adminKey,
  onDone,
  onCancel,
}: {
  booking: Doc<"bookings">;
  adminKey?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const move = useMutation(api.bookings.move);
  const { error, run, busy } = useSave();
  const [date, setDate] = useState(booking.date);
  const [startMin, setStartMin] = useState(String(booking.startMin));
  const [locationKey, setLocationKey] = useState<LocationKey>(booking.locationKey);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      move({
        key: adminKey ?? "",
        id: booking._id as Id<"bookings">,
        date,
        startMin: Number(startMin),
        locationKey,
      }),
    );
    if (ok !== null) onDone();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-md border border-line bg-bg-sunken p-4">
      <Input label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <Select
        label="Vreme"
        value={startMin}
        onChange={(e) => setStartMin(e.target.value)}
        options={TIME_OPTIONS}
      />
      <Select
        label="Lokal"
        value={locationKey}
        onChange={(e) => setLocationKey(e.target.value as LocationKey)}
        options={LOCATION_OPTIONS}
      />
      {error && (
        <p role="alert" className="text-body-sm text-danger-text">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button magnetic={false} type="submit" loading={busy} className="flex-1">
          Pomeri
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} magnetic={false}>
          Odustani
        </Button>
      </div>
    </form>
  );
}
