"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AdminBottomBar, AdminSidebar, type Badges } from "./AdminNav";
import { ToastHost } from "./ui";
import { isTabId, visibleTabs, type TabId } from "./tabs";
import { useAdminKey } from "./useAdminKey";

import { TodayTab } from "./tabs/TodayTab";
import { RequestsTab } from "./tabs/RequestsTab";
import { CalendarTab } from "./tabs/CalendarTab";
import { ProductsTab } from "./tabs/ProductsTab";
import { OrdersTab } from "./tabs/OrdersTab";
import { LoyaltyTab } from "./tabs/LoyaltyTab";
import { HoursTab } from "./tabs/HoursTab";
import { ServicesTab } from "./tabs/ServicesTab";
import { CapacityTab } from "./tabs/CapacityTab";
import { GalleryTab } from "./tabs/GalleryTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { SettingsTab } from "./tabs/SettingsTab";

/**
 * Ceo panel. Jedna strana, dvanaest tabova, bez podruta — tab stoji u hash-u
 * (`/admin#kalendar`) pa osvežavanje i dugme „nazad“ ostaju tamo gde je bila.
 *
 * Pristup se ne odlučuje ovde. Svaki upit i svaka izmena prolaze kroz
 * `assertAdmin` / `assertStaff` u Convex-u — panel bez uloge ne dobija podatke
 * ni kad bi neko zaobišao ovaj ekran. Ovo je samo ono što ona vidi.
 */

const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Tab živi u hash-u adrese, ne u React stanju: osvežavanje i dugme „nazad“ tako
 * ostaju tamo gde je bila. Server ne vidi hash, pa mu je „danas“ — `useSyncExternalStore`
 * to razrešava bez efekta i bez neslaganja pri hidrataciji.
 */
function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHashTab(): TabId {
  const fromHash = window.location.hash.replace(/^#/, "");
  return isTabId(fromHash) ? fromHash : "danas";
}

function useHashTab(): TabId {
  return useSyncExternalStore(subscribeToHash, readHashTab, () => "danas" as const);
}
const NO_BADGES: Badges = { pending: 0, newOrders: 0, newMessages: 0 };

export function AdminApp() {
  if (!HAS_BACKEND) return <NoBackend />;
  return <Panel />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main id="sadrzaj" data-reveal="off" className="mx-auto w-full max-w-3xl px-4 py-10">
      {children}
    </main>
  );
}

function NoBackend() {
  return (
    <Shell>
      <h1 className="text-h2 text-fg">Panel</h1>
      <p className="mt-3 text-body text-fg-muted">
        Panel ne može da se poveže sa bazom. Podesite <code className="text-fg">NEXT_PUBLIC_CONVEX_URL</code> pa
        osvežite stranu.
      </p>
    </Shell>
  );
}

function Panel() {
  const { key, setKey } = useAdminKey();
  const me = useQuery(api.admin.me, { key: key || undefined });
  const tab = useHashTab();

  const select = useCallback((next: TabId) => {
    window.location.hash = next;
    window.scrollTo({ top: 0 });
  }, []);

  if (me === undefined) {
    return (
      <Shell>
        <p className="text-body text-fg-muted">Učitavam…</p>
      </Shell>
    );
  }

  if (!me.canOpenPanel) return <Gate signedIn={me.signedIn} onKey={setKey} keyValue={key} />;

  return <SignedIn tab={tab} onSelect={select} isAdmin={me.isAdmin} keyValue={key} />;
}

function SignedIn({
  tab,
  onSelect,
  isAdmin,
  keyValue,
}: {
  tab: TabId;
  onSelect: (id: TabId) => void;
  isAdmin: boolean;
  keyValue: string;
}) {
  const adminKey = keyValue || undefined;
  const badges = useQuery(api.admin.badges, { key: adminKey }) ?? NO_BADGES;
  const tabs = visibleTabs(isAdmin);

  // Radnica koja stigne na tuđi tab (npr. iz hash-a) vidi svoj prvi.
  const active = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;

  return (
    <ToastHost>
      <div data-reveal="off" className="mx-auto flex w-full max-w-6xl gap-8 px-4 py-6 lg:px-8 lg:py-8 xl:max-w-[1500px]">
        <AdminSidebar tabs={tabs} active={active} badges={badges} onSelect={onSelect} />
        <main id="sadrzaj" className="min-w-0 flex-1 pb-24 lg:pb-8">
          <TabBody tab={active} adminKey={adminKey} isAdmin={isAdmin} />
        </main>
      </div>
      <AdminBottomBar tabs={tabs} active={active} badges={badges} onSelect={onSelect} />
    </ToastHost>
  );
}

function TabBody({ tab, adminKey, isAdmin }: { tab: TabId; adminKey?: string; isAdmin: boolean }) {
  switch (tab) {
    case "danas":
      return <TodayTab adminKey={adminKey} />;
    case "zahtevi":
      return <RequestsTab adminKey={adminKey} />;
    case "kalendar":
      return <CalendarTab adminKey={adminKey} canEditHours={isAdmin} />;
    case "proizvodi":
      return <ProductsTab adminKey={adminKey} />;
    case "porudzbine":
      return <OrdersTab adminKey={adminKey} />;
    case "loyalty":
      return <LoyaltyTab adminKey={adminKey} />;
    case "radno-vreme":
      return <HoursTab adminKey={adminKey} />;
    case "usluge":
      return <ServicesTab adminKey={adminKey} />;
    case "kapacitet":
      return <CapacityTab adminKey={adminKey} />;
    case "galerija":
      return <GalleryTab adminKey={adminKey} />;
    case "poruke":
      return <MessagesTab adminKey={adminKey} />;
    case "podesavanja":
      return <SettingsTab adminKey={adminKey} />;
  }
}

/**
 * Ulaz. Prijavljen nalog bez uloge dobija jasnu rečenicu, ne prazan ekran.
 * Polje za ključ postoji samo za prvo podizanje prazne baze — čim postoji admin
 * nalog, server ga odbija i ovde ostaje samo prijava.
 */
function Gate({
  signedIn,
  keyValue,
  onKey,
}: {
  signedIn: boolean;
  keyValue: string;
  onKey: (next: string) => void;
}) {
  const [draft, setDraft] = useState(keyValue);

  return (
    <Shell>
      <span className="text-overline text-fg-muted">Beauty by Masha</span>
      <h1 className="mt-2 text-h2 text-fg">Panel</h1>

      {signedIn ? (
        <div className="mt-6 flex flex-col items-start gap-4 rounded-md border border-line bg-bg-elev p-6 shadow-card">
          <ShieldAlert size={24} strokeWidth={1.5} aria-hidden className="text-warning-text" />
          <p className="text-body text-fg">
            Ovaj nalog nema pristup panelu. Prijavite se nalogom salona, ili zamolite vlasnicu da vam da pristup.
          </p>
          <Button as="a" href="/nalog" variant="ghost">
            Idi na prijavu
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-5 rounded-md border border-line bg-bg-elev p-6 shadow-card">
          <p className="text-body text-fg">Prijavite se nalogom salona da otvorite panel.</p>
          <Button as="a" href="/nalog">
            Prijavi se
          </Button>

          <details className="border-t border-line pt-4">
            <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-body-sm font-semibold text-fg-muted focus-ring">
              <KeyRound size={16} strokeWidth={1.75} aria-hidden />
              Prvo podizanje panela
            </summary>
            <form
              className="mt-3 flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                onKey(draft.trim());
              }}
            >
              <Input
                label="Ključ za podizanje"
                type="password"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                hint="Radi samo dok salon nema nijedan admin nalog. Posle prve registracije vlasnice prestaje da važi."
              />
              <Button type="submit" variant="ghost" magnetic={false}>
                Otvori panel
              </Button>
            </form>
          </details>
        </div>
      )}

      <p className="mt-6 text-body-sm text-fg-muted">
        <Link href="/" className="text-link underline underline-offset-4 focus-ring">
          Nazad na sajt
        </Link>
      </p>
    </Shell>
  );
}
