"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sheet } from "@/components/ui/Sheet";
import { MORE_ICON, type TabDef, type TabId } from "./tabs";

/**
 * Navigacija panela.
 *
 * Telefon: donja traka sa pet dodira — četiri taba i „Još“. Palac je dole, pa je
 * i navigacija dole. Traka poštuje `safe-area` da je ivica ekrana ne pojede.
 * Desktop (lg+): leva kolona, aktivan tab je mint pilula koja klizi (`layoutId`).
 */

export type Badges = { pending: number; newOrders: number; newMessages: number };

function badgeCount(tab: TabDef, badges: Badges): number {
  if (!tab.badge) return 0;
  return badges[tab.badge];
}

function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="num inline-flex min-w-5 items-center justify-center rounded-pill bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-paper">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AdminSidebar({
  tabs,
  active,
  badges,
  onSelect,
}: {
  tabs: readonly TabDef[];
  active: TabId;
  badges: Badges;
  onSelect: (id: TabId) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <nav aria-label="Sekcije panela" className="hidden w-60 shrink-0 lg:block">
      <ul className="sticky top-6 flex flex-col gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          const n = badgeCount(tab, badges);
          return (
            <li key={tab.id}>
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => onSelect(tab.id)}
                className="relative flex min-h-11 w-full items-center gap-3 rounded-pill px-4 text-left focus-ring"
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-pill"
                    transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.3 }}
                    className="absolute inset-0 rounded-pill bg-tint"
                  />
                )}
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden
                  className={["relative shrink-0", isActive ? "text-fg" : "text-fg-muted"].join(" ")}
                />
                <span
                  className={[
                    "relative flex-1 text-body-sm font-semibold",
                    isActive ? "text-fg" : "text-fg-muted",
                  ].join(" ")}
                >
                  {tab.label}
                </span>
                <span className="relative">
                  <Count n={n} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AdminBottomBar({
  tabs,
  active,
  badges,
  onSelect,
}: {
  tabs: readonly TabDef[];
  active: TabId;
  badges: Badges;
  onSelect: (id: TabId) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const reduced = useReducedMotion();

  // Četiri u traci, ostatak iza „Još“. Kad ih ukupno ima pet ili manje (radnica),
  // sve staju i „Još“ se ne prikazuje.
  const inBar = tabs.length <= 5 ? tabs : tabs.slice(0, 4);
  const inMore = tabs.length <= 5 ? [] : tabs.slice(4);
  const moreBadge = inMore.reduce((sum, t) => sum + badgeCount(t, badges), 0);
  const moreActive = inMore.some((t) => t.id === active);
  const More = MORE_ICON;

  const item =
    "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 focus-ring";

  return (
    <>
      <nav
        aria-label="Sekcije panela"
        className="glass fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto flex max-w-lg items-stretch">
          {inBar.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            const n = badgeCount(tab, badges);
            return (
              <li key={tab.id} className="flex flex-1">
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onSelect(tab.id)}
                  className={item}
                >
                  <span className="relative">
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      aria-hidden
                      className={isActive ? "text-fg" : "text-fg-muted"}
                    />
                    {n > 0 && (
                      <span className="absolute -right-2.5 -top-1.5">
                        <Count n={n} />
                      </span>
                    )}
                  </span>
                  <span
                    className={[
                      "text-[11px] font-semibold leading-none",
                      isActive ? "text-fg" : "text-fg-muted",
                    ].join(" ")}
                  >
                    {tab.short ?? tab.label}
                  </span>
                  {isActive && (
                    <motion.span
                      layoutId="admin-bottom-pill"
                      transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.3 }}
                      className="absolute inset-x-3 top-0 h-0.5 rounded-pill bg-brand"
                    />
                  )}
                </button>
              </li>
            );
          })}

          {inMore.length > 0 && (
            <li className="flex flex-1">
              <button type="button" onClick={() => setMoreOpen(true)} className={item} aria-haspopup="dialog">
                <span className="relative">
                  <More
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden
                    className={moreActive ? "text-fg" : "text-fg-muted"}
                  />
                  {moreBadge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5">
                      <Count n={moreBadge} />
                    </span>
                  )}
                </span>
                <span
                  className={[
                    "text-[11px] font-semibold leading-none",
                    moreActive ? "text-fg" : "text-fg-muted",
                  ].join(" ")}
                >
                  Još
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Još">
        <ul className="-mx-2 flex flex-col pb-2">
          {inMore.map((tab) => {
            const Icon = tab.icon;
            const n = badgeCount(tab, badges);
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(tab.id);
                    setMoreOpen(false);
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-sm px-2 text-left transition-colors duration-150 hover:bg-bg-sunken focus-ring"
                >
                  <Icon size={20} strokeWidth={1.75} aria-hidden className="shrink-0 text-fg-muted" />
                  <span className="flex-1 text-body font-semibold text-fg">{tab.label}</span>
                  <Count n={n} />
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
}
