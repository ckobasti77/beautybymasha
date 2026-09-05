"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Mail } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminReveal } from "../AdminReveal";
import { INQUIRY_STATUS_LABEL, relativeTime, type InquiryStatus } from "../strings";
import { EmptyState, Segmented, SaveHint, useSave } from "../ui";

/** Poruke sa kontakt forme. Tri stanja: Nova, U obradi, Rešeno. */

type Inquiry = Doc<"inquiries">;
type Filter = InquiryStatus | "sve";

export function MessagesTab({ adminKey }: { adminKey?: string }) {
  const [filter, setFilter] = useState<Filter>("sve");
  const inquiries = useQuery(api.inquiries.list, {
    key: adminKey,
    status: filter === "sve" ? undefined : filter,
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-h2 text-fg">Poruke</h1>
        <p className="mt-1 text-body-sm text-fg-muted">Šta stiže preko kontakt forme sa sajta.</p>
      </header>

      <Segmented<Filter>
        label="Stanje"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "sve", label: "Sve" },
          { value: "nova", label: "Nove" },
          { value: "procitana", label: "U obradi" },
          { value: "odgovorena", label: "Rešeno" },
        ]}
      />

      {inquiries === undefined ? (
        <p className="text-body text-fg-muted">Učitavam poruke…</p>
      ) : inquiries.length === 0 ? (
        <EmptyState
          icon={<Mail size={28} strokeWidth={1.5} aria-hidden />}
          title={filter === "sve" ? "Nema poruka" : "Nema poruka u ovom stanju"}
          body="Kad neko pošalje poruku sa kontakt forme, stiže ovde sa imejlom na koji možete da odgovorite."
        />
      ) : (
        <AdminReveal className="flex flex-col gap-2" deps={`${filter}-${inquiries.length}`}>
          {inquiries.map((i) => (
            <MessageCard key={i._id} inquiry={i} adminKey={adminKey} />
          ))}
        </AdminReveal>
      )}
    </div>
  );
}

function MessageCard({ inquiry, adminKey }: { inquiry: Inquiry; adminKey?: string }) {
  const setStatus = useMutation(api.inquiries.setStatus);
  const { state, error, run } = useSave();

  const next: Record<InquiryStatus, { status: InquiryStatus; label: string } | null> = {
    nova: { status: "procitana", label: "Uzmi u obradu" },
    procitana: { status: "odgovorena", label: "Označi kao rešeno" },
    odgovorena: null,
  };
  const step = next[inquiry.status];

  return (
    <article data-enter className="rounded-md border border-line bg-bg-elev p-4 shadow-card">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-body font-semibold text-fg">{inquiry.name}</h2>
          <a
            href={`mailto:${inquiry.email}`}
            className="inline-flex min-h-11 items-center text-body-sm text-link underline underline-offset-4 focus-ring"
          >
            {inquiry.email}
          </a>
        </div>
        <Badge tone={inquiry.status === "nova" ? "warning" : inquiry.status === "procitana" ? "mint" : "success"}>
          {INQUIRY_STATUS_LABEL[inquiry.status]}
        </Badge>
      </header>

      <p className="mt-2 whitespace-pre-line text-body-sm text-fg">{inquiry.message}</p>

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-caption text-fg-muted">{relativeTime(inquiry.createdAt)}</span>
        <div className="flex items-center gap-2">
          <SaveHint state={state} error={error} />
          {step && (
            <Button
              size="md"
              variant="ghost"
              magnetic={false}
              onClick={() => run(() => setStatus({ key: adminKey, id: inquiry._id, status: step.status }))}
            >
              {step.label}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
