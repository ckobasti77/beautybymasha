"use client";

import type { ReactNode } from "react";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { SmoothScroll } from "./SmoothScroll";
import { TextRevealGlobal } from "./TextRevealGlobal";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Sastav provider-a za javni sajt. Redosled: tema (najspoljnija, bez zavisnosti) →
 * Convex → Lenis. TextRevealGlobal ne renderuje ništa i ne zavisi ni od čega.
 * Admin (prompt 6) će dobiti svoj layout bez Lenis-a i bez text-reveal-a.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConvexClientProvider>
        <TextRevealGlobal />
        <SmoothScroll>{children}</SmoothScroll>
      </ConvexClientProvider>
    </ThemeProvider>
  );
}
