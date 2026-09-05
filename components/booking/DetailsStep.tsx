"use client";

import { Input } from "@/components/ui/Input";
import { NOTE_MAX, booking } from "./detailsRules";

export type { DetailsErrors, DetailsField, DetailsValues } from "./detailsRules";
import type { DetailsErrors, DetailsField, DetailsValues } from "./detailsRules";

/**
 * Korak 4: ime i telefon su obavezni, imejl i napomena nisu. Greške se pokazuju tek
 * posle napuštanja polja (ili posle slanja), da polje ne viče dok se kuca.
 * Honeypot `website` je nevidljiv ljudima; server na popunjen honeypot glumi uspeh.
 */
export function DetailsStep({
  ids,
  values,
  errors,
  touched,
  disabled,
  onChange,
  onBlur,
}: {
  ids: Record<"name" | "phone" | "email" | "note" | "website", string>;
  values: DetailsValues;
  errors: DetailsErrors;
  touched: Partial<Record<DetailsField, boolean>>;
  disabled: boolean;
  onChange: <K extends keyof DetailsValues>(key: K, value: DetailsValues[K]) => void;
  onBlur: (field: DetailsField) => void;
}) {
  const show = (f: DetailsField) => (touched[f] ? errors[f] : undefined);

  return (
    <fieldset disabled={disabled} className="space-y-5">
      <legend className="sr-only">{booking.details.title}</legend>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id={ids.name}
          name="name"
          label={booking.details.name}
          autoComplete="name"
          required
          maxLength={60}
          placeholder={booking.details.namePlaceholder}
          value={values.name}
          error={show("name")}
          onChange={(e) => onChange("name", e.target.value)}
          onBlur={() => onBlur("name")}
        />
        <Input
          id={ids.phone}
          name="phone"
          type="tel"
          inputMode="tel"
          numeric
          label={booking.details.phone}
          autoComplete="tel"
          required
          placeholder={booking.details.phonePlaceholder}
          hint={booking.details.phoneHint}
          value={values.phone}
          error={show("phone")}
          onChange={(e) => onChange("phone", e.target.value)}
          onBlur={() => onBlur("phone")}
        />
      </div>

      <Input
        id={ids.email}
        name="email"
        type="email"
        label={booking.details.email}
        autoComplete="email"
        maxLength={120}
        placeholder={booking.details.emailPlaceholder}
        value={values.email}
        error={show("email")}
        onChange={(e) => onChange("email", e.target.value)}
        onBlur={() => onBlur("email")}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={ids.note} className="text-sm font-medium text-fg">
            {booking.details.note}
          </label>
          <span aria-hidden className="num text-caption text-fg-muted">
            {booking.details.noteCount(values.note.length, NOTE_MAX)}
          </span>
        </div>
        <textarea
          id={ids.note}
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder={booking.details.notePlaceholder}
          value={values.note}
          onChange={(e) => onChange("note", e.target.value)}
          onBlur={() => onBlur("note")}
          aria-invalid={show("note") ? true : undefined}
          aria-describedby={show("note") ? `${ids.note}-error` : undefined}
          className="min-h-24 w-full resize-y rounded-sm border border-line bg-bg-elev px-3.5 py-3 text-base text-fg placeholder:text-fg-muted/70 hover:border-line-strong focus-ring aria-invalid:border-danger"
        />
        {show("note") ? (
          <p id={`${ids.note}-error`} role="alert" className="text-caption text-danger-text">
            {show("note")}
          </p>
        ) : null}
      </div>

      {/* Honeypot: ljudima nevidljiv, botovima primamljiv. */}
      <div aria-hidden className="absolute -left-[9999px] top-0 size-px overflow-hidden">
        <label htmlFor={ids.website}>{booking.details.website}</label>
        <input
          id={ids.website}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => onChange("website", e.target.value)}
        />
      </div>

      <p className="text-caption text-fg-muted">{booking.details.privacy}</p>
    </fieldset>
  );
}
