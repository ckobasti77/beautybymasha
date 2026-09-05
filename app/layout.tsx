import type { Metadata, Viewport } from "next";
import { Archivo, Manrope, Sacramento } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import { hideCss } from "@/constants/textRevealConfig";
import { darkTheme, palette } from "@/lib/palette";
import { site } from "@/lib/site";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/** Wordmark i naslovi — zbijeno i teško kao njen logo (wdth osa uključena). */
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

/** Rukopis — samo „by Masha" i potpisi sekcija, nikad rečenica. */
const sacramento = Sacramento({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  variable: "--font-sacramento",
});

/** Telo, UI, admin — pun latin-ext za š đ č ć ž. */
const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — kozmetički salon, Belville`,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
  alternates: { canonical: "/" },
  openGraph: {
    siteName: site.name,
    title: site.name,
    description: site.tagline,
    locale: "sr_RS",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: palette.paper },
    { media: "(prefers-color-scheme: dark)", color: darkTheme.bg },
  ],
};

/**
 * Koren: fontovi, tokeni, provideri. U <head> idu dve inline stvari koje moraju
 * pre prvog paint-a: tema (da ne bljesne) i hideCss() (copy sakriven dok ga
 * TextRevealGlobal ne vrati — samo pod `html.js`, koji postavlja ista skripta).
 * `data-theme="light"` je SSR podrazumevano; skripta ga menja pre paint-a, zato
 * suppressHydrationWarning.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sr-Latn-RS"
      data-theme="light"
      className={`${archivo.variable} ${sacramento.variable} ${manrope.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: hideCss() }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
