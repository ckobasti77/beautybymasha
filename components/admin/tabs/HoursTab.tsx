"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { WEEKDAYS_LONG } from "@/lib/dates";
import { type LocationKey } from "@/lib/site";
import { addDays, belgradeNow, fmt, fmtRange, toMin } from "@/lib/slots";
import { locationName } from "../strings";
import { ConfirmButton, Panel, SaveHint, Segmented, useSave, useToast } from "../ui";

/**
 * Radno vreme lokala: sedam dana, svaki sa jednom ili više smena.
 *
 * Više smena istog dana = podeljeno radno vreme (npr. 09–13 i 16–20). Ispod su
 * izuzeci za konkretan datum — praznik ili drugačije vreme — koji imaju prednost
 * nad nedeljnim rasporedom.
 */

/** Redosled kojim se čita nedelja: ponedeljak prvi, nedelja poslednja. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type Shift = { startMin: number; endMin: number };

export function HoursTab({ adminKey }: { adminKey?: string }) {
  const [locationKey, setLocationKey] = useState<LocationKey>("ljubicica");
  const schedules = useQuery(api.schedules.listWeekly, { key: adminKey ?? "" });
  const settings = useQuery(api.settings.get, { key: adminKey ?? "" });
  const confirmHours = useMutation(api.settings.confirmHours);
  const { state, error, run } = useSave();

  const byWeekday = useMemo(() => {
    const map = new Map<number, Shift[]>();
    for (const wd of WEEK_ORDER) map.set(wd, []);
    for (const s of schedules ?? []) {
      if (s.locationKey !== locationKey) continue;
      map.get(s.weekday)?.push({ startMin: s.startMin, endMin: s.endMin });
    }
    for (const list of map.values()) list.sort((a, b) => a.startMin - b.startMin);
    return map;
  }, [schedules, locationKey]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 text-fg">Radno vreme</h1>
          <p className="mt-1 text-body-sm text-fg-muted">
            Gosti vide slobodne termine samo unutar ovog vremena.
          </p>
        </div>
        <SaveHint state={state} error={error} />
      </header>

      {settings && !settings.hoursConfirmed && (
        <div className="rounded-md border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-4 py-3">
          <p className="text-body-sm text-fg">
            Sada važi vreme koje smo uneli iz vašeg profila. Proverite ga i potvrdite — tek onda gosti vide
            prave termine.
          </p>
          <Button
            className="mt-3"
            variant="ghost"
            magnetic={false}
            onClick={() => run(() => confirmHours({ key: adminKey ?? "" }))}
          >
            Vreme je tačno
          </Button>
        </div>
      )}

      <Segmented<LocationKey>
        label="Lokal"
        value={locationKey}
        onChange={setLocationKey}
        options={[
          { value: "ljubicica", label: locationName("ljubicica") },
          { value: "mimoza", label: locationName("mimoza") },
        ]}
      />

      {schedules === undefined ? (
        <p className="text-body text-fg-muted">Učitavam raspored…</p>
      ) : (
        <div className="flex flex-col gap-2">
          {WEEK_ORDER.map((weekday) => (
            <DayRow
              key={weekday}
              weekday={weekday}
              shifts={byWeekday.get(weekday) ?? []}
              locationKey={locationKey}
              adminKey={adminKey}
            />
          ))}
        </div>
      )}

      <OverridesPanel locationKey={locationKey} adminKey={adminKey} />
    </div>
  );
}

function DayRow({
  weekday,
  shifts,
  locationKey,
  adminKey,
}: {
  weekday: number;
  shifts: readonly Shift[];
  locationKey: LocationKey;
  adminKey?: string;
}) {
  const setWeek = useMutation(api.schedules.set);
  const { state, error, run } = useSave();

  const save = (next: Shift[]) =>
    run(() => setWeek({ key: adminKey ?? "", locationKey, weekday, ranges: next }));

  const closed = shifts.length === 0;

  return (
    <section className="rounded-md border border-line bg-bg-elev p-3">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-body font-semibold capitalize text-fg">{WEEKDAYS_LONG[weekday]}</h2>
        <div className="flex items-center gap-2">
          <SaveHint state={state} error={error} />
          {closed ? (
            <Button
              size="md"
              variant="ghost"
              magnetic={false}
              onClick={() => save([{ startMin: 9 * 60, endMin: 20 * 60 }])}
            >
              Otvori
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => save([])}
              className="min-h-11 rounded-pill px-3 text-body-sm font-semibold text-fg-muted transition-colors duration-150 hover:text-danger-text focus-ring"
            >
              Zatvoreno
            </button>
          )}
        </div>
      </header>

      {closed ? (
        <p className="mt-1 text-body-sm text-fg-muted">Ovog dana ne radimo.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {shifts.map((shift, index) => (
            <li key={index} className="flex items-center gap-2">
              <TimeField
                label="Početak"
                value={shift.startMin}
                onCommit={(startMin) =>
                  save(shifts.map((s, i) => (i === index ? { ...s, startMin } : s)))
                }
              />
              <span aria-hidden className="text-fg-muted">
                –
              </span>
              <TimeField
                label="Kraj"
                value={shift.endMin}
                onCommit={(endMin) => save(shifts.map((s, i) => (i === index ? { ...s, endMin } : s)))}
              />
              {shifts.length > 1 && (
                <button
                  type="button"
                  aria-label="Ukloni smenu"
                  onClick={() => save(shifts.filter((_, i) => i !== index))}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:text-danger-text focus-ring"
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden />
                </button>
              )}
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() =>
                save([...shifts, { startMin: shifts[shifts.length - 1].endMin + 60, endMin: 20 * 60 }])
              }
              className="inline-flex min-h-11 items-center gap-1.5 text-body-sm font-semibold text-link focus-ring"
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              Dodaj smenu
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}

/** Vreme kao `<input type="time">` — na telefonu otvara nativni točkić. */
function TimeField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (minutes: number) => void;
}) {
  return (
    <label className="flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="time"
        step={300}
        defaultValue={fmt(value)}
        onBlur={(e) => {
          const next = e.target.value ? toMin(e.target.value) : value;
          if (next !== value) onCommit(next);
        }}
        className="num min-h-11 w-full rounded-sm border border-line bg-bg-elev px-3 text-body font-semibold text-fg focus-ring"
      />
    </label>
  );
}

/** Neradni dani i posebno radno vreme za konkretan datum. */
function OverridesPanel({ locationKey, adminKey }: { locationKey: LocationKey; adminKey?: string }) {
  const today = belgradeNow().date;
  const horizon = addDays(today, 180);
  const overrides = useQuery(api.schedules.listOverrides, { key: adminKey ?? "", from: today, to: horizon });
  const upsert = useMutation(api.schedules.upsertOverride);
  const remove = useMutation(api.schedules.removeOverride);
  const { error, run, busy } = useSave();
  const toast = useToast();

  const [date, setDate] = useState(today);
  const [kind, setKind] = useState<"off" | "custom">("off");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("16:00");
  const [note, setNote] = useState("");

  const mine = (overrides ?? []).filter((o) => o.locationKey === locationKey);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      upsert({
        key: adminKey ?? "",
        locationKey,
        date,
        kind,
        startMin: kind === "custom" ? toMin(start) : undefined,
        endMin: kind === "custom" ? toMin(end) : undefined,
        note: note.trim() || undefined,
      }),
    );
    if (ok) {
      toast.show(kind === "off" ? "Neradni dan je upisan." : "Posebno radno vreme je upisano.");
      setNote("");
    }
  };

  return (
    <Panel title="Izuzeci" hint="Praznik, godišnji ili drugačije vreme za jedan datum.">
      <div className="flex flex-col gap-4 p-4">
        {mine.length > 0 && (
          <ul className="flex flex-col gap-1">
            {mine.map((o: Doc<"scheduleOverrides">) => (
              <li key={o._id} className="flex items-center justify-between gap-2 rounded-sm bg-bg-sunken px-3 py-2">
                <span className="min-w-0">
                  <span className="num block text-body-sm font-semibold text-fg">{o.date}</span>
                  <span className="block truncate text-caption text-fg-muted">
                    {o.kind === "off"
                      ? "Ne radimo"
                      : `Radimo ${fmtRange(o.startMin ?? 0, o.endMin ?? 0)}`}
                    {o.note ? ` · ${o.note}` : ""}
                  </span>
                </span>
                <ConfirmButton
                  label="Obriši"
                  confirmLabel="Sigurno?"
                  onConfirm={() =>
                    run(async () => {
                      await remove({ key: adminKey ?? "", id: o._id });
                      toast.show("Izuzetak je uklonjen.");
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="flex flex-col gap-3 border-t border-line pt-4">
          <Input label="Datum" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
          <Segmented<"off" | "custom">
            label="Šta važi tog dana"
            value={kind}
            onChange={setKind}
            options={[
              { value: "off", label: "Ne radimo" },
              { value: "custom", label: "Drugo vreme" },
            ]}
          />
          {kind === "custom" && (
            <div className="grid grid-cols-2 gap-2">
              <Input label="Od" type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />
              <Input label="Do" type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          )}
          <Input
            label="Razlog"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            hint="Vidi ga samo panel, ne gosti."
          />
          {error && (
            <p role="alert" className="text-body-sm text-danger-text">
              {error}
            </p>
          )}
          <Button magnetic={false} type="submit" loading={busy}>
            Upiši izuzetak
          </Button>
        </form>
      </div>
    </Panel>
  );
}
