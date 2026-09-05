import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/brand/Logo";
import { palette } from "@/lib/palette";
import { site } from "@/lib/site";

/**
 * Slika za deljenje — ista koja se vidi u Viberu, na Facebooku i u Google
 * pregledu. Crta se iz `LogoMark`, istih SVG putanja kao logo na sajtu, pa ne
 * zavisi ni od jednog fajla u `public/` niti od učitavanja fontova.
 *
 * Tekst je namerno kratak: na telefonu se ova slika vidi široka oko 300 px.
 */
export const alt = `${site.name} — kozmetički salon u Belvilleu`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: palette.paper,
          color: palette.ink,
        }}
      >
        <LogoMark
          size={280}
          colors={{ circle: palette.mint, ink: palette.ink, rose: palette.rose }}
          decorative
        />
        <div style={{ display: "flex", fontSize: 40, letterSpacing: -0.5 }}>
          Nokti · Depilacija · Masaža · Trepavice i obrve
        </div>
        <div style={{ display: "flex", fontSize: 30, color: palette.rose }}>
          Belville, Novi Beograd — dva salona
        </div>
      </div>
    ),
    size,
  );
}
