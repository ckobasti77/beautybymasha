import {
  CalendarDays,
  Clock,
  Images,
  Inbox,
  LayoutGrid,
  Mail,
  Package,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Dvanaest tabova iz docs/ADMIN.md, redom kojim se koriste — ne redom kojim su
 * napisani. Prva četiri nose posao, zato su prva.
 *
 * `staff: true` znači da ga vidi i radnica (docs/ADMIN.md → Pristup): Danas,
 * Zahtevi, Kalendar i Loyalty. Promet, proizvodi i podešavanja su samo vlasničini.
 */

export type TabId =
  | "danas"
  | "zahtevi"
  | "kalendar"
  | "proizvodi"
  | "porudzbine"
  | "loyalty"
  | "radno-vreme"
  | "usluge"
  | "kapacitet"
  | "galerija"
  | "poruke"
  | "podesavanja";

export type TabDef = {
  id: TabId;
  label: string;
  /** Kraća reč za donju traku na 390 px. */
  short?: string;
  icon: LucideIcon;
  staff: boolean;
  badge?: "pending" | "newOrders" | "newMessages";
};

export const TABS: readonly TabDef[] = [
  { id: "danas", label: "Danas", icon: Sun, staff: true },
  { id: "zahtevi", label: "Zahtevi", icon: Inbox, staff: true, badge: "pending" },
  { id: "kalendar", label: "Kalendar", icon: CalendarDays, staff: true },
  { id: "proizvodi", label: "Proizvodi", short: "Shop", icon: Package, staff: false },
  { id: "porudzbine", label: "Porudžbine", icon: ShoppingBag, staff: false, badge: "newOrders" },
  { id: "loyalty", label: "Loyalty", icon: Sparkles, staff: true },
  { id: "radno-vreme", label: "Radno vreme", icon: Clock, staff: false },
  { id: "usluge", label: "Usluge", icon: ScrollText, staff: false },
  { id: "kapacitet", label: "Kapacitet", icon: Users, staff: false },
  { id: "galerija", label: "Galerija", icon: Images, staff: false },
  { id: "poruke", label: "Poruke", icon: Mail, staff: false, badge: "newMessages" },
  { id: "podesavanja", label: "Podešavanja", icon: Settings, staff: false },
];

export const MORE_ICON = LayoutGrid;

export function isTabId(value: string): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function visibleTabs(isAdmin: boolean): readonly TabDef[] {
  return isAdmin ? TABS : TABS.filter((t) => t.staff);
}
