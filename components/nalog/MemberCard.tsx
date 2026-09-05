"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Logo } from "@/components/brand/Logo";
import { QrCode } from "@/components/ui/QrCode";
import { Badge } from "@/components/ui/Badge";
import { formatPercent } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Članska kartica. Ovo se pokazuje radnici u salonu, sa telefona, često pod
 * lošim svetlom — zato je krupno, uspravno i sa QR kodom na beloj podlozi bez
 * ijednog ukrasa preko njega.
 *
 * U QR kodu je ISKLJUČIVO broj kartice (ADR-004, `loyalty.myCard.qrValue`).
 * Nema imena, imejla ni telefona: skeniran ekran ne sme da oda ništa lično.
 *
 * Broj je ispisan i slovima ispod koda — kad kamera ne uhvati, radnica ga
 * ukuca u pretragu članova.
 */

const REASON_TEXT = {
  "prva-poseta": "Popust vas čeka na prvom računu.",
  "posle-posete": "Popust je aktivan i troši se na sledećem računu.",
  iskoriscen: "Popust je iskorišćen. Novo pravo stičete posle sledeće plaćene posete.",
  "nije-clan": "Ovaj nalog nije loyalty član.",
} as const;

/** „BM123456" se čita lakše kao „BM 123 456". */
function prettyNumber(value: string): string {
  const digits = value.replace(/^BM/i, "");
  return `BM ${digits.slice(0, 3)} ${digits.slice(3)}`.trim();
}

export function MemberCard() {
  const card = useQuery(api.loyalty.myCard, {});

  if (card === undefined) {
    return (
      <div className="h-96 animate-pulse rounded-lg border border-line bg-bg-sunken motion-reduce:animate-none" />
    );
  }
  if (!card.loyaltyNumber || !card.qrValue) {
    return (
      <div className="rounded-lg border border-line bg-bg-elev p-6">
        <p className="text-sm text-fg-muted">
          Ovom nalogu još nije dodeljen broj kartice. Osvežite stranu ili pozovite {site.phone.display}.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Članska kartica"
      data-reveal="off"
      className="overflow-hidden rounded-lg border border-line bg-bg-elev shadow-card"
    >
      <header className="flex items-center justify-between gap-3 bg-mint px-5 py-4">
        <Logo variant="mark" size={36} decorative />
        <p className="text-overline text-ink">Članska kartica</p>
      </header>

      <div className="flex flex-col items-center gap-5 px-5 py-7">
        <div className="rounded-md bg-white p-3 shadow-card">
          <QrCode value={card.qrValue} label={`QR kod članske kartice ${card.loyaltyNumber}`} size={168} />
        </div>

        <p className="num text-center text-h2 tracking-[0.12em] text-fg">{prettyNumber(card.loyaltyNumber)}</p>

        <Badge tone={card.eligible ? "success" : "neutral"} dot>
          {card.eligible ? `Popust ${formatPercent(card.discountPercent)} je aktivan` : "Popust nije aktivan"}
        </Badge>

        <p className="max-w-xs text-center text-sm text-fg-muted">{REASON_TEXT[card.reason]}</p>
      </div>

      <footer className="border-t border-line px-5 py-4">
        <p className="text-caption text-fg-muted">
          Pokažite ovaj kod na naplati u salonu. Isti popust ulazi i u zbir korpe na sajtu, čim se prijavite.
        </p>
      </footer>
    </section>
  );
}
