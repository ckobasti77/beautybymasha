"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDayLong, formatDayNumber, formatWeekTitle, formatWeekdayShort } from "@/lib/dates";
import { addDays } from "@/lib/slots";
import { booking } from "./strings";

export type DayInfo = {
  readonly date: string;
  /** Broj slobodnih početaka; `undefined` dok se nedelja učitava. */
  readonly count: number | undefined;
  /** Radi li lokal tog dana; `undefined` dok se učitava. */
  readonly open: boolean | undefined;
};

export function isDayEnabled(d: DayInfo, today: string, horizonEnd: string): boolean {
  return d.date >= today && d.date <= horizonEnd && d.open !== false && d.count !== 0;
}

const ARROW =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-line text-fg " +
  "transition-colors duration-150 hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-30 " +
  "disabled:hover:bg-transparent focus-ring";

/**
 * Sedam dana od `weekStart` kao jedna radio grupa. Strelice preskaču dane koji se
 * ne mogu izabrati, pa tastatura nikad ne zaglavi na zatvorenom ponedeljku Mimoze.
 * Svaki nedostupan dan u `aria-label` nosi razlog: zatvoreno, popunjeno, prošao.
 */
export function WeekStrip({
  weekStart,
  today,
  horizonEnd,
  selected,
  days,
  onSelect,
  onPrev,
  onNext,
}: {
  weekStart: string;
  today: string;
  horizonEnd: string;
  selected: string | null;
  days: readonly DayInfo[];
  onSelect: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const canPrev = weekStart > today;
  const canNext = addDays(weekStart, 7) <= horizonEnd;

  const enabled = (d: DayInfo) => isDayEnabled(d, today, horizonEnd);
  const selectedIndex = selected ? days.findIndex((d) => d.date === selected) : -1;
  const firstEnabled = days.findIndex(enabled);
  const rovingIndex = selectedIndex >= 0 ? selectedIndex : firstEnabled >= 0 ? firstEnabled : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    let i = e.key === "Home" ? -1 : e.key === "End" ? days.length : index;
    for (let step = 0; step < days.length; step++) {
      i = e.key === "Home" ? i + 1 : e.key === "End" ? i - 1 : i + dir;
      if (i < 0 || i >= days.length) return;
      if (enabled(days[i])) {
        onSelect(days[i].date);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  return (
    <div className="rounded-md border border-line bg-bg-elev p-2 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onPrev} disabled={!canPrev} aria-label={booking.day.prevWeek} className={ARROW}>
          <ChevronLeft size={20} strokeWidth={1.5} aria-hidden />
        </button>
        <p id={labelId} data-reveal="off" className="text-center text-sm font-semibold text-fg">
          {formatWeekTitle(weekStart, days[days.length - 1]?.date ?? weekStart)}
          {weekStart === today ? (
            <span className="ml-1.5 font-normal text-fg-muted">({booking.day.thisWeek})</span>
          ) : null}
        </p>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label={booking.day.nextWeek} className={ARROW}>
          <ChevronRight size={20} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div role="radiogroup" aria-label={booking.day.weekStrip} aria-describedby={labelId} className="grid grid-cols-7">
        {days.map((d, i) => {
          const isSel = d.date === selected;
          const isToday = d.date === today;
          const past = d.date < today;
          const beyond = d.date > horizonEnd;
          const closed = d.open === false;
          const usable = enabled(d);
          const loading = d.count === undefined && !past && !beyond;
          const reason = past
            ? booking.day.past
            : beyond
              ? booking.day.beyond
              : closed
                ? booking.day.closed
                : d.count === 0
                  ? booking.day.noSlots
                  : "";
          return (
            <button
              key={d.date}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-disabled={!usable}
              aria-label={`${formatDayLong(d.date)}${isToday ? `, ${booking.day.today}` : ""}${reason ? `, ${reason}` : ""}`}
              tabIndex={i === rovingIndex ? 0 : -1}
              onClick={() => usable && onSelect(d.date)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={[
                "group flex min-h-11 flex-col items-center gap-1 rounded-sm py-1.5",
                usable ? "cursor-pointer" : "cursor-not-allowed",
                "focus-ring",
              ].join(" ")}
            >
              <span className="text-[11px] tracking-wide text-fg-muted">{formatWeekdayShort(d.date)}</span>
              <span
                className={[
                  "num inline-flex size-9 items-center justify-center rounded-pill text-sm transition-colors duration-150 sm:size-10",
                  isSel
                    ? "bg-brand font-semibold text-brand-fg"
                    : usable
                      ? "text-fg group-hover:bg-tint"
                      : "text-fg-muted/60 line-through",
                  isToday && !isSel ? "ring-1 ring-brand" : "",
                  loading ? "animate-pulse" : "",
                ].join(" ")}
              >
                {formatDayNumber(d.date)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
