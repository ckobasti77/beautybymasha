"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

/** Prekidač teme za navigaciju. 44 px, pill, ikona prati stanje. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Uključi svetlu temu" : "Uključi tamnu temu"}
      aria-pressed={dark}
      className={[
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-fg-muted transition-colors duration-150 hover:bg-bg-sunken hover:text-fg focus-ring",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {dark ? <Sun size={20} strokeWidth={1.5} aria-hidden /> : <Moon size={20} strokeWidth={1.5} aria-hidden />}
    </button>
  );
}
