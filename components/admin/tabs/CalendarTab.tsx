"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { formatDayLong, formatDayNumber, formatWeekTitle, formatWeekdayShort } from "@/lib/dates";
import { serviceGroupByKey } from "@/lib/services";
import { RESOURCE_KEYS, RESOURCE_LABELS, type LocationKey, type ResourceKey } from "@/lib/site";
import {
  addDays,
  belgradeNow,
  diffDays,
  fmt,
  fmtRange,
  normalizeRanges,
  startOfWeek,
  weekdayOf,
  type Range,
} from "@/lib/slots";
import { AdminReveal } from "../AdminReveal";
import { locationName } from "../strings";
import { Segmented, useSave, useToast } from "../ui";
import { BookingSheet } from "./TodayTab";

/**
 * Nedeljni kalendar jednog lokala, sa trakom po resursu.
 *
 * Zašto trake: u istom terminu rade tri manikira i jedna masaža. Jedna kolona po
 * danu bi ih naslagala jedno preko drugog i ništa se ne bi videlo — zato je svaki
 * dan podeljen na Nokti / Kozmetika / Masaža, koliko ih lokal ima.
 *
 * Na telefonu se gleda jedan dan (traka nedelje je gore, prevlačenje menja
 * nedelju), na širem ekranu cela nedelja odjednom. Ista mreža, isti podaci —
 * razlikuje se samo koliko dana staje.
 *
 * Mehanika mreže je preuzeta iz `_ref/colorcutchris/app/admin/CalendarTab.tsx`
 * (redovi po 30 min, blok sečen na prozor dana) i proširena na lokacija × resurs.
 */

const ROW_MIN = 30;
const ROW_PX = 44;
const GUTTER_PX = 44;
const DAY_START = 8 * 60;
const DAY_END = 21 * 60;

type Booking = Doc<"bookings">;
type Block = Doc<"blocks">;

type Grid = { start: number; end: number; rows: readonly number[]; height: number };

function gridFor(spans: readonly Range[]): Grid {
  let start = DAY_START;
  let end = DAY_END;
  for (const r of spans) {
    start = Math.min(start, Math.floor(r.startMin / 60) * 60);
    end = Math.max(end, Math.ceil(r.endMin / 60) * 60);
  }
  start = Math.max(0, start);
  end = Math.min(24 * 60, end);
  const n = Math.max(1, Math.round((end - start) / ROW_MIN));
  return { start, end, rows: Array.from({ length: n }, (_, i) => start + i * ROW_MIN), height: n * ROW_PX };
}

function topPx(grid: Grid, min: number): number {
  return ((min - grid.start) / ROW_MIN) * ROW_PX;
}

function box(grid: Grid, startMin: number, endMin: number): { top: number; height: number } {
  const s = Math.max(startMin, grid.start);
  const e = Math.min(endMin, grid.end);
  return { top: topPx(grid, s) + 1, height: Math.max(ROW_PX / 2, topPx(grid, e) - topPx(grid, s) - 2) };
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Radno vreme lokala za datum: izuzetak za taj dan ima prednost nad nedeljnim rasporedom. */
function workRangesFor(
  date: string,
  schedules: readonly Doc<"schedules">[],
  overrides: readonly Doc<"scheduleOverrides">[],
): { ranges: Range[]; label: string | null } {
  const ov = overrides.find((o) => o.date === date);
  if (ov) {
    if (ov.kind === "off" || ov.startMin === undefined || ov.endMin === undefined) {
      return { ranges: [], label: "neradan dan" };
    }
    return { ranges: [{ startMin: ov.startMin, endMin: ov.endMin }], label: "posebno radno vreme" };
  }
  const wd = weekdayOf(date);
  const rows = schedules.filter((s) => s.weekday === wd);
  return {
    ranges: normalizeRanges(rows.map((r) => ({ startMin: r.startMin, endMin: r.endMin }))),
    label: rows.length === 0 ? "zatvoreno" : null,
  };
}

export function CalendarTab({ adminKey, canEditHours }: { adminKey?: string; canEditHours: boolean }) {
  const today = belgradeNow().date;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [locationKey, setLocationKey] = useState<LocationKey>("ljubicica");
  const [selectedDay, setSelectedDay] = useState(today);
  const wide = useMediaQuery("(min-width: 1024px)");

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = days[0];
  const to = days[6];

  const bookings = useQuery(api.bookings.list, { key: adminKey ?? "", from, to, locationKey });
  const schedules = useQuery(api.schedules.listWeekly, { key: adminKey ?? "" });
  const overrides = useQuery(api.schedules.listOverrides, { key: adminKey ?? "", from, to });
  const blocks = useQuery(api.blocks.listRange, { key: adminKey ?? "", locationKey, from, to });

  const locSchedules = useMemo(
    () => (schedules ?? []).filter((s) => s.locationKey === locationKey),
    [schedules, locationKey],
  );
  const locOverrides = useMemo(
    () => (overrides ?? []).filter((o) => o.locationKey === locationKey),
    [overrides, locationKey],
  );

  // Prozor mreže mora da obuhvati i radno vreme, i termine, i pauze — inače bi
  // termin u 07:30 ispao van slike.
  const grid = useMemo(() => {
    const spans: Range[] = [];
    for (const d of days) spans.push(...workRangesFor(d, locSchedules, locOverrides).ranges);
    for (const b of bookings ?? []) spans.push({ startMin: b.startMin, endMin: b.endMin });
    for (const bl of blocks ?? []) spans.push({ startMin: bl.startMin, endMin: bl.endMin });
    return gridFor(spans);
  }, [days, locSchedules, locOverrides, bookings, blocks]);

  const [openBooking, setOpenBooking] = useState<Booking | null>(null);
  const [newSlot, setNewSlot] = useState<{ date: string; resourceKey: ResourceKey; startMin: number } | null>(
    null,
  );

  // Nedelja se pomera, ali dan u nedelji ostaje isti — ko je gledao četvrtak,
  // posle prevlačenja gleda četvrtak.
  const shiftWeek = useCallback(
    (delta: number) => {
      const offset = Math.max(0, Math.min(6, diffDays(weekStart, selectedDay)));
      const next = addDays(weekStart, delta * 7);
      setWeekStart(next);
      setSelectedDay(addDays(next, offset));
    },
    [weekStart, selectedDay],
  );

  const visibleDays = wide ? days : [selectedDay];
  const loading = bookings === undefined || schedules === undefined;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-h2 text-fg">Kalendar</h1>
        <p className="mt-1 text-body-sm text-fg-muted">{formatWeekTitle(from, to)}</p>
      </header>

      <Segmented<LocationKey>
        label="Lokal"
        value={locationKey}
        onChange={setLocationKey}
        options={[
          { value: "ljubicica", label: locationName("ljubicica") },
          { value: "mimoza", label: locationName("mimoza") },
        ]}
      />

      <WeekStrip
        days={days}
        today={today}
        selected={selectedDay}
        onSelect={setSelectedDay}
        onShift={shiftWeek}
        onToday={() => {
          setWeekStart(startOfWeek(today));
          setSelectedDay(today);
        }}
      />

      <Legend />

      {loading ? (
        <p className="text-body text-fg-muted">Učitavam nedelju…</p>
      ) : (
        <AdminReveal deps={`${weekStart}-${locationKey}-${selectedDay}`} stagger={0.03}>
          <div className="overflow-x-auto rounded-md border border-line bg-bg-elev">
            <div className="flex min-w-max">
              <TimeGutter grid={grid} />
              {visibleDays.map((date) => (
                <DayColumn
                  key={date}
                  date={date}
                  grid={grid}
                  today={today}
                  bookings={(bookings ?? []).filter((b) => b.date === date)}
                  blocks={(blocks ?? []).filter((bl) => bl.date === date)}
                  work={workRangesFor(date, locSchedules, locOverrides)}
                  onOpenBooking={setOpenBooking}
                  onPickEmpty={(resourceKey, startMin) => setNewSlot({ date, resourceKey, startMin })}
                />
              ))}
            </div>
          </div>
        </AdminReveal>
      )}

      {!canEditHours && (
        <p className="text-caption text-fg-muted">
          Radno vreme i pauze menja vlasnica u tabu „Radno vreme“.
        </p>
      )}

      <BookingSheet booking={openBooking} adminKey={adminKey} onClose={() => setOpenBooking(null)} />
      <NewBookingSheet
        // Nov slot = nova forma. Remount je jeftiniji i pouzdaniji od ručnog praznjenja polja.
        key={newSlot ? `${newSlot.date}-${newSlot.resourceKey}-${newSlot.startMin}` : "prazno"}
        slot={newSlot}
        locationKey={locationKey}
        adminKey={adminKey}
        onClose={() => setNewSlot(null)}
      />
    </div>
  );
}

/** Traka nedelje: sedam dana, prevlačenje levo/desno menja nedelju. */
function WeekStrip({
  days,
  today,
  selected,
  onSelect,
  onShift,
  onToday,
}: {
  days: readonly string[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
  onShift: (delta: number) => void;
  onToday: () => void;
}) {
  const startX = useRef<number | null>(null);

  return (
    <div
      className="flex items-center gap-1"
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) onShift(dx < 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        onClick={() => onShift(-1)}
        aria-label="Prethodna nedelja"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-line text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring"
      >
        <ChevronLeft size={18} strokeWidth={1.75} aria-hidden />
      </button>

      <ul className="flex flex-1 items-stretch gap-1">
        {days.map((date) => {
          const isSelected = date === selected;
          const isToday = date === today;
          return (
            <li key={date} className="flex flex-1">
              <button
                type="button"
                onClick={() => onSelect(date)}
                aria-current={isSelected ? "date" : undefined}
                aria-label={formatDayLong(date)}
                className={[
                  "flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-sm border px-1 transition-colors duration-150 focus-ring",
                  isSelected ? "border-brand bg-tint" : "border-line hover:bg-bg-sunken",
                ].join(" ")}
              >
                <span className="text-[10px] font-semibold uppercase text-fg-muted">
                  {formatWeekdayShort(date)}
                </span>
                <span
                  className={[
                    "num text-body-sm font-semibold",
                    isToday ? "text-link" : isSelected ? "text-fg" : "text-fg-muted",
                  ].join(" ")}
                >
                  {formatDayNumber(date)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => onShift(1)}
        aria-label="Sledeća nedelja"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-line text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring"
      >
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden />
      </button>

      <button
        type="button"
        onClick={onToday}
        className="ml-1 hidden min-h-11 shrink-0 rounded-pill border border-line px-4 text-body-sm font-semibold text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring md:inline-flex md:items-center"
      >
        Danas
      </button>
    </div>
  );
}

function Legend() {
  const items = [
    { label: "Potvrđen", className: "bg-brand" },
    { label: "Čeka potvrdu", className: "border border-dashed border-warning bg-bg-elev" },
    { label: "Pauza", className: "bg-line-strong" },
    { label: "Van radnog vremena", className: "bg-bg-sunken" },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-caption text-fg-muted">
          <span aria-hidden className={`size-3 rounded-[3px] ${i.className}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function TimeGutter({ grid }: { grid: Grid }) {
  return (
    <div className="sticky left-0 z-10 shrink-0 bg-bg-elev" style={{ width: GUTTER_PX }}>
      <div className="h-14 border-b border-line" />
      <div className="relative" style={{ height: grid.height }}>
        {grid.rows.map((min, i) =>
          min % 60 === 0 ? (
            <span
              key={min}
              className="num absolute right-1 -translate-y-1/2 text-[10px] font-semibold text-fg-muted"
              style={{ top: i * ROW_PX }}
            >
              {fmt(min)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  grid,
  today,
  bookings,
  blocks,
  work,
  onOpenBooking,
  onPickEmpty,
}: {
  date: string;
  grid: Grid;
  today: string;
  bookings: readonly Booking[];
  blocks: readonly Block[];
  work: { ranges: Range[]; label: string | null };
  onOpenBooking: (b: Booking) => void;
  onPickEmpty: (resourceKey: ResourceKey, startMin: number) => void;
}) {
  const isToday = date === today;
  return (
    <div className="shrink-0 border-l border-line" data-enter>
      <header
        className={[
          "flex h-14 flex-col items-center justify-center border-b border-line px-2",
          isToday ? "bg-tint-wash" : "",
        ].join(" ")}
      >
        <span className="text-[10px] font-semibold uppercase text-fg-muted">{formatWeekdayShort(date)}</span>
        <span className="num text-body-sm font-semibold text-fg">{formatDayNumber(date)}</span>
      </header>
      <div className="flex">
        {RESOURCE_KEYS.map((resourceKey) => (
          <ResourceLane
            key={resourceKey}
            resourceKey={resourceKey}
            grid={grid}
            work={work}
            bookings={bookings.filter((b) => b.resourceKey === resourceKey)}
            blocks={blocks.filter((bl) => bl.resourceKey === resourceKey)}
            onOpenBooking={onOpenBooking}
            onPickEmpty={(startMin) => onPickEmpty(resourceKey, startMin)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Jedna traka = jedan resurs jednog dana. Termini u istoj traci se dele po
 * širini kad se preklapaju — tri manikira u 10:00 su tri uska bloka, ne jedan.
 */
function ResourceLane({
  resourceKey,
  grid,
  work,
  bookings,
  blocks,
  onOpenBooking,
  onPickEmpty,
}: {
  resourceKey: ResourceKey;
  grid: Grid;
  work: { ranges: Range[]; label: string | null };
  bookings: readonly Booking[];
  blocks: readonly Block[];
  onOpenBooking: (b: Booking) => void;
  onPickEmpty: (startMin: number) => void;
}) {
  const columns = useMemo(() => layoutOverlaps(bookings), [bookings]);

  return (
    <div className="w-[104px] shrink-0 border-l border-line/60 first:border-l-0 lg:w-[72px]">
      <div className="border-b border-line px-1 py-1 text-center">
        <span className="block truncate text-[10px] font-semibold uppercase text-fg-muted">
          {RESOURCE_LABELS[resourceKey]}
        </span>
      </div>
      <div className="relative" style={{ height: grid.height }}>
        {/* Van radnog vremena — podloga, ne blokada: ručni termin sme i tu. */}
        {grid.rows.map((min, i) => {
          const open = work.ranges.some((r) => min >= r.startMin && min < r.endMin);
          return (
            <button
              key={min}
              type="button"
              onClick={() => onPickEmpty(min)}
              aria-label={`Upiši termin — ${fmt(min)}`}
              className={[
                "absolute inset-x-0 border-b transition-colors duration-150 focus-ring",
                min % 60 === 0 ? "border-line" : "border-line/40",
                open ? "hover:bg-tint-wash" : "bg-bg-sunken hover:bg-bg-sunken/70",
              ].join(" ")}
              style={{ top: i * ROW_PX, height: ROW_PX }}
            />
          );
        })}

        {blocks.map((bl) => {
          const b = box(grid, bl.startMin, bl.endMin);
          return (
            <div
              key={bl._id}
              className="pointer-events-none absolute inset-x-0.5 rounded-[4px] bg-line-strong/70"
              style={{ top: b.top, height: b.height }}
              title={bl.reason ?? "Pauza"}
            />
          );
        })}

        {bookings.map((bk) => {
          const b = box(grid, bk.startMin, bk.endMin);
          const col = columns.get(bk._id) ?? { index: 0, of: 1 };
          const width = 100 / col.of;
          const pending = bk.status === "nov";
          return (
            <button
              key={bk._id}
              type="button"
              onClick={() => onOpenBooking(bk)}
              className={[
                "absolute overflow-hidden rounded-[4px] px-1 py-0.5 text-left transition-transform duration-150 focus-ring",
                pending
                  ? "border border-dashed border-warning bg-bg-elev text-fg"
                  : "bg-brand text-brand-fg hover:-translate-y-px",
              ].join(" ")}
              style={{
                top: b.top,
                height: b.height,
                left: `calc(${col.index * width}% + 2px)`,
                width: `calc(${width}% - 4px)`,
              }}
              title={`${bk.name} · ${bk.serviceTitle} · ${fmtRange(bk.startMin, bk.endMin)}`}
            >
              <span className="block truncate text-[11px] font-semibold leading-tight">{bk.name}</span>
              <span className="num block truncate text-[10px] leading-tight opacity-80">
                {fmt(bk.startMin)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Termini koji se preklapaju dele širinu trake. Prost pohlepni raspored: novi
 * termin ide u prvu kolonu koja je slobodna u njegovom intervalu.
 */
function layoutOverlaps(bookings: readonly Booking[]): Map<string, { index: number; of: number }> {
  const sorted = [...bookings].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const result = new Map<string, { index: number; of: number }>();
  let cluster: Booking[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const assigned = new Map<string, number>();
    for (const b of cluster) {
      let index = columnEnds.findIndex((end) => end <= b.startMin);
      if (index === -1) {
        index = columnEnds.length;
        columnEnds.push(b.endMin);
      } else {
        columnEnds[index] = b.endMin;
      }
      assigned.set(b._id, index);
    }
    for (const b of cluster) result.set(b._id, { index: assigned.get(b._id) ?? 0, of: columnEnds.length });
    cluster = [];
    clusterEnd = -1;
  };

  for (const b of sorted) {
    if (cluster.length > 0 && b.startMin >= clusterEnd) flush();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.endMin);
  }
  flush();
  return result;
}

/** Termin dogovoren telefonom — upisuje se odmah kao potvrđen. */
function NewBookingSheet({
  slot,
  locationKey,
  adminKey,
  onClose,
}: {
  slot: { date: string; resourceKey: ResourceKey; startMin: number } | null;
  locationKey: LocationKey;
  adminKey?: string;
  onClose: () => void;
}) {
  const services = useQuery(api.services.listAll, slot ? { key: adminKey ?? "" } : "skip");
  const createManual = useMutation(api.bookings.createManual);
  const addBlock = useMutation(api.blocks.add);
  const { error, run, busy } = useSave();
  const toast = useToast();

  const [mode, setMode] = useState<"termin" | "pauza">("termin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  // `null` = još nije birala; tada važi prva ponuđena usluga.
  const [pickedService, setPickedService] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [blockMinutes, setBlockMinutes] = useState(60);

  // Ponuđene su samo usluge tog resursa — u traci za masažu se ne nudi manikir.
  const options = useMemo(() => {
    if (!services || !slot) return [];
    return services
      .filter((s) => !s.hidden && serviceGroupByKey(s.groupKey).resource === slot.resourceKey)
      .map((s) => ({ value: s.key, label: s.title }));
  }, [services, slot]);

  const serviceKey =
    pickedService && options.some((o) => o.value === pickedService)
      ? pickedService
      : (options[0]?.value ?? "");

  if (!slot) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "pauza") {
      const ok = await run(() =>
        addBlock({
          key: adminKey ?? "",
          locationKey,
          resourceKey: slot.resourceKey,
          date: slot.date,
          startMin: slot.startMin,
          endMin: slot.startMin + blockMinutes,
          reason: note.trim() || undefined,
        }),
      );
      if (ok !== null) {
        toast.show("Pauza je upisana.");
        onClose();
      }
      return;
    }

    const ok = await run(() =>
      createManual({
        key: adminKey ?? "",
        name,
        phone: phone.trim() || undefined,
        serviceKey,
        locationKey,
        date: slot.date,
        startMin: slot.startMin,
        note: note.trim() || undefined,
      }),
    );
    if (ok !== null) {
      toast.show(`Termin je upisan — ${name}, ${fmt(slot.startMin)}.`);
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={mode === "termin" ? "Novi termin" : "Nova pauza"}
      description={`${formatDayLong(slot.date)} u ${fmt(slot.startMin)} · ${RESOURCE_LABELS[slot.resourceKey]} · ${locationName(locationKey)}`}
    >
      <form onSubmit={submit} className="flex flex-col gap-4 pt-1">
        <Segmented<"termin" | "pauza">
          label="Šta upisujete"
          value={mode}
          onChange={setMode}
          options={[
            { value: "termin", label: "Termin" },
            { value: "pauza", label: "Pauza" },
          ]}
        />

        {mode === "termin" ? (
          <>
            <Input
              label="Ime"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />
            <Input
              label="Telefon"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              hint="Nije obavezan — ali bez njega ne možete da je pozovete iz panela."
              autoComplete="off"
            />
            {options.length > 0 ? (
              <Select
                label="Usluga"
                value={serviceKey}
                onChange={(e) => setPickedService(e.target.value)}
                options={options}
              />
            ) : (
              <p className="text-body-sm text-fg-muted">
                Za ovu traku još nema usluga. Dodajte ih u tabu „Usluge“ pa se vratite ovde.
              </p>
            )}
          </>
        ) : (
          <Select
            label="Koliko traje"
            value={String(blockMinutes)}
            onChange={(e) => setBlockMinutes(Number(e.target.value))}
            options={[30, 60, 90, 120, 180, 240].map((m) => ({
              value: String(m),
              label: m < 60 ? `${m} min` : `${m / 60} h`,
            }))}
          />
        )}

        <Input
          label={mode === "termin" ? "Napomena" : "Razlog"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoComplete="off"
        />

        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}

        <Button magnetic={false} type="submit" loading={busy} disabled={mode === "termin" && options.length === 0}>
          {mode === "termin" ? "Upiši termin" : "Upiši pauzu"}
        </Button>
      </form>
    </Sheet>
  );
}
