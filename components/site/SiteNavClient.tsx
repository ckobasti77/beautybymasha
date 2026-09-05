"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Phone, ShoppingBag, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useOptionalLenis } from "@/components/providers/SmoothScroll";
import { FacebookIcon, InstagramIcon } from "@/components/site/SocialIcons";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useCart } from "@/lib/cartStore";
import { EASE_ENTER, gsap, useGSAP } from "@/lib/gsap";
import { locations, site } from "@/lib/site";

/**
 * Navigacija — klijentski deo (server omotač je `SiteNav.tsx`).
 *
 * Podloga: dok je hero u kadru traka je providna preko shadera; kad prođe 85 % heroja
 * (spec 12 → I) ili na svakoj strani bez heroja (`alwaysSolid`) traka dobija `nav-frost`
 * (82 % podloge + blur + linija ispod). Frost nosi UNUTRAŠNJA traka, ne `<nav>` —
 * `backdrop-filter` na pretku bi zarobio `position: fixed` panel menija u visinu trake.
 *
 * `#nav-logo-slot` je uvek u DOM-u; na landingu je `opacity: 0` dok hero wordmark ne doputuje
 * do njega (scrub u `components/hero/Hero.tsx` vozi opacity inline, ≥ 1024 px). Ispod toga
 * i uz reduced-motion logo se pojavi klasom kad hero prođe — isti `frost` signal.
 *
 * Mobilni meni (korak 12, ispočetka): pun ekran, NEPROVIDNA paper podloga — ispod je shader,
 * glass bi bio nečitljiv. Ulaz GSAP (podloga klizi odozgo 320 ms, stavke stagger 45 ms
 * odozdo), izlaz 150 ms opacity (DNA exit_pattern). Body je zaključan dok je otvoren
 * (overflow + Lenis stop). Meni je chrome: `data-reveal="off"`, ništa ne ulazi reč po reč.
 *
 * `<nav>` je u `skipSelector`-u text-reveal sistema — čitljiv istog trenutka kad se pojavi.
 */

/*
 * Putanje su apsolutne (`/#usluge`, ne `#usluge`) jer ista navigacija stoji i na
 * `/shop`, `/korpa` i `/nalog` — tamo sidra ne postoje, pa mora prvo da se ode
 * na landing. Na samom landingu preglednik ovo i dalje vidi kao skok na sidro.
 */
type NavLink = { href: string; label: string; count?: "services" | "products" };

const LINKS: readonly NavLink[] = [
  { href: "/#usluge", label: "Usluge" },
  { href: "/#cenovnik", label: "Cenovnik", count: "services" },
  { href: "/shop", label: "Shop", count: "products" },
  { href: "/#lokacije", label: "Lokacije" },
  { href: "/#kontakt", label: "Kontakt" },
];

/*
 * Bez `display` klase: ko je koristi, sam kaže `inline-flex` ili `hidden lg:inline-flex`.
 * Da je `inline-flex` ovde, pobedio bi `hidden` na ikoni naloga i na 390 px bi cela desna
 * grupa (uz „Zakažite" i dugme menija) izašla iz trake.
 */
const ICON_LINK =
  "min-h-11 min-w-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken hover:text-fg focus-ring";

const FOCUSABLE =
  'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Koliki deo heroja sme da ostane u kadru pre nego što traka dobije podlogu. */
const HERO_LEFT_RATIO = 0.15;

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
      className={`relative inline-flex ${ICON_LINK}`}
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
 * Frosted podloga se pali kad od `#hero` u kadru ostane manje od 15 % (= 85 % prošlo,
 * spec 12 → I), nezavisno od GSAP-a — radi i na 390 px i uz reduced-motion. Strane bez
 * heroja (`/shop`, `/nalog`) prosleđuju `alwaysSolid` — tamo se ništa ne posmatra.
 */
function useHeroPassed(alwaysSolid: boolean): boolean {
  const [passed, setPassed] = useState(alwaysSolid);

  useEffect(() => {
    if (alwaysSolid) return;
    const hero = document.getElementById("hero");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setPassed(entry.intersectionRatio < HERO_LEFT_RATIO),
      { threshold: [0, HERO_LEFT_RATIO] },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [alwaysSolid]);

  return passed;
}

/** Dve linije → X. Čist CSS transform na dva spana, 300 ms; 44×44 dodirna zona. */
function MenuButton({
  open,
  onClick,
  ref,
}: {
  open: boolean;
  onClick: () => void;
  ref: RefObject<HTMLButtonElement | null>;
}) {
  const line = "absolute left-0 h-0.5 w-5 rounded-pill bg-current transition-transform duration-300 ease-out-expo";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="nav-mobile"
      aria-label={open ? "Zatvori meni" : "Otvori meni"}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-fg transition-colors duration-150 hover:bg-bg-sunken focus-ring lg:hidden"
    >
      <span aria-hidden className="relative block h-4 w-5">
        <span className={`${line} top-[3px] ${open ? "translate-y-1 rotate-45" : ""}`} />
        <span className={`${line} top-[11px] ${open ? "-translate-y-1 -rotate-45" : ""}`} />
      </span>
    </button>
  );
}

export function SiteNavClient({
  alwaysSolid = false,
  counts,
}: {
  alwaysSolid?: boolean;
  /** Broj stavki cenovnika i proizvoda — izbrojano na serveru (`SiteNav.tsx`). */
  counts: { services: number; products: number };
}) {
  const frost = useHeroPassed(alwaysSolid);
  const navRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const lenis = useOptionalLenis();
  const pathname = usePathname();

  /*
   * Meni pamti NA KOJOJ ruti je otvoren: promena rute (klik, back/forward) ga zatvara
   * sama od sebe, bez efekta koji bi zvao setState (pravilo React compiler-a).
   */
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === pathname;
  const setOpen = (next: boolean) => setOpenOn(next ? pathname : null);

  /* ---- dok je otvoren: Escape, hash, širina ≥ 1024, zaključan skrol, fokus, Tab u krugu ---- */
  useEffect(() => {
    if (!open) return;
    const nav = navRef.current;
    const panel = panelRef.current;
    const toggle = toggleRef.current;

    const close = () => setOpenOn(null);
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => {
      if (wide.matches) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !nav) return;
      const items = [...nav.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", close);
    wide.addEventListener("change", onWide);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const smooth = lenis?.current ?? null;
    smooth?.stop();

    const raf = requestAnimationFrame(() => {
      panel?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", close);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = prevOverflow;
      smooth?.start();
      // Fokus nazad na dugme samo ako je bio u meniju (ne krasti ga posle promene rute).
      if (panel && document.activeElement && panel.contains(document.activeElement)) {
        toggle?.focus({ preventScroll: true });
      }
    };
  }, [open, lenis]);

  /* ---- ulaz/izlaz panela: GSAP, ne text-reveal (meni je chrome) ----
   *
   * `hidden` se skida pre ulaza i vraća tek posle izlaznog fade-a — Tailwind preflight
   * daje `[hidden] { display: none !important }`, pa bi ranije skidanje presekло animaciju.
   * `useGSAP` sa `dependencies` ne revertuje kontekst na promenu (samo pri unmount-u),
   * pa otvaranje i zatvaranje žive u istom kontekstu i čiste se zajedno.
   */
  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-menu-item]", panel);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.killTweensOf([panel, ...items]);

      if (open) {
        panel.hidden = false;
        if (reduced) {
          gsap.set([panel, ...items], { clearProps: "all" });
          return;
        }
        gsap
          .timeline()
          .fromTo(panel, { yPercent: -100, opacity: 1 }, { yPercent: 0, duration: 0.32, ease: EASE_ENTER }, 0)
          .fromTo(
            items,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: EASE_ENTER, stagger: 0.045 },
            0.12,
          );
        return;
      }

      if (panel.hidden) return;
      if (reduced) {
        panel.hidden = true;
        return;
      }
      gsap.to(panel, {
        opacity: 0,
        duration: 0.15,
        ease: "power1.in",
        onComplete: () => {
          panel.hidden = true;
          gsap.set([panel, ...items], { clearProps: "all" });
        },
      });
    },
    { scope: navRef, dependencies: [open] },
  );

  const close = () => setOpen(false);
  const countOf = (link: NavLink) => (link.count ? counts[link.count] : null);

  return (
    <nav ref={navRef} aria-label="Glavna navigacija" className="fixed inset-x-0 top-0 z-40">
      {/* Traka — iznad panela; frost nosi ona, ne <nav> (vidi zaglavlje fajla). */}
      <div
        className={[
          "relative z-10 transition-[background-color,border-color,box-shadow] duration-300",
          frost ? "nav-frost shadow-card" : "border-b border-transparent bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex h-16 w-full max-w-content items-center gap-3 px-4 md:h-20 md:px-8">
          <Link
            href="/#hero"
            id="nav-logo-slot"
            aria-label={`${site.name} — na vrh strane`}
            className={[
              "inline-flex shrink-0 items-center rounded-pill focus-ring transition-opacity duration-300",
              // Na landingu ≥ 1024 px inline opacity vozi hero scrub (pobeđuje klasu);
              // inače se logo pojavi ovom klasom kad hero prođe. Bez heroja: vidljiv od početka.
              frost ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {/* <400 px: mali krug (wordmark ne bi bio čitljiv). Inače horizontalni wordmark
                visine ~30 px. Visina nav trake se NE menja (h-16/h-20). */}
            <Logo variant="mark" size={44} decorative className="min-[400px]:hidden" />
            <Logo variant="wordmark" size={88} decorative className="hidden text-fg min-[400px]:block" />
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
            <a href={site.phone.href} aria-label={`Pozovite ${site.phone.display}`} className={`inline-flex ${ICON_LINK}`}>
              <Phone size={20} strokeWidth={1.5} aria-hidden />
            </a>
            <ThemeToggle />
            <CartLink />
            <Link
              href="/nalog"
              aria-label="Moj nalog"
              // Ikona korpe je stalno tu, nalog tek od lg — na 390 px inače nema
              // mesta za dugme za meni. „Moj nalog" stoji u mobilnom meniju.
              className={`hidden lg:inline-flex ${ICON_LINK}`}
            >
              <User size={20} strokeWidth={1.5} aria-hidden />
            </Link>
            <Button as="a" href="/#zakazivanje" className="ml-1 hidden sm:inline-flex" magnetic={false}>
              Zakažite
            </Button>
            <MenuButton ref={toggleRef} open={open} onClick={() => setOpen(!open)} />
          </div>
        </div>
      </div>

      {/*
        Pun-ekran panel ispod trake (z-0 u istom stacking context-u kao traka z-10):
        `fixed inset-0` se meri od viewporta jer <nav> nema transform/filter. Neprovidna
        podloga teme; kad je traka providna (hero), kroz nju se vidi upravo ova podloga.
      */}
      <div
        id="nav-mobile"
        ref={panelRef}
        hidden
        data-reveal="off"
        data-lenis-prevent
        className="fixed inset-0 z-0 overflow-y-auto bg-bg lg:hidden"
      >
        <div className="mx-auto flex min-h-full w-full max-w-content flex-col px-5 pb-8 pt-20 md:px-8 md:pt-24">
          <ul className="flex flex-col">
            {LINKS.map((l) => {
              const n = countOf(l);
              return (
                <li key={l.href} data-menu-item>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="flex min-h-14 items-center gap-3 border-b border-line py-2 font-display text-[28px] font-bold leading-none tracking-tight text-fg [font-variation-settings:'wdth'_90] focus-ring"
                  >
                    {l.label}
                    {n !== null ? (
                      <span className="num font-sans text-base font-medium tracking-normal text-fg-muted">{n}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div data-menu-item className="mt-6 flex flex-col gap-2">
            <Button as="a" href="/#zakazivanje" size="lg" magnetic={false} onClick={close} className="w-full">
              Zakažite termin
            </Button>
            <div className="flex gap-2">
              <Link
                href="/korpa"
                onClick={close}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill border border-line text-sm font-semibold text-fg transition-colors duration-150 hover:bg-bg-elev focus-ring"
              >
                <ShoppingBag size={18} strokeWidth={1.5} aria-hidden />
                Korpa
              </Link>
              <Link
                href="/nalog"
                onClick={close}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-pill border border-line text-sm font-semibold text-fg transition-colors duration-150 hover:bg-bg-elev focus-ring"
              >
                <User size={18} strokeWidth={1.5} aria-hidden />
                Moj nalog
              </Link>
            </div>
          </div>

          <div data-menu-item className="mt-auto pt-10">
            <p className="text-overline text-fg-muted">Pozovite</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {locations.map((l) => (
                <a
                  key={l.key}
                  href={l.phone.href}
                  className="flex min-h-14 flex-col items-start justify-center rounded-md border border-line bg-bg-elev px-4 py-2 text-fg transition-colors duration-150 hover:border-line-strong focus-ring"
                >
                  <span className="text-sm font-semibold">{l.name}</span>
                  <span className="num text-sm text-fg-muted">{l.phone.display}</span>
                </a>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className={`inline-flex ${ICON_LINK}`}
                >
                  <InstagramIcon />
                </a>
                <a
                  href={site.social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className={`inline-flex ${ICON_LINK}`}
                >
                  <FacebookIcon />
                </a>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
