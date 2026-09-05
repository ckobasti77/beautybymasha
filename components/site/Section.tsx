import type { ReactNode } from "react";

/**
 * Omotač sekcije: sekcijski ritam iz `globals.css` (`section-pad`), maksimalna širina
 * sadržaja i `scroll-mt` da lepljiva navigacija ne pojede naslov kad se skoči na sidro.
 *
 * Bez ijedne animacije — ulaze rade `Reveal` (kontejneri) i site-wide text-reveal (reči).
 */
export function Section({
  id,
  tone = "paper",
  className,
  children,
}: {
  id?: string;
  /** `wash` je najsvetlija mint podloga za sekcije koje treba odvojiti od papira. */
  tone?: "paper" | "wash" | "sunken";
  className?: string;
  children: ReactNode;
}) {
  const bg = tone === "wash" ? "bg-tint-wash" : tone === "sunken" ? "bg-bg-sunken" : "bg-bg";
  return (
    <section id={id} className={["section-pad scroll-mt-24", bg, className].filter(Boolean).join(" ")}>
      <div className="mx-auto w-full max-w-content px-5 md:px-8">{children}</div>
    </section>
  );
}
