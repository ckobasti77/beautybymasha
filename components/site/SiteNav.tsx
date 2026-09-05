"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "@/lib/cartStore";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { site } from "@/lib/site";

/**
 * Lepljiva navigacija (docs/BRAND.md §7). Frosted podlogu dobija tek kad hero izađe
 * iz kadra (docs/MOTION.md → Hero, tačka 4) — dok je hero na ekranu, nav lebdi nad
 * shaderom bez pozadine.
 *
 * `#nav-logo-slot` je odredište GSAP Flip-a iz `components/hero/Hero.tsx`: na desktopu
 * hero wordmark sleti ovde i tek tada se logo pojavi. Bez JS-a (ili na mobilnom) logo
 * je vidljiv od početka, pa navigacija nikad nije prazna.
 *
 * `<nav>` je u `skipSelector`-u text-reveal sistema — chrome mora da bude čitljiv
 * istog trenutka kad se pojavi.
 */

/*
 * Putanje su apsolutne (`/#usluge`, ne `#usluge`) jer ista navigacija stoji i na
 * `/shop`, `/korpa` i `/nalog` — tamo sidra ne postoje, pa mora prvo da se ode
 * na landing. Na samom landingu preglednik ovo i dalje vidi kao skok na sidro.
 */
const LINKS = [
  { href: "/#usluge", label: "Usluge" },
  { href: "/#cenovnik", label: "Cenovnik" },
  { href: "/shop", label: "Shop" },
  { href: "/#lokacije", label: "Lokacije" },
  { href: "/#kontakt", label: "Kontakt" },
] as const;

/**
 * Ikona korpe sa brojem stavki. Broj se ne crta dok se korpa ne pročita iz
 * `localStorage` — inače bi se server i klijent razišli na prvom renderu.
 */
function CartLink() {
  const { count, hydrated } = useCart();
  return (
    <Link
      href="/korpa"
      aria-label={hydrated && count > 0 ? `Korpa, ${count} kom` : "Korpa"}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken hover:text-fg focus-ring"
    >
      <ShoppingBag size={20} strokeWidth={1.5} aria-hidden />
      {hydrated && count > 0 ? (
        <span className="num absolute right-1 top-1 inline-flex min-w-4 justify-center rounded-pill bg-brand px-1 text-[10px] font-bold leading-4 text-brand-fg">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Frosted podloga se pali kad `#hero` izađe iz kadra. Strane bez heroja
 * (`/shop`, `/nalog`) prosleđuju `alwaysSolid` — tamo se ništa ne posmatra.
 */
function useHeroPassed(alwaysSolid: boolean): boolean {
  const [passed, setPassed] = useState(alwaysSolid);

  useEffect(() => {
    if (alwaysSolid) return;
    const hero = document.getElementById("hero");
    if (!hero) return;
    const io = new IntersectionObserver(([entry]) => setPassed(!entry.isIntersecting), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, [alwaysSolid]);

  return passed;
}

export function SiteNav({ alwaysSolid = false }: { alwaysSolid?: boolean } = {}) {
  const solid = useHeroPassed(alwaysSolid);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav
      aria-label="Glavna navigacija"
      className={[
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        solid ? "glass shadow-card" : "border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 w-full max-w-content items-center gap-3 px-4 md:h-20 md:px-8">
        <Link
          href="/#hero"
          id="nav-logo-slot"
          aria-label={`${site.name} — na vrh strane`}
          className="inline-flex shrink-0 items-center rounded-pill focus-ring"
        >
          <Logo variant="mark" size={36} decorative />
        </Link>

        <ul className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-pill px-3 text-sm font-medium text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1">
          <a
            href={site.phone.href}
            aria-label={`Pozovite ${site.phone.display}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken hover:text-fg focus-ring"
          >
            <Phone size={20} strokeWidth={1.5} aria-hidden />
          </a>
          <ThemeToggle />
          <CartLink />
          <Link
            href="/nalog"
            aria-label="Moj nalog"
            // Ikona korpe je stalno tu, nalog tek od lg — na 390 px inače nema
            // mesta za dugme za meni. „Moj nalog" stoji u mobilnom meniju.
            className="hidden min-h-11 min-w-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken hover:text-fg focus-ring lg:inline-flex"
          >
            <User size={20} strokeWidth={1.5} aria-hidden />
          </Link>
          <Button as="a" href="/#zakazivanje" className="ml-1 hidden sm:inline-flex" magnetic={false}>
            Zakažite
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="nav-mobile"
            aria-label={open ? "Zatvori meni" : "Otvori meni"}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring lg:hidden"
          >
            {open ? <X size={22} strokeWidth={1.5} aria-hidden /> : <Menu size={22} strokeWidth={1.5} aria-hidden />}
          </button>
        </div>
      </div>

      <div
        id="nav-mobile"
        ref={panelRef}
        hidden={!open}
        className="glass border-t border-line lg:hidden"
      >
        <ul className="mx-auto flex w-full max-w-content flex-col px-4 py-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-sm px-2 text-base font-medium text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/#zakazivanje"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-sm px-2 text-base font-semibold text-link focus-ring"
            >
              Zakažite termin
            </Link>
          </li>
          <li>
            <Link
              href="/korpa"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-sm px-2 text-base font-medium text-fg focus-ring"
            >
              Korpa
            </Link>
          </li>
          <li>
            <Link
              href="/nalog"
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center rounded-sm px-2 text-base font-medium text-fg focus-ring"
            >
              Moj nalog
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
