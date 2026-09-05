"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDuration, formatRsd } from "@/lib/format";
import { foldSerbian } from "@/lib/serviceCategories";
import { bookableServices, serviceGroups, type Service } from "@/lib/services";
import { booking } from "./strings";
import { useRovingRadio } from "./useRovingRadio";

/**
 * Korak 2: 144 usluge se NE prikazuju kao spisak. Prvo grupa, pa pretraga, pa usluga.
 * Ponuđene su samo one koje gost može sam da zakaže (`bookableServices`) — dodaci i
 * paketi bez cene se biraju u salonu.
 *
 * Pretraga ne razlikuje dijakritiku: „secer" nalazi „šećernom pastom".
 */

const GROUP_OPTIONS = [
  { value: "", label: booking.service.allGroups },
  ...serviceGroups.map((g) => ({ value: g.key, label: g.title })),
];

export function ServiceStep({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const [group, setGroup] = useState("");
  const [query, setQuery] = useState("");

  const matches = useMemo<readonly Service[]>(() => {
    const needle = foldSerbian(query);
    return bookableServices.filter((s) => {
      if (group && s.group !== group) return false;
      if (!needle) return true;
      return foldSerbian(s.title).includes(needle);
    });
  }, [group, query]);

  const selectedIndex = selected ? matches.findIndex((s) => s.key === selected) : -1;
  const { rovingIndex, setRef, onKeyDown } = useRovingRadio<HTMLButtonElement>(
    matches.length,
    selectedIndex,
    (i) => onSelect(matches[i].key),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label={booking.service.group}
          options={GROUP_OPTIONS}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        />
        <Input
          label={booking.service.searchLabel}
          type="search"
          placeholder={booking.service.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          prefix={<Search size={16} strokeWidth={1.5} aria-hidden />}
        />
      </div>

      <p aria-live="polite" data-reveal="off" className="text-caption text-fg-muted">
        {booking.service.count(matches.length)}
      </p>

      {matches.length === 0 ? (
        <p className="rounded-md border border-line bg-bg-sunken p-5 text-fg">{booking.service.empty}</p>
      ) : (
        <div
          data-lenis-prevent
          role="radiogroup"
          aria-label={booking.service.pick}
          className="max-h-[22rem] space-y-2 overflow-y-auto rounded-md border border-line bg-bg-sunken p-2"
        >
          {matches.map((s, i) => {
            const isSel = s.key === selected;
            return (
              <button
                key={s.key}
                ref={setRef(i)}
                type="button"
                role="radio"
                aria-checked={isSel}
                tabIndex={i === rovingIndex ? 0 : -1}
                onClick={() => onSelect(s.key)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={[
                  "flex w-full min-h-11 items-center justify-between gap-4 rounded-sm border px-4 py-3 text-left",
                  "transition-[border-color,background-color] duration-150 focus-ring",
                  isSel
                    ? "border-brand bg-tint-wash"
                    : "border-transparent bg-bg-elev hover:border-line-strong",
                ].join(" ")}
              >
                <span className="min-w-0 text-sm font-medium text-fg">{s.title}</span>
                <span className="num shrink-0 text-right text-sm">
                  <span className="block font-semibold text-fg">{formatRsd(s.priceRsd ?? 0)}</span>
                  <span className="block text-caption text-fg-muted">{formatDuration(s.durationMin)}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
