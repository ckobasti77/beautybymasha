"use client";

import { useId } from "react";
import { Phone } from "lucide-react";
import { fmt, fmtRange, groupByPartOfDay } from "@/lib/slots";
import { site } from "@/lib/site";
import { booking } from "./strings";
import { useRovingRadio } from "./useRovingRadio";

/** Zašto je dan prazan. Gost mora da zna razliku između zatvoreno i popunjeno. */
export type EmptyReason = "closed" | "today" | "full";

const CHIP =
  "num inline-flex min-h-11 items-center justify-center rounded-pill border px-4 text-sm font-medium " +
  "transition-[background-color,border-color,color] duration-150 focus-ring";

function Skeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      {[6, 8].map((n, g) => (
        <div key={g}>
          <div className="mb-3 h-3 w-20 animate-pulse rounded-pill bg-line" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="h-11 w-20 animate-pulse rounded-pill bg-line" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotGroup({
  id,
  label,
  starts,
  selected,
  durationMin,
  onSelect,
}: {
  id: string;
  label: string;
  starts: readonly number[];
  selected: number | null;
  durationMin: number;
  onSelect: (startMin: number) => void;
}) {
  const selectedIndex = selected === null ? -1 : starts.indexOf(selected);
  const { rovingIndex, setRef, onKeyDown } = useRovingRadio<HTMLButtonElement>(
    starts.length,
    selectedIndex,
    (i) => onSelect(starts[i]),
  );

  return (
    <div>
      <p id={id} data-reveal="off" className="mb-3 text-overline text-fg-muted">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {starts.map((start, i) => {
          const isSel = start === selected;
          return (
            <button
              key={start}
              ref={setRef(i)}
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-label={fmtRange(start, start + durationMin)}
              tabIndex={i === rovingIndex ? 0 : -1}
              onClick={() => onSelect(start)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={[
                CHIP,
                isSel
                  ? "border-brand bg-brand text-brand-fg"
                  : "border-line bg-bg-elev text-fg hover:border-line-strong hover:bg-tint-wash",
              ].join(" ")}
            >
              {fmt(start)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Slobodni počeci jednog dana, podeljeni na prepodne i popodne. Prazan dan nikad ne
 * ćuti: kaže zašto je prazan i nudi telefon kao izlaz.
 */
export function SlotChips({
  slots,
  selected,
  durationMin,
  emptyReason,
  onSelect,
}: {
  /** `undefined` = učitava se. */
  slots: readonly number[] | undefined;
  selected: number | null;
  durationMin: number;
  emptyReason: EmptyReason;
  onSelect: (startMin: number) => void;
}) {
  const baseId = useId();

  if (slots === undefined) return <Skeleton />;

  if (slots.length === 0) {
    const message =
      emptyReason === "closed"
        ? booking.day.emptyClosed
        : emptyReason === "today"
          ? booking.day.emptyToday
          : booking.day.emptyFull;
    return (
      <div className="rounded-md border border-line bg-bg-sunken p-5">
        <p className="text-fg">{message}</p>
        <a
          href={site.phone.href}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-bg-elev px-4 text-sm font-medium text-fg hover:border-line-strong focus-ring"
        >
          <Phone size={16} strokeWidth={1.5} aria-hidden />
          {booking.errors.callUs}
          <span className="num text-fg-muted">{site.phone.display}</span>
        </a>
      </div>
    );
  }

  const groups = groupByPartOfDay(slots);
  const sections = [
    { id: `${baseId}-am`, label: booking.day.prepodne, starts: groups.prepodne },
    { id: `${baseId}-pm`, label: booking.day.popodne, starts: groups.popodne },
  ].filter((s) => s.starts.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <SlotGroup
          key={s.id}
          id={s.id}
          label={s.label}
          starts={s.starts}
          selected={selected}
          durationMin={durationMin}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
