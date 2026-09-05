import type { ReactNode } from "react";

/**
 * Naslov sekcije. Bez ijedne animacije — copy hvata site-wide reč-po-reč otkrivanje
 * (Sistem 1). Ne omotavati u Reveal, ne dodavati fade oko teksta.
 * `signature` = roze rukopisni potpis (Sacramento), dve-tri reči, nikad rečenica.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  signature,
  align = "left",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: string;
  signature?: string;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const titleClass = Tag === "h1" ? "text-h1" : Tag === "h3" ? "text-h3" : "text-h2";
  return (
    <div
      className={[
        "max-w-prose",
        align === "center" ? "mx-auto text-center" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {eyebrow && <p className="mb-4 text-overline text-link">{eyebrow}</p>}
      <Tag className={`${titleClass} text-fg`}>{title}</Tag>
      {signature && (
        <p className="mt-2 text-script text-[clamp(1.5rem,3vw,2rem)] text-accent" aria-hidden>
          {signature}
        </p>
      )}
      {lead && <p className="mt-5 text-base leading-relaxed text-fg-muted md:text-lg">{lead}</p>}
    </div>
  );
}
