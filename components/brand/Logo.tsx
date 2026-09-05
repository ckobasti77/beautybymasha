import type { CSSProperties } from "react";
import { BEAUTY, BY_MASHA } from "@/lib/brand/logo-paths";

/**
 * Logotip salona rekonstruisan u kodu (SVG putanje iz lib/brand/logo-paths.ts):
 * mint krug, „BEAUTY" u Archivo 800 / wdth 78, ispod „by Masha" u Sacramento roze,
 * blago rotirano i preklopljeno preko donje ivice slova. Ne zavisi od učitavanja fontova.
 *
 *  - mark     — mint krug sa celim lockup-om (njen IG logo; izvor za favicon)
 *  - wordmark — lockup bez kruga, BEAUTY prati currentColor (hero, Flip u nav)
 *  - full     — mark + „Beauty by Masha" pored (nav, footer)
 *
 * Boje su podrazumevano CSS tokeni; `colors` prima literale za satori (icon/OG).
 * Za ispis rukopisa vidi LogoSignature.tsx (ovde samo `animate` označava glifove).
 */

export type LogoVariant = "full" | "mark" | "wordmark";

export type LogoColors = {
  /** Krug. */
  circle: string;
  /** BEAUTY. */
  ink: string;
  /** by Masha. */
  rose: string;
};

export const LOGO_TITLE = "Beauty by Masha";

const TOKEN_COLORS: LogoColors = {
  circle: "var(--mint)",
  ink: "var(--ink)",
  rose: "var(--rose)",
};

/* Lockup geometrija u jedinicama BEAUTY (1000 upm, cap 686). Podešeno vizuelno. */
/*
 * Izmereno iz putanja: Sacramento ascenderi (b, M, h) idu 712–748 upm iznad osnovne
 * linije, x-visina tela (a, s) 238–304, „y" silazi 461.
 *
 * Korak 10: rukopis je bio centriran i prevelik (scale 1.15) pa je prekrivao celo
 * „BEAUTY" i seckao se o viewBox. Sada je LEVO poravnat sa BEAUTY, ~38% njegove širine,
 * i sedi ISPOD reči — gornje petlje tek dodiruju donju ivicu slova.
 */
const SIG_SCALE = 0.37; // rukopis ≈ 38% širine BEAUTY
const SIG_ASCENDER = 748; // najviši ascender (M/h) u upm
const LOCKUP = {
  beautyBaseline: BEAUTY.capHeight, // vrh slova na y = 0, osnovna linija na y = 686
  sigScale: SIG_SCALE,
  sigRotate: -4,
  /** Leva ivica rukopisa poravnata sa BEAUTY (x≈0), mali inset ulevo. */
  sigLeftX: -10,
  /** Vrh ascendera (~748upm) pada ~5upm ispod osnovne linije slova → petlje ih tek dodirnu. */
  sigBaseline: BEAUTY.capHeight + 5 + SIG_ASCENDER * SIG_SCALE,
  /** viewBox lockup-a (wordmark): BEAUTY nosi širinu, rukopis stane levo dole. */
  box: { x: -40, y: -40, w: BEAUTY.width + 80, h: 1220 },
} as const;

/** Mark: lockup skaliran u krug 1000×1000 (BEAUTY ≈ 70% prečnika, vizuelno centrirano). */
const MARK = { scale: 0.2, x: 152, y: 368, box: 1000 } as const;

const SIG_STROKE = 14;

function LockupArt({ colors, animate }: { colors: LogoColors; animate?: boolean }) {
  const sigTransform = `translate(${LOCKUP.sigLeftX} ${LOCKUP.sigBaseline}) rotate(${LOCKUP.sigRotate}) scale(${LOCKUP.sigScale})`;
  return (
    <>
      <g transform={`translate(0 ${LOCKUP.beautyBaseline})`} fill={colors.ink} data-logo-beauty>
        {BEAUTY.glyphs.map((g, i) => (
          <path key={i} d={g.d} />
        ))}
      </g>
      <g
        transform={sigTransform}
        fill={colors.rose}
        data-logo-sig={animate ? "pending" : undefined}
        stroke={animate ? colors.rose : undefined}
        strokeWidth={animate ? SIG_STROKE : undefined}
        strokeLinecap={animate ? "round" : undefined}
        strokeLinejoin={animate ? "round" : undefined}
      >
        {BY_MASHA.glyphs.map((g, i) => (
          <path key={i} d={g.d} data-sig-glyph={animate ? "" : undefined} />
        ))}
      </g>
    </>
  );
}

type SvgCommon = {
  className?: string;
  style?: CSSProperties;
  title?: string;
  /** Širina u px ili CSS jedinicama; visina prati odnos stranica. */
  size?: number | string;
  colors?: Partial<LogoColors>;
  animate?: boolean;
  /** `true` kad je logo čisto dekorativan pored teksta (full) — nema aria-label. */
  decorative?: boolean;
};

export function LogoMark({ className, style, title = LOGO_TITLE, size, colors, animate, decorative }: SvgCommon) {
  const c = { ...TOKEN_COLORS, ...colors };
  return (
    <svg
      viewBox={`0 0 ${MARK.box} ${MARK.box}`}
      width={size}
      height={size}
      className={className}
      style={style}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative ? true : undefined}
    >
      <circle cx={MARK.box / 2} cy={MARK.box / 2} r={MARK.box / 2} fill={c.circle} />
      <g transform={`translate(${MARK.x} ${MARK.y}) scale(${MARK.scale})`}>
        <LockupArt colors={c} animate={animate} />
      </g>
    </svg>
  );
}

export function LogoWordmark({ className, style, title = LOGO_TITLE, size, colors, animate, decorative }: SvgCommon) {
  // BEAUTY prati currentColor (tamna tema), rukopis ostaje roze
  const c = { ...TOKEN_COLORS, ink: "currentColor", ...colors };
  const { x, y, w, h } = LOCKUP.box;
  return (
    <svg
      viewBox={`${x} ${y} ${w} ${h}`}
      width={size}
      height={typeof size === "number" ? (size * h) / w : undefined}
      className={className}
      style={style}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative ? true : undefined}
    >
      <LockupArt colors={c} animate={animate} />
    </svg>
  );
}

export type LogoProps = SvgCommon & { variant?: LogoVariant };

/**
 * `size` je širina znaka (mark) ili lockup-a (wordmark). Za `full`, size je visina znaka,
 * a tekst pored prati font-size roditelja.
 */
export function Logo({ variant = "mark", ...rest }: LogoProps) {
  if (variant === "wordmark") return <LogoWordmark {...rest} />;
  if (variant === "mark") return <LogoMark {...rest} />;

  const { className, style, title = LOGO_TITLE, size = 40, ...svg } = rest;
  return (
    <span
      className={["inline-flex items-center gap-3 whitespace-nowrap", className].filter(Boolean).join(" ")}
      style={style}
      role="img"
      aria-label={title}
      data-reveal="off"
    >
      <LogoMark {...svg} size={size} decorative />
      <span aria-hidden className="font-display text-[1.05em] font-bold leading-none tracking-tight text-fg [font-variation-settings:'wdth'_88]">
        Beauty <span className="text-script text-[1.35em] text-accent">by Masha</span>
      </span>
    </span>
  );
}
