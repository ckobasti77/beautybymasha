import { useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

/**
 * Polje po DNA components.input_style: 44 px, radijus 8, 1px linija, fokus prsten 2px mint-deep.
 * Greška: aria-invalid + tekst ispod u danger boji (kaže šta da se uradi, ne samo „Greška").
 */
export type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Sakrij labelu vizuelno (ostaje za čitače). */
  hideLabel?: boolean;
  className?: string;
};

export const FIELD_BOX =
  "min-h-11 w-full rounded-sm border border-line bg-bg-elev px-3.5 text-base text-fg " +
  "placeholder:text-fg-muted/70 focus-ring transition-[border-color,box-shadow] duration-150 " +
  "hover:border-line-strong disabled:cursor-not-allowed disabled:bg-bg-sunken disabled:opacity-60 " +
  "aria-invalid:border-danger";

export function FieldShell({
  id,
  label,
  hint,
  error,
  hideLabel,
  className,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "text-sm font-medium text-fg"}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export type InputProps = FieldProps &
  // `prefix` je i HTML atribut <input>; bez Omit-a presek postaje `string & ReactNode`.
  Omit<ComponentPropsWithoutRef<"input">, "className" | "id" | "prefix" | "suffix"> & {
    id?: string;
    prefix?: ReactNode;
    suffix?: ReactNode;
    /** Za cene, sate i količine — tabular-nums. */
    numeric?: boolean;
  };

export function Input({
  label,
  hint,
  error,
  hideLabel,
  className,
  id: idProp,
  prefix,
  suffix,
  numeric,
  ...input
}: InputProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <span className="relative flex items-center">
        {prefix && (
          <span className="pointer-events-none absolute left-3.5 text-sm text-fg-muted">{prefix}</span>
        )}
        <input
          {...input}
          id={id}
          inputMode={numeric ? "numeric" : input.inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={[FIELD_BOX, numeric && "num", prefix && "pl-10", suffix && "pr-10"].filter(Boolean).join(" ")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3.5 text-sm text-fg-muted">{suffix}</span>
        )}
      </span>
    </FieldShell>
  );
}
