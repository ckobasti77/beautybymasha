"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useOptionalLenis } from "@/components/providers/SmoothScroll";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useMounted } from "@/lib/useMounted";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * DNA components.modal_style: na mobilnom bottom sheet sa hvataljkom i drag-to-dismiss,
 * na desktopu (md+) centrirani modal. Otvaranje 300 ms, spring bez odskoka.
 * - Escape, klik na pozadinu, X, ili povlačenje nadole (> 120 px ili brzo) zatvara.
 * - Fokus ide u panel i kruži u njemu; po zatvaranju se vraća.
 * - Lenis se pauzira, body ne skroluje; sadržaj panela ima data-lenis-prevent.
 * - prefers-reduced-motion: bez animacije i bez povlačenja.
 * Sadržaj je u role="dialog" → text-reveal ga preskače (mora biti čitljiv odmah).
 */
export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
  const reduced = useReducedMotion();
  const desktop = useMediaQuery("(min-width: 768px)");
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const lenis = useOptionalLenis();
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const smooth = lenis?.current ?? null;
    smooth?.stop();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
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
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      smooth?.start();
      previous?.focus?.();
    };
  }, [open, onClose, lenis]);

  if (!mounted) return null;

  const instant = { duration: 0 } as const;
  const panelTransition = reduced ? instant : ({ type: "spring", bounce: 0, duration: 0.3 } as const);
  const fade = reduced ? instant : ({ duration: 0.2 } as const);
  const draggable = !desktop && !reduced;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="presentation">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className="relative flex max-h-[min(88dvh,100%)] w-full flex-col rounded-t-lg bg-bg-elev shadow-sheet outline-none md:max-w-lg md:rounded-lg"
            initial={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: "100%" }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.98, y: 8 } : { y: "100%" }}
            transition={panelTransition}
            drag={draggable ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
          >
            {!desktop && (
              <div className="flex h-11 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing">
                <span aria-hidden className="h-1.5 w-12 rounded-pill bg-line-strong" />
              </div>
            )}
            <header className="flex shrink-0 items-start justify-between gap-4 px-6 pb-3 md:pt-6">
              <div>
                <h2 id={titleId} className="text-h3 text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Zatvori"
                className="-mr-2 -mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-pill text-fg-muted transition-colors hover:bg-bg-sunken hover:text-fg focus-ring"
              >
                <X size={20} strokeWidth={1.5} aria-hidden />
              </button>
            </header>
            <div data-lenis-prevent className="overflow-y-auto px-6 pb-6">
              {children}
            </div>
            {footer && <footer className="shrink-0 border-t border-line px-6 py-4">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
