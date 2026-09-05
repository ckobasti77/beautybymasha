"use client";

import { MapPin } from "lucide-react";
import { locations, type LocationKey } from "@/lib/site";
import { booking } from "./strings";
import { useRovingRadio } from "./useRovingRadio";

/**
 * Korak 1: dva lokala kao velike kartice, sa radnim vremenom SVAKOG posebno —
 * Mimoza ponedeljkom ne radi i to gost mora da vidi pre nego što izabere dan.
 */
export function LocationStep({
  selected,
  onSelect,
}: {
  selected: LocationKey | null;
  onSelect: (key: LocationKey) => void;
}) {
  const selectedIndex = selected ? locations.findIndex((l) => l.key === selected) : -1;
  const { rovingIndex, setRef, onKeyDown } = useRovingRadio<HTMLButtonElement>(
    locations.length,
    selectedIndex,
    (i) => onSelect(locations[i].key),
  );

  return (
    <div role="radiogroup" aria-label={booking.location.pick} className="grid gap-4 md:grid-cols-2">
      {locations.map((l, i) => {
        const isSel = l.key === selected;
        return (
          <button
            key={l.key}
            ref={setRef(i)}
            type="button"
            role="radio"
            aria-checked={isSel}
            tabIndex={i === rovingIndex ? 0 : -1}
            onClick={() => onSelect(l.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={[
              "flex flex-col items-start gap-3 rounded-md border p-5 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-ring",
              isSel
                ? "border-brand bg-tint-wash shadow-card"
                : "border-line bg-bg-elev hover:border-line-strong hover:shadow-card",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "inline-flex size-11 items-center justify-center rounded-pill",
                isSel ? "bg-brand text-brand-fg" : "bg-tint text-link",
              ].join(" ")}
            >
              <MapPin size={20} strokeWidth={1.5} />
            </span>
            <span className="text-h3 text-fg">{l.name}</span>
            <span className="text-sm text-fg-muted">
              {l.address.street}, {l.address.area}
            </span>
            <span className="mt-1 block space-y-0.5 text-sm">
              {l.hours.map((h) => (
                <span key={h.days} className="flex justify-between gap-4 text-fg-muted">
                  <span>{h.days}</span>
                  <span className="num text-fg">{h.time}</span>
                </span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
