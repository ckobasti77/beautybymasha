"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDuration, formatRsd } from "@/lib/format";
import { InlineNumber, Panel, SaveHint, Stepper, useSave } from "../ui";

/**
 * Podešavanja koja menjaju kako sajt radi.
 *
 * Sve se čuva odmah. Uz svako polje stoji rečenica šta se menja u praksi — broj
 * bez posledice je samo broj.
 */

export function SettingsTab({ adminKey }: { adminKey?: string }) {
  const settings = useQuery(api.settings.get, { key: adminKey ?? "" });
  const update = useMutation(api.settings.update);
  const { state, error, run } = useSave();

  if (settings === undefined) return <p className="text-body text-fg-muted">Učitavam podešavanja…</p>;

  type Patch = Omit<Parameters<typeof update>[0], "key">;
  const save = (patch: Patch) => run(() => update({ key: adminKey ?? "", ...patch }));

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h2 text-fg">Podešavanja</h1>
          <p className="mt-1 text-body-sm text-fg-muted">Pravila po kojima sajt prima termine i porudžbine.</p>
        </div>
        <SaveHint state={state} error={error} />
      </header>

      {error && (
        <p role="alert" className="text-body-sm text-danger-text">
          {error}
        </p>
      )}

      <Panel title="Zakazivanje">
        <ul className="flex flex-col">
          <Row
            label="Korak termina"
            hint={`Termini se nude na svakih ${settings.slotStepMin} minuta.`}
            control={
              <Stepper
                label="Korak termina"
                value={settings.slotStepMin}
                step={5}
                min={5}
                max={120}
                suffix=" min"
                onChange={(slotStepMin) => save({ slotStepMin })}
              />
            }
          />
          <Row
            label="Najranije unapred"
            hint={`Za manje od ${formatDuration(settings.leadTimeMin)} pre termina više se ne može zakazati preko sajta.`}
            control={
              <Stepper
                label="Najranije unapred"
                value={settings.leadTimeMin}
                step={30}
                min={0}
                max={2880}
                suffix=" min"
                onChange={(leadTimeMin) => save({ leadTimeMin })}
              />
            }
          />
          <Row
            label="Koliko unapred se vidi"
            hint={`Gosti biraju termin do ${settings.horizonDays} dana unapred.`}
            control={
              <Stepper
                label="Koliko unapred se vidi"
                value={settings.horizonDays}
                step={7}
                min={1}
                max={365}
                suffix=" d"
                onChange={(horizonDays) => save({ horizonDays })}
              />
            }
          />
          <Row
            label="Koliko zahtev čeka"
            hint={`Nepotvrđen zahtev sam otpada posle ${settings.holdHours} h i mesto se oslobađa.`}
            control={
              <Stepper
                label="Koliko zahtev čeka"
                value={settings.holdHours}
                min={1}
                max={168}
                suffix=" h"
                onChange={(holdHours) => save({ holdHours })}
              />
            }
          />
        </ul>
      </Panel>

      <Panel title="Shop">
        <ul className="flex flex-col">
          <Row
            label="Poštarina"
            hint={`Kupac plaća ${formatRsd(settings.shippingFlatRsd)} dostave.`}
            control={
              <InlineNumber
                className="w-36"
                label="Poštarina"
                value={settings.shippingFlatRsd}
                suffix="RSD"
                max={100000}
                onCommit={(shippingFlatRsd) => save({ shippingFlatRsd })}
              />
            }
          />
          <Row
            label="Besplatno preko"
            hint={`Preko ${formatRsd(settings.shippingFreeOverRsd)} dostava je besplatna.`}
            control={
              <InlineNumber
                className="w-36"
                label="Besplatno preko"
                value={settings.shippingFreeOverRsd}
                suffix="RSD"
                max={1000000}
                onCommit={(shippingFreeOverRsd) => save({ shippingFreeOverRsd })}
              />
            }
          />
          <Row
            label="Loyalty popust"
            hint={`Član dobija ${settings.loyaltyPercent}% na sledeći račun, i u salonu i na sajtu.`}
            control={
              <Stepper
                label="Loyalty popust"
                value={settings.loyaltyPercent}
                step={5}
                min={0}
                max={50}
                suffix="%"
                onChange={(loyaltyPercent) => save({ loyaltyPercent })}
              />
            }
          />
        </ul>
      </Panel>

      <Panel title="Poruka uz potvrdu termina" hint="Ono što šaljete gostu kad potvrdite zahtev.">
        <div className="p-4">
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Poruka uz potvrdu termina</span>
            <textarea
              defaultValue={settings.confirmMessage}
              rows={3}
              maxLength={400}
              onBlur={(e) => {
                const confirmMessage = e.target.value.trim();
                if (confirmMessage !== settings.confirmMessage) save({ confirmMessage });
              }}
              className="w-full rounded-sm border border-line bg-bg-elev px-3.5 py-2.5 text-base text-fg focus-ring"
            />
          </label>
          <p className="mt-2 text-caption text-fg-muted">
            Reči u vitičastim zagradama se zamenjuju podacima termina:{" "}
            <code className="text-fg">{"{ime} {usluga} {datum} {vreme} {lokal}"}</code>.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint: string;
  control: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-fg">{label}</span>
        <span className="block text-caption text-fg-muted">{hint}</span>
      </span>
      {control}
    </li>
  );
}
