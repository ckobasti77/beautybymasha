"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Camera, ScanLine, Sparkles, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { formatRsd } from "@/lib/format";
import { AdminReveal } from "../AdminReveal";
import { relativeTime } from "../strings";
import { EmptyState, InlineNumber, useSave, useToast } from "../ui";

/**
 * Loyalty za pultom.
 *
 * Radnja koja se ovde stvarno obavlja je jedna: mušterija pruži telefon sa QR
 * kodom, ona skenira ili ukuca broj, i pritisne „Iskoristi 10%“. Sve ostalo na
 * ovom ekranu postoji da bi ta jedna radnja bila sigurna — da vidi koga gleda i
 * da li popust uopšte ima.
 */

type Member = {
  userId: Id<"users">;
  loyaltyNumber: string | null;
  name: string | null;
  email: string | null;
  phone?: string | null;
  eligible: boolean;
  discountPercent: number;
  reason: string;
  redemptionsCount: number;
  lastRedeemedAt: number | null;
};

const REASON_TEXT: Record<string, string> = {
  "prva-poseta": "Popust počinje da važi posle prve plaćene posete.",
  "posle-posete": "Ima neiskorišćen popust.",
  iskoriscen: "Popust je već iskorišćen — sledeći stiže posle naredne posete.",
  "nije-clan": "Ovaj nalog nije loyalty član.",
};

export function LoyaltyTab({ adminKey }: { adminKey?: string }) {
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [openMember, setOpenMember] = useState<Member | null>(null);

  const trimmed = query.trim();
  const results = useQuery(
    api.loyalty.findMember,
    trimmed.length >= 3 ? { key: adminKey, query: trimmed } : "skip",
  );
  const members = useQuery(api.loyalty.members, { key: adminKey, limit: 50 });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-h2 text-fg">Loyalty</h1>
        <p className="mt-1 text-body-sm text-fg-muted">
          Nađite člana pa iskoristite popust. Popust važi jednom po ciklusu, i u salonu i na sajtu.
        </p>
      </header>

      <div className="flex items-end gap-2">
        <Input
          className="flex-1"
          label="Pretraga člana"
          hideLabel
          type="search"
          placeholder="Broj kartice, ime, telefon ili imejl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          variant="ghost"
          onClick={() => setScannerOpen(true)}
          leading={<ScanLine size={16} aria-hidden />}
          magnetic={false}
        >
          Skeniraj
        </Button>
      </div>

      {trimmed.length > 0 && trimmed.length < 3 && (
        <p className="text-body-sm text-fg-muted">Upišite bar tri znaka.</p>
      )}

      {results !== undefined && trimmed.length >= 3 && (
        <section>
          <h2 className="mb-2 text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Rezultati pretrage
          </h2>
          {results.length === 0 ? (
            <EmptyState
              title="Nema člana po toj pretrazi"
              body="Proverite broj kartice, ili neka mušterija otvori „Moj nalog“ na telefonu i pokaže QR kod."
            />
          ) : (
            <AdminReveal className="flex flex-col gap-2" deps={trimmed}>
              {results.map((m) => (
                <MemberRow key={m.userId} member={m as Member} onOpen={() => setOpenMember(m as Member)} />
              ))}
            </AdminReveal>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-caption font-semibold uppercase tracking-wider text-fg-muted">
          Svi članovi — poslednja poseta prva
        </h2>
        {members === undefined ? (
          <p className="text-body-sm text-fg-muted">Učitavam članove…</p>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={28} strokeWidth={1.5} aria-hidden />}
            title="Još nema članova"
            body="Član postaje svako ko se registruje na sajtu. Karticu sa QR kodom dobija odmah, u „Moj nalog“."
          />
        ) : (
          <AdminReveal className="flex flex-col gap-2" deps={members.length} stagger={0.02}>
            {members.map((m) => (
              <MemberRow
                key={m.userId}
                member={m as Member}
                lastVisitAt={m.lastVisitAt}
                onOpen={() => setOpenMember(m as Member)}
              />
            ))}
          </AdminReveal>
        )}
      </section>

      <ScannerSheet
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onFound={(code) => {
          setQuery(code);
          setScannerOpen(false);
        }}
      />
      <MemberSheet
        // Drugi član = druga kartica; remount vraća iznos na polazni.
        key={openMember?.userId ?? "prazno"}
        member={openMember}
        adminKey={adminKey}
        onClose={() => setOpenMember(null)}
      />
    </div>
  );
}

function MemberRow({
  member,
  lastVisitAt,
  onOpen,
}: {
  member: Member;
  lastVisitAt?: number | null;
  onOpen: () => void;
}) {
  return (
    <button
      data-enter
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-md border border-line bg-bg-elev px-3 py-3 text-left shadow-card transition-colors duration-150 hover:border-line-strong focus-ring"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-fg">
          {member.name ?? member.email ?? "Član"}
        </span>
        <span className="num block truncate text-body-sm text-fg-muted">{member.loyaltyNumber ?? "—"}</span>
        {lastVisitAt != null && (
          <span className="block text-caption text-fg-muted">Poslednja poseta {relativeTime(lastVisitAt)}</span>
        )}
      </span>
      {member.eligible ? (
        <Badge tone="mint" dot>
          Ima {member.discountPercent}%
        </Badge>
      ) : (
        <Badge tone="neutral">Nema popust</Badge>
      )}
    </button>
  );
}

/** Kartica člana i jedno dugme koje se ovde koristi. */
function MemberSheet({
  member,
  adminKey,
  onClose,
}: {
  member: Member | null;
  adminKey?: string;
  onClose: () => void;
}) {
  const redeem = useMutation(api.loyalty.redeem);
  const history = useQuery(
    api.loyalty.history,
    member ? { key: adminKey, userId: member.userId } : "skip",
  );
  const { error, run, busy } = useSave();
  const toast = useToast();
  const [amount, setAmount] = useState(2000);

  if (!member) return null;

  const submit = async () => {
    const result = await run(() =>
      redeem({ key: adminKey, userId: member.userId, kind: "salon", amountRsd: amount }),
    );
    if (result) {
      toast.show(`Popust ${formatRsd(result.discountRsd)} — za naplatu ${formatRsd(result.payableRsd)}.`);
      onClose();
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={member.name ?? member.email ?? "Član"}
      description={member.loyaltyNumber ?? undefined}
    >
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {member.eligible ? (
            <Badge tone="mint" dot>
              Ima {member.discountPercent}% popusta
            </Badge>
          ) : (
            <Badge tone="neutral">Nema popust</Badge>
          )}
          <Badge>
            <span className="num">Iskorišćeno {member.redemptionsCount}×</span>
          </Badge>
        </div>

        <p className="text-body-sm text-fg-muted">{REASON_TEXT[member.reason] ?? ""}</p>

        {member.eligible ? (
          <section className="flex flex-col gap-3 rounded-md border border-line bg-bg-sunken p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-fg">Iznos računa</span>
              <InlineNumber label="Iznos računa" value={amount} suffix="RSD" min={1} onCommit={setAmount} />
            </label>
            <p className="num text-body-sm text-fg-muted">
              Popust {formatRsd(Math.round((amount * member.discountPercent) / 100))} · za naplatu{" "}
              {formatRsd(amount - Math.round((amount * member.discountPercent) / 100))}
            </p>
            <Button magnetic={false} onClick={submit} loading={busy}>
              Iskoristi {member.discountPercent}%
            </Button>
          </section>
        ) : (
          <p className="rounded-sm bg-bg-sunken px-3 py-2 text-body-sm text-fg">
            Popust se ne može iskoristiti sada. Sledeći stiže posle naredne plaćene posete.
          </p>
        )}

        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}

        <section>
          <h3 className="mb-2 text-caption font-semibold uppercase tracking-wider text-fg-muted">
            Istorija korišćenja
          </h3>
          {history === undefined ? (
            <p className="text-body-sm text-fg-muted">Učitavam…</p>
          ) : history.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Popust još nije korišćen.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {history.map((h) => (
                <li key={h._id} className="num flex justify-between rounded-sm bg-bg-sunken px-3 py-2 text-body-sm">
                  <span className="text-fg-muted">{relativeTime(h.redeemedAt)}</span>
                  <span className="text-fg">−{formatRsd(h.discountRsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}

/**
 * Skener QR koda sa telefona članice.
 *
 * `BarcodeDetector` postoji u Chrome-u na Androidu — tamo gde se ovo i koristi.
 * Gde ga nema (desktop, iPhone), kamera se ne pali i ostaje ručni unos broja,
 * koji radi svuda. Kamera se gasi čim se sheet zatvori.
 */
function ScannerSheet({
  open,
  onClose,
  onFound,
}: {
  open: boolean;
  onClose: () => void;
  onFound: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"idle" | "running" | "unsupported" | "denied">("idle");
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const start = async () => {
      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (o: { formats: string[] }) => {
            detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;

      // Bez čitača koda ili bez kamere ostaje ručni unos — on radi svuda.
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("running");

        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              onFound(value);
              return;
            }
          } catch {
            // Jedan promašeni kadar nije razlog da se skener ugasi.
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setStatus("denied");
      }
    };
    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onFound]);

  if (!open) return null;

  return (
    <Sheet open onClose={onClose} title="Skeniranje kartice" description="Uslikajte QR kod sa telefona članice.">
      <div className="flex flex-col gap-4 pt-1">
        {status === "running" || status === "idle" ? (
          <div className="relative overflow-hidden rounded-md bg-ink">
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-8 rounded-md border-2 border-paper/70"
            />
          </div>
        ) : (
          <p className="flex items-center gap-2 rounded-sm bg-bg-sunken px-3 py-3 text-body-sm text-fg">
            {status === "denied" ? (
              <>
                <X size={16} aria-hidden className="shrink-0 text-danger-text" />
                Kamera nije dozvoljena. Dozvolite je u podešavanjima pregledača, ili ukucajte broj kartice ispod.
              </>
            ) : (
              <>
                <Camera size={16} aria-hidden className="shrink-0 text-fg-muted" />
                Ovaj uređaj ne ume da čita QR kod. Ukucajte broj kartice ispod — radi isto.
              </>
            )}
          </p>
        )}

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim().length >= 3) onFound(manual.trim());
          }}
        >
          <Input
            className="flex-1"
            label="Broj kartice"
            placeholder="BM 123 456"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            autoComplete="off"
          />
          <Button type="submit" magnetic={false}>
            Nađi
          </Button>
        </form>
      </div>
    </Sheet>
  );
}
