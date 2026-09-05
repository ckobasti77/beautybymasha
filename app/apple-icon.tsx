import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/brand/Logo";
import { palette } from "@/lib/palette";

/** iOS ikona — mint krug na krem podlozi (iOS sam zaobljava uglove). */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: palette.paper,
        }}
      >
        <LogoMark
          size={156}
          colors={{ circle: palette.mint, ink: palette.ink, rose: palette.rose }}
          decorative
        />
      </div>
    ),
    size,
  );
}
