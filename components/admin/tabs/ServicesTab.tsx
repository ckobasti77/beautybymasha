"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { formatDuration, formatRsd } from "@/lib/format";
import { foldSerbian } from "@/lib/serviceCategories";
import { SERVICE_GROUP_KEYS, serviceGroupByKey, type ServiceGroupKey } from "@/lib/services";
import { EmptyState, InlineNumber, SaveHint, Stepper, Toggle, useSave, useToast } from "../ui";

/**
 * Cenovnik — 144 stavke. Bez pretrage je neupotrebljivo, pa je pretraga na vrhu
 * i ostaje na ekranu dok se skroluje.
 *
 * Cene su verbatim iz njenog cenovnika i menjaju se samo ovde, svesno.
 * Trajanja su naša procena dok ih ne potvrdi — otud baner na vrhu.
 */

type Service = Doc<"services">;

const GROUP_OPTIONS = SERVICE_GROUP_KEYS.map((key) => ({
  value: key,
  label: serviceGroupByKey(key).title,
}));

export function ServicesTab({ adminKey }: { adminKey?: string }) {
  const services = useQuery(api.services.listAll, { key: adminKey ?? "" });
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set([SERVICE_GROUP_KEYS[0]]));
  const [creating, setCreating] = useState(false);

  const needle = foldSerbian(search.trim());

  const grouped = useMemo(() => {
    const map = new Map<ServiceGroupKey, Service[]>();
    for (const key of SERVICE_GROUP_KEYS) map.set(key, []);
    for (const s of services ?? []) {
      if (needle && !foldSerbian(s.title).includes(needle)) continue;
      map.get(s.groupKey)?.push(s);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [services, needle]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 text-fg">Usluge</h1>
          <p className="num mt-1 text-body-sm text-fg-muted">{services?.length ?? 0} u cenovniku</p>
        </div>
        <Button magnetic={false} size="md" onClick={() => setCreating(true)} leading={<Plus size={16} aria-hidden />}>
          Nova
        </Button>
      </header>

      <div className="rounded-md border border-warning/40 bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-4 py-3">
        <p className="text-body-sm text-fg">
          Trajanja su naša procena. Proverite ih pre nego što pustimo zakazivanje — po njima se računa koliko
          termina stane u dan.
        </p>
      </div>

      <div className="sticky top-0 z-20 -mx-4 bg-bg/95 px-4 py-2 backdrop-blur">
        <Input
          label="Pretraga usluge"
          hideLabel
          type="search"
          placeholder="Naziv usluge"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {services === undefined ? (
        <p className="text-body text-fg-muted">Učitavam cenovnik…</p>
      ) : grouped.length === 0 ? (
        <EmptyState
          title="Nema usluge po toj pretrazi"
          body="Probajte kraću reč, ili dodajte novu uslugu u cenovnik."
          action={
            <Button variant="ghost" onClick={() => setCreating(true)}>
              Nova usluga
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {grouped.map(([groupKey, list]) => {
            // Pretraga sama otvara grupe — inače bi rezultat ostao sakriven.
            const isOpen = needle.length > 0 || openGroups.has(groupKey);
            return (
              <section key={groupKey} className="overflow-hidden rounded-md border border-line bg-bg-elev">
                <h2>
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    aria-expanded={isOpen}
                    className="flex min-h-14 w-full items-center justify-between gap-2 px-4 text-left transition-colors duration-150 hover:bg-bg-sunken focus-ring"
                  >
                    <span className="text-body font-semibold text-fg">{serviceGroupByKey(groupKey).title}</span>
                    <span className="flex items-center gap-2">
                      <span className="num text-caption text-fg-muted">{list.length}</span>
                      <ChevronDown
                        size={18}
                        strokeWidth={1.75}
                        aria-hidden
                        className={[
                          "text-fg-muted transition-transform duration-300 ease-out-expo",
                          isOpen ? "rotate-180" : "",
                        ].join(" ")}
                      />
                    </span>
                  </button>
                </h2>
                {isOpen && (
                  <ul className="border-t border-line">
                    {list.map((s) => (
                      <ServiceRow key={s._id} service={s} adminKey={adminKey} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <CreateSheet open={creating} adminKey={adminKey} onClose={() => setCreating(false)} />
    </div>
  );
}

function ServiceRow({ service, adminKey }: { service: Service; adminKey?: string }) {
  const update = useMutation(api.services.update);
  const setHidden = useMutation(api.services.setHidden);
  const { state, error, run } = useSave();

  return (
    <li className="flex flex-col gap-2 border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 flex-1 text-body font-medium text-fg">{service.title}</span>
        <SaveHint state={state} error={error} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2">
          <span className="text-caption text-fg-muted">Trajanje</span>
          <Stepper
            label={`Trajanje — ${service.title}`}
            value={service.durationMin}
            step={5}
            min={5}
            max={480}
            suffix=" min"
            onChange={(durationMin) =>
              run(() => update({ key: adminKey ?? "", serviceKey: service.key, durationMin }))
            }
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-caption text-fg-muted">Cena</span>
          <InlineNumber
            className="w-32"
            label={`Cena — ${service.title}`}
            value={service.priceRsd ?? 0}
            suffix="RSD"
            onCommit={(priceRsd) =>
              run(() => update({ key: adminKey ?? "", serviceKey: service.key, priceRsd }))
            }
          />
        </label>

        <label className="ml-auto flex items-center gap-2">
          <span className="text-caption text-fg-muted">Na sajtu</span>
          <Toggle
            label={`Vidljivo na sajtu — ${service.title}`}
            checked={!service.hidden}
            onChange={(visible) =>
              run(() => setHidden({ key: adminKey ?? "", serviceKey: service.key, hidden: !visible }))
            }
          />
        </label>
      </div>

      {service.priceRsd === null && (
        <p className="text-caption text-warning-text">
          Cena nije upisana — dok je nema, usluga se ne nudi za zakazivanje.
        </p>
      )}
      {service.priceRsd !== null && (
        <p className="num text-caption text-fg-muted">
          {formatDuration(service.durationMin)} · {formatRsd(service.priceRsd)}
        </p>
      )}
    </li>
  );
}

/** Nova usluga — jedino mesto u panelu gde postoji dugme „Sačuvaj“. */
function CreateSheet({
  open,
  adminKey,
  onClose,
}: {
  open: boolean;
  adminKey?: string;
  onClose: () => void;
}) {
  const create = useMutation(api.services.create);
  const { error, run, busy } = useSave();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [groupKey, setGroupKey] = useState<ServiceGroupKey>(SERVICE_GROUP_KEYS[0]);
  const [durationMin, setDurationMin] = useState(45);
  const [priceRsd, setPriceRsd] = useState(2000);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      create({
        key: adminKey ?? "",
        serviceKey: slugify(title),
        groupKey,
        title: title.trim(),
        durationMin,
        priceRsd,
      }),
    );
    if (ok) {
      toast.show(`Usluga „${title.trim()}“ je dodata.`);
      setTitle("");
      onClose();
    }
  };

  return (
    <Sheet open onClose={onClose} title="Nova usluga" description="Pojavi se u cenovniku i u zakazivanju.">
      <form onSubmit={submit} className="flex flex-col gap-4 pt-1">
        <Input label="Naziv" value={title} onChange={(e) => setTitle(e.target.value)} required autoComplete="off" />
        <Select
          label="Grupa"
          value={groupKey}
          onChange={(e) => setGroupKey(e.target.value as ServiceGroupKey)}
          options={GROUP_OPTIONS}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-fg">Trajanje</span>
          <Stepper
            label="Trajanje"
            value={durationMin}
            step={5}
            min={5}
            max={480}
            suffix=" min"
            onChange={setDurationMin}
          />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">Cena</span>
          <InlineNumber label="Cena" value={priceRsd} suffix="RSD" onCommit={setPriceRsd} />
        </label>
        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}
        <Button magnetic={false} type="submit" loading={busy} disabled={title.trim().length < 2}>
          Dodaj uslugu
        </Button>
      </form>
    </Sheet>
  );
}

/** Ključ ide u URL i u indeks — bez dijakritika i bez razmaka. */
function slugify(title: string): string {
  return foldSerbian(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
