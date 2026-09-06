"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cartStore";
import { formatRsd } from "@/lib/format";
import { MAX_QTY_PER_LINE } from "@/lib/shop";

/**
 * Cena kao pilula sa brzim dodavanjem u korpu — ostrvo ispod svake kartice
 * proizvoda (spec 15). Kartica ostaje serverska; dugmad ne smeju u `<Link>`
 * (nevalidan HTML, klik bi navigirao), pa je ovo zaseban klijentski čvor.
 *
 * Pilula je STALNO mint (`bg-brand text-brand-fg`). CSS grid `0fr auto 0fr` →
 * `1fr auto 1fr` širi je simetrično oko centra i otkriva „−" levo i „+" desno,
 * bez merenja (docs/MOTION.md nije dirnut — pilula je `data-reveal="off"`).
 *
 * Prošireno = hover ∨ focus-within ∨ qty > 0 ∨ uređaj bez hovera (touch: uvek).
 * Klik „+" ODMAH dodaje 1 (bez potvrde); „−" skida jedan, na 0 uklanja liniju.
 * Korpa nosi samo `slug` + `qty` — cena se ovde samo prikazuje (`orders.quote`).
 */

/** Jedan `aria-live` region za ceo sajt: promena kolicine se objavljuje jednom. */
let liveRegion: HTMLElement | null = null;
function announce(message: string): void {
  if (typeof document === "undefined") return;
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    document.body.appendChild(liveRegion);
  }
  const el = liveRegion;
  el.textContent = "";
  // Prazan pa popunjen u sledećem frejmu — čitač prijavi i istu poruku dvaput zaredom.
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Uređaj bez hovera (touch) — pilula je tada uvek proširena. Prati i promenu (docking). */
function subscribeCoarse(cb: () => void): () => void {
  const mq = window.matchMedia("(hover: none)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const coarseSnapshot = () => window.matchMedia("(hover: none)").matches;

export type CartPillProps = {
  slug: string;
  name: string;
  /** Katalog cena jednog komada (precrtana ako ima popust). */
  basePriceRsd: number;
  /** Cena posle popusta; jednaka bazi kad popusta nema. */
  finalPriceRsd: number;
  inStock: boolean;
  /** Kompaktna varijanta (landing `ShopHighlights`) — manja dugmad na desktopu. */
  compact?: boolean;
  className?: string;
};

export function CartPill({
  slug,
  name,
  basePriceRsd,
  finalPriceRsd,
  inStock,
  compact = false,
  className,
}: CartPillProps) {
  const { items, hydrated, add, decrement } = useCart();
  const qty = items.find((i) => i.slug === slug)?.qty ?? 0;

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const coarse = useSyncExternalStore(subscribeCoarse, coarseSnapshot, () => false);
  // `ready` gasi tranziciju širenja na prvom kadru (touch bi inače „skočio" pri hidrataciji).
  const [ready, setReady] = useState(false);

  // Crossfade brojke: `anim` (0 = početni kadar, bez animacije) forsira remount ulazne
  // brojke, `exit` drži staru vrednost dok izlazi. Vozi ih klik, ne efekat.
  const [anim, setAnim] = useState(0);
  const [exitQty, setExitQty] = useState<number | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLSpanElement>(null);
  const collapseTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(raf);
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, []);

  const discounted = finalPriceRsd < basePriceRsd;
  const expanded = hydrated && inStock && (hovered || focused || qty > 0 || coarse);

  const enter = () => {
    if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
    setHovered(true);
  };
  const leave = () => {
    // Zadrška pri izlasku uz qty 0 — da ne treperi između kapi i pilule.
    if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
    collapseTimer.current = window.setTimeout(() => setHovered(false), 120);
  };

  const bumpCenter = () => {
    const el = centerRef.current;
    if (!el || prefersReducedMotion()) return;
    el.classList.remove("cart-pill-bump");
    void el.offsetWidth; // restart animacije
    el.classList.add("cart-pill-bump");
  };

  const shake = () => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;
    el.classList.remove("cart-pill-shake");
    void el.offsetWidth;
    el.classList.add("cart-pill-shake");
  };

  const crossfadeFrom = useCallback((fromQty: number) => {
    if (prefersReducedMotion()) return;
    setExitQty(fromQty);
    setAnim((n) => n + 1);
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    exitTimer.current = window.setTimeout(() => setExitQty(null), 170);
  }, []);

  const onAdd = () => {
    if (qty >= MAX_QTY_PER_LINE) {
      shake();
      return;
    }
    crossfadeFrom(qty);
    add(slug, 1);
    bumpCenter();
    announce(`${name}: ${qty + 1} u korpi`);
  };

  const onRemove = () => {
    if (qty <= 0) return;
    crossfadeFrom(qty);
    decrement(slug);
    bumpCenter();
    announce(qty - 1 === 0 ? `${name} uklonjen iz korpe` : `${name}: ${qty - 1} u korpi`);
  };

  // Rasprodato: neutralna pilula, bez „+". Ako je proizvod već u korpi — samo „−".
  const soldOut = hydrated && !inStock;
  const btnSize = compact ? "size-11 can-hover:size-8" : "size-11 can-hover:size-9";
  const iconSize = 16;

  const renderPrice = (q: number) => (
    <>
      {q > 0 ? <span className="num">{q} × </span> : null}
      <span className="num font-semibold">{formatRsd(finalPriceRsd)}</span>
      {discounted ? (
        <s className="num ml-1 text-[0.85em] opacity-70">{formatRsd(basePriceRsd)}</s>
      ) : null}
    </>
  );

  if (soldOut) {
    return (
      <div
        data-reveal="off"
        className={[
          "inline-flex items-center gap-2 rounded-pill border border-line bg-bg-elev px-3 py-1.5 text-sm text-fg-muted",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {qty > 0 ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Ukloni jedan ${name}`}
            className={`inline-flex ${btnSize} items-center justify-center rounded-pill text-fg-muted transition-colors hover:bg-bg-sunken focus-ring`}
          >
            <Minus size={iconSize} strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
        <span>Rasprodato{qty > 0 ? ` · ${qty} u korpi` : ""}</span>
      </div>
    );
  }

  const minusDisabled = qty <= 0;
  const plusDisabled = qty >= MAX_QTY_PER_LINE;

  return (
    <div
      ref={rootRef}
      data-reveal="off"
      data-expanded={expanded}
      data-ready={ready ? "" : undefined}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={[
        "cart-pill rounded-pill text-xs md:text-sm",
        compact ? "cart-pill-compact" : "",
        // Boja tamni SAMO na stvarni hover; qty>0 / fokus / dodir šire traku ali ostaju mint.
        hovered ? "bg-brand-hover text-brand-hover-fg" : "bg-brand text-brand-fg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="cart-pill-side cart-pill-side-left">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Ukloni jedan ${name}`}
          aria-disabled={minusDisabled}
          className={[
            `inline-flex shrink-0 ${btnSize} items-center justify-center rounded-pill transition-colors focus-ring`,
            "hover:bg-black/10",
            minusDisabled ? "cursor-default opacity-40" : "",
          ].join(" ")}
        >
          <Minus size={iconSize} strokeWidth={1.75} aria-hidden />
        </button>
      </span>

      <span ref={centerRef} className="cart-pill-center px-3 py-1.5">
        <span key={anim} className={`cart-pill-num${anim > 0 ? " cart-pill-num-in" : ""}`}>
          {renderPrice(qty)}
        </span>
        {exitQty !== null ? (
          <span className="cart-pill-num cart-pill-num-out" aria-hidden>
            {renderPrice(exitQty)}
          </span>
        ) : null}
      </span>

      <span className="cart-pill-side cart-pill-side-right">
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Dodaj ${name} u korpu`}
          aria-disabled={plusDisabled}
          className={[
            `inline-flex shrink-0 ${btnSize} items-center justify-center rounded-pill transition-colors focus-ring`,
            "hover:bg-black/10",
            plusDisabled ? "cursor-default opacity-40" : "",
          ].join(" ")}
        >
          <Plus size={iconSize} strokeWidth={1.75} aria-hidden />
        </button>
      </span>
    </div>
  );
}
