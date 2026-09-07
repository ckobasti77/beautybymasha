"use client";

import type { ReactNode } from "react";
import { BackToTop } from "@/components/site/BackToTop";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { SmoothScroll } from "./SmoothScroll";
import { TextRevealGlobal } from "./TextRevealGlobal";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Sastav provider-a za javni sajt. Redosled: tema (najspoljnija, bez zavisnosti) →
 * Convex → Lenis. TextRevealGlobal ne renderuje ništa i ne zavisi ni od čega.
 * `BackToTop` stoji ovde, a ne u `app/page.tsx`: treba mu Lenis iz `SmoothScroll`, a dugačke su
 * i ostale strane (cenovnik, shop). Sam se gasi u panelu.
 * Korpa nema provider — ona je spoljni store nad `localStorage` (`lib/cartStore.ts`).
 * Admin (prompt 6) će dobiti svoj layout bez Lenis-a i bez text-reveal-a.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ConvexClientProvider>
        <TextRevealGlobal />
        <SmoothScroll>
          {children}
          <BackToTop />
        </SmoothScroll>
      </ConvexClientProvider>
    </ThemeProvider>
  );
}
