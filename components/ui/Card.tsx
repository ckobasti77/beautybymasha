import type { ComponentPropsWithoutRef, ReactNode } from "react";

type CardTag = "div" | "article" | "section" | "li" | "a" | "figure";

export type CardProps<T extends CardTag = "div"> = {
  as?: T;
  /** Podizanje za 1 px + jača senka na hover (DNA interaction_feel.hover_behavior). */
  interactive?: boolean;
  /** Bez unutrašnjeg razmaka — kad kartica nosi sliku do ivice. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/**
 * Kartica po DNA components.card_style: elevirana podloga, radijus 16, senka low,
 * 1px linija. Slika unutra dobija radijus 8 (klasa `card-media`).
 */
export function Card<T extends CardTag = "div">({
  as,
  interactive = false,
  flush = false,
  className,
  children,
  ...rest
}: CardProps<T>) {
  // Polimorfna kartica: u runtime-u je traženi tag, a za TS se pravimo da je <div>.
  // Bez ovog suženja presek props-a svih dozvoljenih tagova ispadne `never`.
  const Tag = (as ?? "div") as "div";
  const cls = [
    "rounded-md border border-line bg-bg-elev shadow-card",
    flush ? "overflow-hidden" : "p-6",
    interactive &&
      "transition-[transform,box-shadow,border-color] duration-300 ease-out-expo hover:-translate-y-px hover:border-line-strong hover:shadow-pop focus-ring",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={cls} {...(rest as ComponentPropsWithoutRef<"div">)}>
      {children}
    </Tag>
  );
}
