"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { formatRsd } from "@/lib/format";
import { errorText } from "../strings";
import { useToast } from "../ui";
import {
  IMPORT_FIELDS,
  buildRow,
  guessMapping,
  importSummary,
  type ImportFieldKey,
  type ImportRow,
} from "./importFormat";

/**
 * Uvoz cenovnika iz tabele — tri koraka, bez iznenađenja.
 *
 *   1. izaberi fajl (CSV ili XLSX)
 *   2. proveri koja kolona je šta — mapiranje se prvo pogodi samo
 *   3. pogledaj prvih 20 redova pa potvrdi
 *
 * Uparuje se po šifri: postojeće se ažurira, novo se dodaje, ono čega u tabeli
 * nema se NE dira i NE briše. Prazna ćelija znači „ne diraj“, ne „obriši“.
 */

type Step = "izbor" | "mapiranje" | "gotovo";

type Parsed = { headers: string[]; rows: unknown[][]; fileName: string };

type Report = { updated: number; created: number; skipped: { sku: string; reason: string }[] };

const PREVIEW_ROWS = 20;
const MAX_ROWS = 2000;

export function ImportSheet({
  open,
  adminKey,
  onClose,
}: {
  open: boolean;
  adminKey?: string;
  onClose: () => void;
}) {
  const bulkUpsert = useMutation(api.products.bulkUpsert);
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("izbor");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<ImportFieldKey, number | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const reset = () => {
    setStep("izbor");
    setParsed(null);
    setMapping(null);
    setError(null);
    setReport(null);
    setBusy(false);
  };

  const pickFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      // `xlsx` je krupan — učitava se tek kad zatreba, ne uz ceo panel.
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      if (!sheet) throw new Error("empty");

      // `raw: false` je OBAVEZNO: sa `raw: true` xlsx sam pretvara „2.190,00“ u
      // broj po američkim pravilima i dobije 2,19. Ovako ćelija stiže onako kako
      // je napisana, pa je `parseNumber` čita po srpskom zapisu.
      const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: false });
      const headerRow = table.findIndex((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim()));
      if (headerRow === -1) throw new Error("empty");

      const headers = (table[headerRow] as unknown[]).map((h) => String(h ?? "").trim());
      const rows = table.slice(headerRow + 1).slice(0, MAX_ROWS) as unknown[][];
      if (rows.length === 0) throw new Error("empty");

      setParsed({ headers, rows, fileName: file.name });
      setMapping(guessMapping(headers));
      setStep("mapiranje");
    } catch {
      setError(
        "Nismo uspeli da pročitamo tabelu. Sačuvajte je kao .xlsx ili .csv, sa nazivima kolona u prvom redu, pa pokušajte ponovo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const rowsToSend: ImportRow[] =
    parsed && mapping
      ? parsed.rows.map((cells) => buildRow(cells, mapping)).filter((r): r is ImportRow => r !== null)
      : [];

  const runImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await bulkUpsert({ key: adminKey, rows: rowsToSend });
      setReport(result);
      setStep("gotovo");
      toast.show(importSummary(result));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <Sheet
      open
      onClose={close}
      title="Uvoz iz tabele"
      description={
        step === "izbor"
          ? "Excel ili CSV. Uparuje se po šifri; ništa se ne briše."
          : parsed?.fileName
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        {error && (
          <p role="alert" className="rounded-sm bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-body-sm text-danger-text">
            {error}
          </p>
        )}

        {step === "izbor" && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void pickFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line px-4 py-8 text-center transition-colors duration-150 hover:border-brand hover:bg-tint-wash focus-ring"
            >
              <FileSpreadsheet size={28} strokeWidth={1.5} aria-hidden className="text-fg-muted" />
              <span className="text-body font-semibold text-fg">Izaberite tabelu</span>
              <span className="text-body-sm text-fg-muted">.xlsx ili .csv, nazivi kolona u prvom redu</span>
            </button>
            {busy && <p className="text-body-sm text-fg-muted">Čitam tabelu…</p>}
          </>
        )}

        {step === "mapiranje" && parsed && mapping && (
          <>
            <section>
              <h3 className="text-body font-semibold text-fg">Koja kolona je šta</h3>
              <p className="mt-1 text-body-sm text-fg-muted">
                Pogodili smo po nazivima. Popravite ako nešto nije na svom mestu.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {IMPORT_FIELDS.map((field) => (
                  <Select
                    key={field.key}
                    label={field.required ? `${field.label} — obavezno` : field.label}
                    value={mapping[field.key] === null ? "" : String(mapping[field.key])}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [field.key]: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    options={[
                      { value: "", label: "— nema u tabeli —" },
                      ...parsed.headers.map((h, i) => ({ value: String(i), label: h || `Kolona ${i + 1}` })),
                    ]}
                  />
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-body font-semibold text-fg">
                Pregled — prvih {Math.min(PREVIEW_ROWS, rowsToSend.length)} od {rowsToSend.length}
              </h3>
              {rowsToSend.length === 0 ? (
                <p className="mt-2 text-body-sm text-danger-text">
                  Nijedan red nema šifru. Izaberite kolonu sa šiframa pa pokušajte ponovo.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto rounded-sm border border-line">
                  <table className="w-full text-left text-body-sm">
                    <thead className="bg-bg-sunken text-caption uppercase text-fg-muted">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Šifra</th>
                        <th className="px-2 py-1.5 font-semibold">Naziv</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Cena</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Stanje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsToSend.slice(0, PREVIEW_ROWS).map((r, i) => (
                        <tr key={`${r.sku}-${i}`} className="border-t border-line">
                          <td className="num px-2 py-1.5 whitespace-nowrap text-fg">{r.sku}</td>
                          <td className="max-w-40 truncate px-2 py-1.5 text-fg-muted">{r.name ?? "—"}</td>
                          <td className="num px-2 py-1.5 text-right text-fg">
                            {r.priceRsd === undefined ? "—" : formatRsd(r.priceRsd)}
                          </td>
                          <td className="num px-2 py-1.5 text-right text-fg-muted">{r.stock ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-caption text-fg-muted">
                Prazna ćelija znači „ne diraj“. Proizvod kojeg nema u tabeli ostaje netaknut.
              </p>
            </section>

            <div className="flex gap-2">
              <Button magnetic={false}
                className="flex-1"
                loading={busy}
                disabled={rowsToSend.length === 0}
                onClick={runImport}
                leading={<Upload size={16} aria-hidden />}
              >
                Uvezi {rowsToSend.length}
              </Button>
              <Button variant="ghost" onClick={reset} magnetic={false}>
                Drugi fajl
              </Button>
            </div>
          </>
        )}

        {step === "gotovo" && report && (
          <>
            <p className="num rounded-md bg-tint-wash px-4 py-3 text-body font-semibold text-fg">
              {importSummary(report)}
            </p>

            {report.skipped.length > 0 && (
              <section>
                <h3 className="text-body font-semibold text-fg">Šta nije prošlo</h3>
                <p className="mt-1 text-body-sm text-fg-muted">
                  Popravite ove redove u tabeli pa je uvezite ponovo — već uvezeno se neće duplirati.
                </p>
                <ul className="mt-2 flex flex-col gap-1">
                  {report.skipped.map((s, i) => (
                    <li key={`${s.sku}-${i}`} className="rounded-sm bg-bg-sunken px-3 py-2 text-body-sm">
                      <span className="num font-semibold text-fg">{s.sku || "(bez šifre)"}</span>
                      <span className="text-fg-muted"> — {s.reason}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex gap-2">
              <Button magnetic={false} className="flex-1" onClick={close}>
                Gotovo
              </Button>
              <Button variant="ghost" onClick={reset} magnetic={false}>
                Uvezi još jednu
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
