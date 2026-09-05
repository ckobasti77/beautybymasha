"use client";

import { useState } from "react";
import { LogoSignature, forgetLogoDrawn } from "@/components/brand/LogoSignature";
import { Button } from "@/components/ui/Button";

/** Kontrolna tabla: ponovo pusti ispis rukopisa (briše sesijski ključ i remontira logo). */
export function LogoReplay() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-6">
      <LogoSignature key={run} variant="wordmark" size="100%" className="block w-full max-w-[420px] text-fg" />
      <Button
        variant="ghost"
        magnetic={false}
        onClick={() => {
          forgetLogoDrawn();
          setRun((n) => n + 1);
        }}
      >
        Ispiši ponovo
      </Button>
    </div>
  );
}
