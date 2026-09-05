import { MessageCircle, Phone } from "lucide-react";
import { site } from "@/lib/site";
import { booking } from "./strings";

const OUT =
  "inline-flex min-h-11 items-center gap-2 rounded-pill border border-line bg-bg-elev px-4 text-sm font-medium text-fg " +
  "hover:border-line-strong focus-ring";

/**
 * Greška pri slanju, uvek sa izlazom: poziv ili Viber. Bez hook-ova, jer je koristi i
 * varijanta bez backenda (`NEXT_PUBLIC_CONVEX_URL` nije postavljen).
 * `role="alert"` je i live region, pa ga text-reveal sistem preskače sam.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      data-reveal="off"
      className="rounded-md border border-danger/40 bg-[color-mix(in_oklab,var(--danger)_8%,transparent)] p-4"
    >
      <p className="text-sm font-semibold text-danger-text">{booking.errors.title}</p>
      <p className="mt-1 text-sm text-fg">{message}</p>
      <p className="mt-2 text-caption text-fg-muted">{booking.errors.hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={site.phone.href} className={OUT}>
          <Phone size={16} strokeWidth={1.5} aria-hidden />
          {booking.errors.callUs}
          <span className="num text-fg-muted">{site.phone.display}</span>
        </a>
        <a href={site.viber} className={OUT}>
          <MessageCircle size={16} strokeWidth={1.5} aria-hidden />
          {booking.errors.viber}
        </a>
      </div>
    </div>
  );
}
