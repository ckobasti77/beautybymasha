import type { ReactNode } from "react";

/**
 * Omotač sekcije: sekcijski ritam iz `globals.css` (`section-pad`), maksimalna širina
 * sadržaja. Odmak od lepljive navigacije pri skoku na sidro daje globalno pravilo
 * `:is(section, footer)[id] { scroll-margin-top }` (globals.css, `--nav-h`).
 *
 * Bez ijedne animacije — ulaze rade `Reveal` (kontejneri) i site-wide text-reveal (reči).
 */
export function Section({
  id,
  tone = "paper",
  pad = "normal",
  className,
  children,
}: {
  id?: string;
  /** `tight` = minimalni vertikalni ritam (sekcija ispod heroja, da stane u ekran). */
  pad?: "normal" | "tight";
  /** `wash` je najsvetlija mint podloga za sekcije koje treba odvojiti od papira. */
  tone?: "paper" | "wash" | "sunken";
  className?: string;
  children: ReactNode;
}) {
  const bg = tone === "wash" ? "bg-tint-wash" : tone === "sunken" ? "bg-bg-sunken" : "bg-bg";
  return (
    <section id={id} className={[pad === "tight" ? "section-pad-tight" : "section-pad", bg, className].filter(Boolean).join(" ")}>
      <div className="mx-auto w-full max-w-content px-5 md:px-8">{children}</div>
    </section>
  );
}
