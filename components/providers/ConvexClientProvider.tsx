"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

let warned = false;

/**
 * Jedan Convex klijent za ceo sajt. Bez `NEXT_PUBLIC_CONVEX_URL` (npr. env nije
 * postavljen na Vercelu) renderuje decu bez provider-a — sekcije koje zavise od
 * backenda tada prikazuju svoj fallback, ostatak sajta radi normalno.
 * `ConvexAuthProvider` drži sesiju (ADR-003): bez njega token nikad ne ide
 * uz zahteve, pa bi svaki `ctx.auth` na serveru video gosta.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client] = useState<ConvexReactClient | null>(() => {
    if (!convexUrl) {
      if (!warned) {
        warned = true;
        console.warn("NEXT_PUBLIC_CONVEX_URL nije postavljen — sajt radi bez Convex provider-a.");
      }
      return null;
    }
    return new ConvexReactClient(convexUrl);
  });

  if (!client) return <>{children}</>;
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
