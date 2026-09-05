"use client";

import { useEffect, useRef, useState } from "react";

/**
 * QR kod se crta na klijentu, u `<canvas>`.
 *
 * `qrcode` se uvozi dinamički: koristi ga samo članska kartica i IPS nalog, pa
 * nema razloga da putuje uz svaku stranu sajta.
 *
 * Boje su namerno crno-bele, a ne brendirane. Čitač u banci i na kasi traži
 * kontrast, ne mint; „lep" QR je QR koji se ne skenira iz prve.
 */
export function QrCode({
  value,
  size = 176,
  label,
  className,
}: {
  value: string;
  /** Stranica u CSS pikselima; canvas se crta na dvostrukoj gustini. */
  size?: number;
  /** Šta QR sadrži, za čitače ekrana. */
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { default: QRCode } = await import("qrcode");
        const canvas = ref.current;
        if (cancelled || !canvas) return;
        await QRCode.toCanvas(canvas, value, {
          width: size * 2,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#12100FFF", light: "#FFFFFFFF" },
        });
        // `qrcode` upisuje i `style.width` u punoj rezoluciji (336 px za
        // `size` 168) i time razbija raspored na 390 px. Crtamo na dvostrukoj
        // gustini, ali na strani zauzimamo tačno `size`.
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        if (!cancelled) setFailed(false);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  // Canvas ostaje u DOM-u i kad crtanje padne: `ref` mora da postoji da bi
  // sledeći pokušaj (druga vrednost, druga veličina) uopšte imao gde da crta.
  return (
    <>
      <canvas
        ref={ref}
        role="img"
        aria-label={label}
        hidden={failed}
        style={{ width: size, height: size }}
        className={["rounded-sm bg-white", className].filter(Boolean).join(" ")}
      />
      {failed ? (
        <p className="text-caption text-fg-muted">
          QR kod nije mogao da se nacrta. Pročitajte broj ispod, radi isti posao.
        </p>
      ) : null}
    </>
  );
}
