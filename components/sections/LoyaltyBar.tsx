"use client";

import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { Gift, X } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { formatPercent } from "@/lib/format";
import { site } from "@/lib/site";
import { useMounted } from "@/lib/useMounted";

/**
 * Poziv na loyalty program (docs/BRAND.md §7, tačka 3) — traka u toku strane,
 * na landingu i u korpi. NIJE modal i ne pokriva ekran: pojavljuje se tamo gde
 * kupac ionako gleda, i može da se zatvori.
 *
 * Pravila (skill `popups`):
 *  - vidi je samo neulogovan gost; članu bismo nudili ono što već ima
 *  - „Ne sada" se pamti 30 dana u `localStorage`, pa ne dočekuje na svakoj strani
 *  - zatvaranje je dugme od 44 px sa pravim natpisom, ne sivi „×" u uglu
 *
 * Kad `NEXT_PUBLIC_CONVEX_URL` nije postavljen nema ni auth provider-a, pa se
 * `useConvexAuth` ne sme pozvati. Zato su ovo dve komponente, a ne jedan
 * uslovni hook.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
const DISMISS_KEY = "bbm.loyalty-traka.v1";
const DISMISS_DAYS = 30;

function isDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    if (!Number.isFinite(at) || at <= 0) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function Bar({ bare }: { bare: boolean }) {
  // Do hidratacije se traka ne crta — inače bi na serveru bila tu, a odmah
  // zatim nestala kod svakoga ko ju je već zatvorio.
  const mounted = useMounted();
  const [closedNow, setClosedNow] = useState(false);

  if (!mounted || closedNow || isDismissed()) return null;

  const dismiss = () => {
    setClosedNow(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Privatni režim: traka ostaje zatvorena samo do sledećeg učitavanja.
    }
  };

  return (
    <Reveal as="aside" className={bare ? "w-full" : "mx-auto w-full max-w-content px-5 md:px-8"}>
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
        <div className="flex shrink-0 items-center gap-1">
          <Button as="a" href="/nalog">
            Registrujte se
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Sakrij poziv na loyalty program"
            className="inline-flex size-11 items-center justify-center rounded-pill text-fg-muted transition-colors hover:bg-bg-elev hover:text-fg focus-ring"
          >
            <X size={18} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </Reveal>
  );
}

function BarForGuests({ bare }: { bare: boolean }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading || isAuthenticated) return null;
  return <Bar bare={bare} />;
}

/** `bare` = traka je već unutar omotača sa marginama (korpa), pa ne nosi svoje. */
export function LoyaltyBar({ bare = false }: { bare?: boolean } = {}) {
  if (!HAS_BACKEND) return <Bar bare={bare} />;
  return <BarForGuests bare={bare} />;
}
