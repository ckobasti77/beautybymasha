"use client";

import { Check } from "lucide-react";
import { STEPS, booking } from "./strings";

/**
 * Četiri koraka. Klik na završeni korak vraća nazad; tekući i budući su indikatori.
 * Krug je motiv iz logotipa (docs/BRAND.md §4), pa su i koraci krugovi.
 */
export function StepDots({
  step,
  onJump,
  disabled = false,
}: {
  step: number;
  onJump: (i: number) => void;
  disabled?: boolean;
}) {
  const total = STEPS.length;
  return (
    <ol className="flex flex-wrap items-center gap-1" aria-label={booking.stepOf(step + 1, total)}>
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => done && !disabled && onJump(i)}
              disabled={!done || disabled}
              aria-current={current ? "step" : undefined}
              className={[
                "flex min-h-11 items-center gap-2 rounded-pill py-1 pr-3 pl-1 text-[13px]",
                current ? "bg-tint text-fg" : done ? "text-fg hover:bg-bg-sunken" : "text-fg-muted",
                done && !disabled ? "cursor-pointer" : "cursor-default",
                "focus-ring",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "num inline-flex size-7 items-center justify-center rounded-pill text-xs",
                  current
                    ? "bg-brand font-semibold text-brand-fg"
                    : done
                      ? "bg-tint text-link"
                      : "border border-line text-fg-muted",
                ].join(" ")}
              >
                {done ? <Check size={14} strokeWidth={2.5} aria-hidden /> : i + 1}
              </span>
              <span className={current ? "" : "sr-only sm:not-sr-only"}>{label}</span>
            </button>
            {i < total - 1 ? <span aria-hidden className="h-px w-3 bg-line sm:w-5" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
