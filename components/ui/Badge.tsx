import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "mint" | "rose" | "success" | "warning" | "danger";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-bg-sunken text-fg-muted",
  mint: "bg-tint text-fg",
  rose: "bg-accent-soft text-fg",
  success: "bg-tint text-success-text",
  warning: "bg-[color-mix(in_oklab,var(--warning)_18%,transparent)] text-warning-text",
  danger: "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger-text",
};

const DOTS: Record<BadgeTone, string> = {
  neutral: "bg-fg-muted",
  mint: "bg-mint-deep",
  rose: "bg-rose",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Pill oznaka: bestseller, loyalty, status termina. Tekst 12 px / 600 — čitljiv i mali. */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap",
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dot && <span aria-hidden className={`size-1.5 rounded-pill ${DOTS[tone]}`} />}
      {children}
    </span>
  );
}
