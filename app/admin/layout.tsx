import type { ReactNode } from "react";

/**
 * Panel nema navigaciju sajta ni podnožje — ekran je mali, a svaki red se troši
 * na posao. `data-reveal="off"` gasi reč-po-reč otkrivanje na celom podstablu
 * (docs/MOTION.md): u panelu tekst mora da bude čitljiv istog trena.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-reveal="off" className="min-h-dvh bg-bg">
      {children}
    </div>
  );
}
