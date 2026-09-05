/**
 * Jedini `<defs>` sa SVG filterima za kap laka (spec 11 B). Montira se jednom, u
 * `app/layout.tsx`; 70 swatch-eva ga referencira po id-u (`filter: url(#bbm-sw-…)`
 * u globals.css) umesto da svaki nosi svoju kopiju.
 *
 * Filteri ne čitaju boju proizvoda: sloj teksture je proziran, `feTurbulence` sam
 * pravi šum, a `feColorMatrix` ga seče po alfi u retke tačkice — bele (sjaj čestica)
 * i slabe tamne (da zrno postoji i na skoro belim nijansama). Ako referenca ikad ne
 * proradi, sloj ostaje proziran, pa kap i dalje izgleda kao kap.
 *
 * `sRGB` interpolacija: podrazumevani `linearRGB` daje drugu gustinu tačaka po
 * engine-u. Vrednosti su u px, podešene za kap do ~144 px; `-lg` varijante (krupniji
 * šum) bira `@container (min-width: 200px)` na strani proizvoda.
 *
 * Nije `display: none` — Firefox tada ne razrešava `url(#id)`.
 */

type Dots = { seed: number; freq: number; octaves: number; k: number; t: number; white: boolean; slope?: number };

/** Prag po alfi šuma: alfa' = k·alfa − k·t → tačkica tamo gde je šum iznad `t`. */
function DotLayer({ seed, freq, octaves, k, t, white, slope, result }: Dots & { result: string }) {
  const rgb = white ? "0 0 0 0 1" : "0 0 0 0 0";
  const raw = `${result}-raw`;
  const cut = slope === undefined ? result : `${result}-cut`;
  return (
    <>
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={octaves} seed={seed} result={raw} />
      <feColorMatrix
        in={raw}
        type="matrix"
        values={`${rgb} ${rgb} ${rgb} 0 0 0 ${k} ${-(k * t).toFixed(2)}`}
        result={cut}
      />
      {slope !== undefined ? (
        <feComponentTransfer in={cut} result={result}>
          <feFuncA type="linear" slope={slope} />
        </feComponentTransfer>
      ) : null}
    </>
  );
}

function Merge({ layers }: { layers: readonly string[] }) {
  return (
    <feMerge>
      {layers.map((l) => (
        <feMergeNode key={l} in={l} />
      ))}
    </feMerge>
  );
}

const FILTER = { colorInterpolationFilters: "sRGB", x: "0", y: "0", width: "100%", height: "100%" } as const;

export function SwatchDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* shimmer: fino, gusto zrno */}
        <filter id="bbm-sw-shimmer" {...FILTER}>
          <DotLayer seed={7} freq={0.9} octaves={2} k={20} t={0.62} white result="light" />
          <DotLayer seed={19} freq={0.9} octaves={2} k={20} t={0.65} white={false} slope={0.35} result="dark" />
          <Merge layers={["dark", "light"]} />
        </filter>
        <filter id="bbm-sw-shimmer-lg" {...FILTER}>
          <DotLayer seed={7} freq={0.5} octaves={2} k={20} t={0.62} white result="light" />
          <DotLayer seed={19} freq={0.5} octaves={2} k={20} t={0.65} white={false} slope={0.35} result="dark" />
          <Merge layers={["dark", "light"]} />
        </filter>

        {/* glitter: dva sloja krupnijih, ređih pahulja — kao konfeti na ORLY referenci */}
        <filter id="bbm-sw-glitter" {...FILTER}>
          <DotLayer seed={5} freq={0.55} octaves={1} k={26} t={0.66} white result="fine" />
          <DotLayer seed={13} freq={0.34} octaves={1} k={26} t={0.677} white result="coarse" />
          <DotLayer seed={29} freq={0.42} octaves={1} k={26} t={0.685} white={false} slope={0.4} result="dark" />
          <Merge layers={["dark", "coarse", "fine"]} />
        </filter>
        <filter id="bbm-sw-glitter-lg" {...FILTER}>
          <DotLayer seed={5} freq={0.3} octaves={1} k={26} t={0.66} white result="fine" />
          <DotLayer seed={13} freq={0.18} octaves={1} k={26} t={0.677} white result="coarse" />
          <DotLayer seed={29} freq={0.22} octaves={1} k={26} t={0.685} white={false} slope={0.4} result="dark" />
          <Merge layers={["dark", "coarse", "fine"]} />
        </filter>

        {/* metallic: vrtlog — niskofrekventna turbulencija krivi svetlo/tamne pruge sloja (kao „Golds") */}
        <filter id="bbm-sw-metallic" {...FILTER}>
          <feTurbulence type="turbulence" baseFrequency="0.022" numOctaves="2" seed="3" result="swirl" />
          <feDisplacementMap in="SourceGraphic" in2="swirl" scale="30" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="bbm-sw-metallic-lg" {...FILTER}>
          <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" seed="3" result="swirl" />
          <feDisplacementMap in="SourceGraphic" in2="swirl" scale="90" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
