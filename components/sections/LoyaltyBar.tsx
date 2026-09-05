"use client";

import { useConvexAuth } from "convex/react";
import { Gift } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { formatPercent } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Traka za loyalty popust (docs/BRAND.md §7, tačka 3). Vidi je samo neulogovani gost —
 * ulogovanom bi nudila ono što već ima.
 *
 * Kad `NEXT_PUBLIC_CONVEX_URL` nije postavljen, nema ni auth provider-a, pa se
 * `useConvexAuth` ne sme pozvati. Zato su to dve komponente, a ne jedan uslovni hook.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

function Bar() {
  return (
    <Reveal as="aside" className="mx-auto w-full max-w-content px-5 md:px-8">
      <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-accent-soft p-5 md:flex-row md:items-center md:p-6">
        <span
          aria-hidden
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-pill bg-bg-elev text-accent"
        >
          <Gift size={20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-fg">
            Registrujte se i ostvarite {formatPercent(site.loyalty.discountPercent)} popusta na sledeći račun.
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            Popust važi i na usluge u salonu i na porudžbine sa sajta. Trošite ga jednom, kad vam odgovara.
          </p>
        </div>
        <Button as="a" href="/nalog" className="shrink-0">
          Registrujte se
        </Button>
      </div>
    </Reveal>
  );
}

function BarForGuests() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading || isAuthenticated) return null;
  return <Bar />;
}

export function LoyaltyBar() {
  if (!HAS_BACKEND) return <Bar />;
  return <BarForGuests />;
}
