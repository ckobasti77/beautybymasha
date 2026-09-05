import { useId, type ComponentPropsWithoutRef } from "react";
import { ChevronDown } from "lucide-react";
import { FIELD_BOX, FieldShell, describedBy, type FieldProps } from "./Input";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = FieldProps &
  Omit<ComponentPropsWithoutRef<"select">, "className" | "id" | "children"> & {
    id?: string;
    options: readonly SelectOption[];
    placeholder?: string;
  };

/** Nativni <select> u istom okviru kao Input, sa lucide strelicom (16 px, stroke 1.5). */
export function Select({
  label,
  hint,
  error,
  hideLabel,
  className,
  id: idProp,
  options,
  placeholder,
  ...select
}: SelectProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} hideLabel={hideLabel} className={className}>
      <span className="relative flex items-center">
        <select
          {...select}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${FIELD_BOX} appearance-none pr-10`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          size={16}
          strokeWidth={1.5}
          className="pointer-events-none absolute right-3.5 text-fg-muted"
        />
      </span>
    </FieldShell>
  );
}
