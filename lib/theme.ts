/**
 * Tema se drži na <html data-theme="light|dark">. CSS tokeni (globals.css) reaguju odmah,
 * a komponente koje moraju da znaju (npr. shader boje) slušaju "themechange" na <html>.
 * Bez React importa — koristi ga i inline skripta u layoutu i provider.
 */
export type Theme = "light" | "dark";

export const THEME_KEY = "bbm-theme";
export const THEME_EVENT = "themechange";
const DEFAULT_THEME: Theme = "light";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  const t = document.documentElement.dataset.theme;
  return isTheme(t) ? t : DEFAULT_THEME;
}

/** Sačuvano > sistemska preferenca > svetla (brend je „beo papir"). */
export function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* privatni režim, blokiran storage */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : DEFAULT_THEME;
}

export function setTheme(theme: Theme, { persist = true }: { persist?: boolean } = {}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignorisano */
    }
  }
  if (root.dataset.theme === theme) return;
  root.dataset.theme = theme;
  root.dispatchEvent(new CustomEvent<Theme>(THEME_EVENT, { detail: theme }));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

/**
 * Inline skripta za <head> — izvršava se pre prvog paint-a, pa tema ne bljesne.
 * Usput dodaje `html.js` (bez JS-a ništa nije sakriveno — vidi hideCss()).
 * Ista logika kao resolveInitialTheme(), ali bez importa (mora biti string).
 */
export const THEME_INIT_SCRIPT = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t}catch(e){d.dataset.theme="light"}})()`;
