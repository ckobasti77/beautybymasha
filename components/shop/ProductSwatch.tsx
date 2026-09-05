import type { CSSProperties, ReactNode, Ref } from "react";
import type { Finish } from "@/lib/products";
import { TEXTURED_FINISHES, swatchStyle } from "@/lib/swatch";

/**
 * Kap laka snimljena odozgo (spec 11 B, referenca ORLY „Colors & Finishes"): sjaj
 * gore-levo, tamniji obod dole, dubina tečnosti i tekstura po finišu. Čist CSS
 * (`.sw…` u globals.css) + SVG filteri iz jednog `<defs>` (`SwatchDefs`). Bez slika —
 * radi za svih 70 boja, i za 20 Entity nijansi bez fotografije.
 *
 * Jedna komponenta za ceo sajt: zid shopa, strana proizvoda, ORLY sekcija na landingu,
 * admin i korpa. `size` u px za fiksne kapi (admin, korpa); bez `size` kap puni
 * širinu roditelja (`className="w-full"`), a sve mere unutra su u `cqw`, pa izgleda
 * isto na 48 px i na 400 px.
 *
 * `children` je opciona fotografija proizvoda koja se na hover crossfade-uje preko
 * kapi (docs/BRAND.md §7) — seče se na oblik kapi i ostaje ispod gloss sweep-a.
 * Kontejner mora da nosi klasu `group`: sweep, podizanje i senka slušaju `.group:hover`.
 *
 * `ref` (React 19) daje spoljni `.sw` span — hero kap mu na svaki tik ciklusa piše `--sw`.
 */
export function ProductSwatch({
  hex,
  finish,
  size,
  className,
  children,
  ref,
}: {
  hex: string;
  finish: Finish;
  size?: number;
  className?: string;
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}) {
  const style = { ...swatchStyle(hex), ...(size !== undefined ? { width: size } : {}) } as CSSProperties;
  return (
    <span ref={ref} className={["sw", className].filter(Boolean).join(" ")} style={style} aria-hidden>
      <span className="sw-shadow" />
      <span className="sw-drop swatch-gloss" data-finish={finish}>
        {TEXTURED_FINISHES.has(finish) ? <span className="sw-tex" /> : null}
        {finish === "holo" ? <span className="sw-tint" /> : null}
        <span className="sw-light" />
        <span className="sw-spec" />
        {children}
      </span>
    </span>
  );
}
