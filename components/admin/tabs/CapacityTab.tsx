"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LOCATION_KEYS, RESOURCE_KEYS, RESOURCE_LABELS, type LocationKey, type ResourceKey } from "@/lib/site";
import { locationName } from "../strings";
import { Panel, SaveHint, Stepper, useSave } from "../ui";

/**
 * Koliko ljudi istovremeno radi koju grupu usluga, po lokalu.
 *
 * Ovo je jedini broj koji odlučuje da li se termin nudi: tri manikira u 10:00
 * prolaze samo ako Nokti imaju kapacitet 3. Nula znači da lokal tu grupu ne radi.
 *
 * Jedan ekran, tri prekidača po lokalu, i rečenica ispod koja kaže šta je upravo
 * podesila — da ne mora da je prevodi iz brojeva.
 */

export function CapacityTab({ adminKey }: { adminKey?: string }) {
  const capacities = useQuery(api.capacities.list, {});

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-h2 text-fg">Kapacitet</h1>
        <p className="mt-1 text-body-sm text-fg-muted">
          Koliko ljudi u isto vreme može da radi svaku grupu usluga.
        </p>
      </header>

      {capacities === undefined ? (
        <p className="text-body text-fg-muted">Učitavam…</p>
      ) : (
        LOCATION_KEYS.map((locationKey) => (
          <LocationCapacity
            key={locationKey}
            locationKey={locationKey}
            counts={countsFor(capacities, locationKey)}
            adminKey={adminKey}
          />
        ))
      )}
    </div>
  );
}

function countsFor(
  rows: readonly { locationKey: LocationKey; resourceKey: ResourceKey; count: number }[],
  locationKey: LocationKey,
): Record<ResourceKey, number> {
  const out = {} as Record<ResourceKey, number>;
  for (const key of RESOURCE_KEYS) {
    out[key] = rows.find((r) => r.locationKey === locationKey && r.resourceKey === key)?.count ?? 0;
  }
  return out;
}

function LocationCapacity({
  locationKey,
  counts,
  adminKey,
}: {
  locationKey: LocationKey;
  counts: Record<ResourceKey, number>;
  adminKey?: string;
}) {
  const setCapacity = useMutation(api.capacities.set);
  const { state, error, run } = useSave();

  return (
    <Panel title={locationName(locationKey)} action={<SaveHint state={state} error={error} />}>
      <ul className="flex flex-col">
        {RESOURCE_KEYS.map((resourceKey) => (
          <li
            key={resourceKey}
            className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <span className="text-body font-medium text-fg">{RESOURCE_LABELS[resourceKey]}</span>
            <Stepper
              label={`${RESOURCE_LABELS[resourceKey]} u ${locationName(locationKey)}`}
              value={counts[resourceKey]}
              max={20}
              onChange={(count) => run(() => setCapacity({ key: adminKey ?? "", locationKey, resourceKey, count }))}
            />
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-4 py-3 text-body-sm text-fg-muted">{sentence(locationKey, counts)}</p>
    </Panel>
  );
}

/**
 * „U lokalu Ljubičica u isto vreme mogu da rade 3 manikira, 1 depilacija i 1 masaža.“
 *
 * Namerno „u lokalu X“, a ne „u X-i“: naziv lokala dolazi iz data/site.json i ne
 * zna se u kom je padežu — ovako rečenica ostaje tačna za bilo koje ime.
 */
function sentence(locationKey: LocationKey, counts: Record<ResourceKey, number>): string {
  const WORDS: Record<ResourceKey, [string, string]> = {
    nokti: ["manikir", "manikira"],
    kozmetika: ["depilacija", "depilacije"],
    masaza: ["masaža", "masaže"],
  };

  const parts = RESOURCE_KEYS.filter((key) => counts[key] > 0).map((key) => {
    const [one, few] = WORDS[key];
    return `${counts[key]} ${counts[key] === 1 ? one : few}`;
  });

  if (parts.length === 0) {
    return `Lokal ${locationName(locationKey)} trenutno ne nudi nijedan termin — svi kapaciteti su na nuli.`;
  }
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} i ${parts[parts.length - 1]}`;
  return `U lokalu ${locationName(locationKey)} u isto vreme mogu da rade ${list}.`;
}
