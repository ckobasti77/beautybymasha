"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  THEME_EVENT,
  THEME_KEY,
  getTheme,
  isTheme,
  resolveInitialTheme,
  setTheme as applyTheme,
  type Theme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme mora biti unutar <ThemeProvider>");
  return ctx;
}

/** <html data-theme> kao spoljni store: "themechange" javlja promenu, snapshot je atribut. */
function subscribe(onChange: () => void) {
  const root = document.documentElement;
  root.addEventListener(THEME_EVENT, onChange);
  return () => root.removeEventListener(THEME_EVENT, onChange);
}
const getServerTheme = (): Theme => "light";

/**
 * Izvor istine je <html data-theme> (postavlja ga THEME_INIT_SCRIPT pre prvog paint-a).
 * Provider ga čita kroz useSyncExternalStore (bez setState u efektu, bez hydration
 * greške — server snapshot je "light") i nudi toggle. Druge kartice se prate kroz "storage".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  useLayoutEffect(() => {
    // Dev Strict Mode remount briše atribut koji je inline skripta postavila —
    // ponovo primeni iz istog izvora (no-op u produkciji).
    applyTheme(resolveInitialTheme(), { persist: false });
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && isTheme(e.newValue)) applyTheme(e.newValue, { persist: false });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);
  const toggle = useCallback(() => applyTheme(getTheme() === "dark" ? "light" : "dark"), []);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
