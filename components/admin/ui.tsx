"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Minus, Plus } from "lucide-react";
import { errorText } from "./strings";

/**
 * Sitni delovi od kojih je sastavljen ceo panel.
 *
 * Dva pravila iz docs/ADMIN.md drže sve ostalo:
 *  - svaka izmena se čuva odmah i javi „Sačuvano“; nema „Sačuvaj“ dugmadi po formama
 *  - svaki dodir je bar 44 px, jer se ovo koristi palcem, u hodu
 */

/* =====================================================================
 * Čuvanje izmene
 * ===================================================================== */

export type SaveState = "idle" | "busy" | "saved" | "error";

/**
 * Jedan poziv ka Convex-u sa stanjem koje se vidi: dok traje „…“, posle
 * „Sačuvano“ dve sekunde, a ako padne — rečenica koja kaže šta sad.
 */
export function useSave() {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T | null> => {
    if (timer.current) window.clearTimeout(timer.current);
    setState("busy");
    setError(null);
    try {
      const result = await task();
      if (!alive.current) return result;
      setState("saved");
      timer.current = window.setTimeout(() => alive.current && setState("idle"), 2000);
      return result;
    } catch (err) {
      if (!alive.current) return null;
      setError(errorText(err));
      setState("error");
      return null;
    }
  }, []);

  return { state, error, run, busy: state === "busy" };
}

/** „Sačuvano“ — mala mint potvrda koja se sama gasi. Greška ostaje dok se ne popravi. */
export function SaveHint({ state, error }: { state: SaveState; error: string | null }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      {state === "saved" && (
        <motion.span
          key="saved"
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center gap-1 text-caption font-semibold text-success-text"
        >
          <Check size={14} strokeWidth={2.5} aria-hidden />
          Sačuvano
        </motion.span>
      )}
      {state === "error" && error && (
        <motion.span
          key="error"
          role="alert"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-caption text-danger-text"
        >
          {error}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* =====================================================================
 * Toast sa „Poništi“
 * ===================================================================== */

type Toast = { id: number; text: string; undo?: () => void };

type ToastApi = {
  /** `undo` se nudi 8 sekundi (docs/ADMIN.md → destruktivno uvek nudi povratak). */
  show: (text: string, undo?: () => void | Promise<void>) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  // Bez provider-a panel ne sme da pukne — poruka se tiho preskače.
  return api ?? { show: () => {} };
}

export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const reduced = useReducedMotion();
  const next = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (text, undo) => {
      const id = ++next.current;
      const wrapped = undo
        ? () => {
            dismiss(id);
            void undo();
          }
        : undefined;
      setToasts((list) => [...list.slice(-2), { id, text, undo: wrapped }]);
      window.setTimeout(() => dismiss(id), 8000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[120] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-pill border border-line bg-bg-elev px-4 py-2.5 shadow-pop"
            >
              <span className="text-body-sm text-fg">{t.text}</span>
              {t.undo && (
                <button
                  type="button"
                  onClick={t.undo}
                  className="-my-2 -mr-2 shrink-0 rounded-pill px-3 py-2 text-body-sm font-semibold text-link focus-ring"
                >
                  Poništi
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* =====================================================================
 * Površine
 * ===================================================================== */

export function Panel({
  title,
  hint,
  action,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["rounded-md border border-line bg-bg-elev shadow-card", className].filter(Boolean).join(" ")}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-body font-semibold text-fg">{title}</h2>}
            {hint && <p className="mt-0.5 text-caption text-fg-muted">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Prazan tab objašnjava šta ide u njega i nudi jednu radnju. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line px-6 py-12 text-center">
      {icon && <span className="text-fg-muted">{icon}</span>}
      <h3 className="text-body font-semibold text-fg">{title}</h3>
      <p className="max-w-xs text-body-sm text-fg-muted">{body}</p>
      {action}
    </div>
  );
}

/* =====================================================================
 * Kontrole
 * ===================================================================== */

/** Prekidač ±. Oba dodira su 44 px; broj u sredini je tabular. */
export function Stepper({
  label,
  value,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const btn =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-line text-fg " +
    "transition-colors duration-150 hover:bg-bg-sunken disabled:opacity-40 focus-ring";
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(clamp(value - step))}
        disabled={disabled || value <= min}
        aria-label={`${label}: smanji`}
      >
        <Minus size={18} strokeWidth={2} aria-hidden />
      </button>
      <span className="num min-w-14 text-center text-body font-semibold text-fg" aria-live="polite">
        {value}
        {suffix ? <span className="text-fg-muted">{suffix}</span> : null}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(clamp(value + step))}
        disabled={disabled || value >= max}
        aria-label={`${label}: povećaj`}
      >
        <Plus size={18} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** Prekidač uklj/isklj — 44 px visok dodirni cilj oko same sklopke. */
export function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex h-11 items-center px-1 disabled:opacity-40 focus-ring"
    >
      <span
        className={[
          "relative h-6 w-11 rounded-pill transition-colors duration-150",
          checked ? "bg-brand" : "bg-line-strong",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 size-5 rounded-pill bg-paper-elev shadow-card transition-[left] duration-150 ease-out",
            checked ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

/**
 * Broj koji se upisuje pa sam sačuva — na `blur` i na Enter, ne na svaki otkucaj.
 * Prazno polje vraća prethodnu vrednost; ništa se ne gubi zato što je obrisala cifru.
 */
export function InlineNumber({
  label,
  value,
  suffix,
  min = 0,
  max = 1_000_000,
  onCommit,
  className,
}: {
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  onCommit: (next: number) => void;
  className?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  // Kad vrednost stigne spolja (npr. drugi uređaj je sačuvao izmenu), nacrt se
  // usklađuje tokom rendera. Efekat bi ovde napravio suvišan prolaz.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const commit = () => {
    const parsed = Number(draft.replace(/[^\d-]/g, ""));
    if (!Number.isFinite(parsed) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const next = Math.min(max, Math.max(min, Math.round(parsed)));
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <span className={["relative inline-flex items-center", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={draft}
        inputMode="numeric"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setDraft(String(value));
        }}
        className={[
          "num min-h-11 w-full rounded-sm border border-line bg-bg-elev px-3 text-right text-body font-semibold text-fg",
          "transition-colors duration-150 hover:border-line-strong focus-ring",
          suffix ? "pr-11" : "",
        ].join(" ")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 text-caption text-fg-muted">{suffix}</span>
      )}
    </span>
  );
}

/**
 * Prekidač lokacije i sličan izbor iz dva-tri stanja. Aktivna pilula klizi
 * (`layoutId`), pa se vidi da je to isti element koji se pomerio.
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (next: T) => void;
  className?: string;
}) {
  const groupId = useId();
  const reduced = useReducedMotion();
  return (
    <div
      role="group"
      aria-label={label}
      className={[
        "inline-flex w-full items-center gap-1 rounded-pill border border-line bg-bg-sunken p-1",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className="relative min-h-11 flex-1 rounded-pill px-3 text-body-sm font-semibold whitespace-nowrap focus-ring"
          >
            {active && (
              <motion.span
                layoutId={`${groupId}-pill`}
                transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0, duration: 0.3 }}
                className="absolute inset-0 rounded-pill bg-bg-elev shadow-card"
              />
            )}
            <span className={["relative", active ? "text-fg" : "text-fg-muted"].join(" ")}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Brojka na vrhu taba: velika, tabular, bez grafikona. */
export function Stat({ label, value, tone }: { label: string; value: string; tone?: "mint" | "rose" }) {
  return (
    <div
      className={[
        "flex flex-col gap-0.5 rounded-md border border-line px-4 py-3",
        tone === "mint" ? "bg-tint-wash" : tone === "rose" ? "bg-accent-soft" : "bg-bg-elev",
      ].join(" ")}
    >
      <span className="text-caption text-fg-muted">{label}</span>
      <span className="num text-h3 text-fg">{value}</span>
    </div>
  );
}

/** Red u listi koji se otvara u sheet — cela površina je dodir, nikad sama ikonica. */
export function RowButton({
  onClick,
  children,
  className,
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150",
        "hover:bg-bg-sunken focus-ring",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

/** Potvrda pre destruktivne radnje — dva dodira, bez `window.confirm`. */
export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(id);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-pill border px-4 text-body-sm font-semibold",
        "transition-colors duration-150 disabled:opacity-40 focus-ring",
        armed ? "border-danger bg-danger text-paper" : "border-line text-danger-text hover:bg-bg-sunken",
      ].join(" ")}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
