import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/brand/Logo";
import { palette } from "@/lib/palette";

/** Favicon iz logotipa — iste SVG putanje kao na sajtu, bez fontova. */
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <LogoMark
          size={size.width}
          colors={{ circle: palette.mint, ink: palette.ink, rose: palette.rose }}
          decorative
        />
      </div>
    ),
    size,
  );
}
