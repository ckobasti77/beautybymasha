import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Magnetic } from "@/components/motion/Magnetic";

/**
 * Dugme po DNA components.button_style: pill, min 44 px.
 *  - primary: puni mint sa INK tekstom (8,1:1; krem na mintu bi bio 2,1:1) → hover mint-deep + paper
 *  - ghost:   1px obrub u liniji
 *  - danger:  obrub u boji greške
 * Primarno dugme je podrazumevano magnetno (gasi se na touch i uz reduced-motion).
 */
export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

type Base = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Magnetni hover — podrazumevano samo za primary. */
  magnetic?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
};

type AsButton = Base & Omit<ComponentPropsWithoutRef<"button">, keyof Base> & { as?: "button" };
type AsLink = Base & Omit<ComponentPropsWithoutRef<"a">, keyof Base> & { as: "a"; href: string };

export type ButtonProps = AsButton | AsLink;

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap select-none " +
  "transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out focus-ring " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const SIZES: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-13 px-7 text-base",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-brand-fg hover:bg-brand-hover hover:text-brand-hover-fg hover:-translate-y-px hover:shadow-card active:translate-y-0 active:shadow-none",
  ghost:
    "border border-line bg-transparent text-fg hover:border-line-strong hover:bg-bg-elev hover:-translate-y-px hover:shadow-card active:translate-y-0",
  danger:
    "border border-danger bg-transparent text-danger-text hover:bg-danger hover:text-paper hover:-translate-y-px active:translate-y-0",
};

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 shrink-0 animate-spin rounded-pill border-2 border-current border-r-transparent motion-reduce:animate-none"
    />
  );
}

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    magnetic = variant === "primary",
    leading,
    trailing,
    className,
    children,
    ...rest
  } = props;

  const cls = [BASE, SIZES[size], VARIANTS[variant], className].filter(Boolean).join(" ");
  const content = (
    <>
      {loading ? <Spinner /> : leading}
      <span>{children}</span>
      {trailing}
    </>
  );

  let node: ReactNode;
  if (rest.as === "a") {
    const { as: _as, ...a } = rest;
    void _as;
    node = (
      <a {...a} className={cls} aria-busy={loading || undefined} aria-disabled={loading || a["aria-disabled"]}>
        {content}
      </a>
    );
  } else {
    const { as: _as, disabled, type = "button", ...b } = rest as AsButton;
    void _as;
    node = (
      <button {...b} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined}>
        {content}
      </button>
    );
  }

  const isDisabled = loading || ("disabled" in rest && Boolean(rest.disabled));
  return magnetic && !isDisabled ? <Magnetic>{node}</Magnetic> : node;
}
