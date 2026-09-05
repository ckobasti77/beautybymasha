"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Section } from "@/components/site/Section";
import { Input } from "@/components/ui/Input";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { formatDuration, formatRsd } from "@/lib/format";
import { foldSerbian } from "@/lib/serviceCategories";
import { serviceGroups, services, servicesMeta, type Service, type ServiceGroupKey } from "@/lib/services";

/**
 * Ceo cenovnik: 144 stavke. Bez pretrage i akordeona ovo je zid teksta, pa su oba
 * obavezna. Pretraga je lepljiva ispod navigacije i ne razlikuje dijakritiku.
 *
 * Cene su VERBATIM iz njenog cenovnika i ne diraju se. Stavka bez cene (`priceRsd`
 * null) piše „na upit" — ne izmišlja se broj. Trajanje je naša procena i tako je i
 * označeno; menja se samo kroz admin.
 *
 * Svaka grupa nosi `id="cenovnik-<grupa>"` — to je odredište krugova iz sekcije Usluge.
 */

const BY_GROUP = new Map<ServiceGroupKey, readonly Service[]>(
  serviceGroups.map((g) => [g.key, services.filter((s) => s.group === g.key)]),
);

export function PriceList() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ServiceGroupKey | null>(serviceGroups[0]?.key ?? null);

  const needle = foldSerbian(query);
  const searching = needle.length > 0;

  const filtered = useMemo(() => {
    return serviceGroups.map((g) => {
      const all = BY_GROUP.get(g.key) ?? [];
      const rows = searching ? all.filter((s) => foldSerbian(s.title).includes(needle)) : all;
      return { group: g, rows };
    });
  }, [needle, searching]);

  const total = filtered.reduce((n, f) => n + f.rows.length, 0);

  return (
    <Section id="cenovnik" tone="paper">
      <SectionHeading
        eyebrow="Cenovnik"
        title="Sve usluge i sve cene"
        lead="Cene su prepisane iz njenog cenovnika i ne menjaju se na sajtu. Trajanje je procena, po njemu se računa slobodan termin."
      />

      <div className="sticky top-16 z-20 -mx-5 mt-10 bg-bg/90 px-5 py-4 backdrop-blur md:top-20 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <Input
            label="Pretraga cenovnika"
            type="search"
            placeholder="manikir, vosak, masaža…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            prefix={<Search size={16} strokeWidth={1.5} aria-hidden />}
            className="w-full md:max-w-sm"
          />
          <p aria-live="polite" data-reveal="off" className="num text-caption text-fg-muted">
            {total} od {services.length} usluga
          </p>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-8 rounded-md border border-line bg-bg-sunken p-6 text-fg">
          Nema usluge sa tim nazivom. Probajte kraću reč ili nas pozovite.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-line border-y border-line">
          {filtered.map(({ group, rows }) => {
            if (rows.length === 0) return null;
            const expanded = searching || open === group.key;
            return (
              <div key={group.key} id={`cenovnik-${group.key}`} className="scroll-mt-40">
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(open === group.key ? null : group.key)}
                    aria-expanded={expanded}
                    aria-controls={`panel-${group.key}`}
                    className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left focus-ring"
                  >
                    <span className="text-h3 text-fg">{group.title}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num text-caption text-fg-muted">{rows.length}</span>
                      <ChevronDown
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden
                        className={`text-fg-muted transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                      />
                    </span>
                  </button>
                </h3>

                {expanded ? (
                  <ul id={`panel-${group.key}`} className="pb-6">
                    {rows.map((s) => (
                      <li
                        key={s.key}
                        // flex namerno: red se pojavljuje kao celina, a ne reč po reč —
                        // „Manikir 900 RSD 30 min" po rečima nema smisla (lib/textReveal.ts).
                        className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2.5 last:border-0"
                      >
                        <span className="min-w-0 text-fg">
                          {s.title}
                          {s.addon ? <span className="ml-2 text-caption text-fg-muted">dodatak</span> : null}
                          {s.package ? <span className="ml-2 text-caption text-fg-muted">paket</span> : null}
                        </span>
                        <span className="num shrink-0 text-right">
                          <span className="block text-sm font-semibold text-fg">
                            {s.priceRsd === null ? "na upit" : formatRsd(s.priceRsd)}
                          </span>
                          <span className="block text-caption text-fg-muted">{formatDuration(s.durationMin)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-caption text-fg-muted">
        Izvor cena: {servicesMeta.source}. Trajanja su procena salona.
      </p>
    </Section>
  );
}
