"use client";

import { useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPercent } from "@/lib/format";
import { site } from "@/lib/site";

/**
 * Prijava i registracija (ADR-003). Registracija traži imejl, lozinku i potvrdu
 * lozinke — ništa više. Ime, telefon i adresu kupac ionako upisuje na naplati,
 * pa ih ovde ne tražimo dvaput.
 *
 * Ako je potvrda imejla uključena na serveru (`AUTH_EMAIL_VERIFICATION`),
 * `signIn` vrati `signingIn: false` i traži šestocifreni kod — tada se pojavi
 * jedno dodatno polje. Kad je isključena, taj korak se nikad ne vidi.
 *
 * Forma je u `skipSelector`-u text-reveal sistema, pa je čitljiva odmah.
 */

const MIN_PASSWORD_LENGTH = 8;

type Mode = "signIn" | "signUp";

export function AuthPanel() {
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<Mode>("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; code?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setFormError(null);
    setNeedsCode(false);
    setConfirm("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (needsCode) {
      if (!/^\d{6}$/.test(code.trim())) {
        setErrors({ code: "Kod ima šest cifara." });
        return;
      }
      setErrors({});
      setBusy(true);
      try {
        await signIn("password", { email: email.trim().toLowerCase(), code: code.trim(), flow: "email-verification" });
      } catch {
        setFormError("Kod nije prihvaćen. Proverite ga ili zatražite nov.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const found: typeof errors = {};
    if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(email.trim())) found.email = "Upišite ispravnu imejl adresu.";
    if (password.length < MIN_PASSWORD_LENGTH) found.password = `Lozinka mora imati bar ${MIN_PASSWORD_LENGTH} znakova.`;
    if (mode === "signUp" && confirm !== password) found.confirm = "Lozinke se ne poklapaju.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const result = await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: mode,
      });
      // Server traži potvrdu imejla pre nego što pusti sesiju.
      if (result && result.signingIn === false) setNeedsCode(true);
    } catch (err) {
      const message = err instanceof ConvexError ? String(err.data) : null;
      setFormError(
        message ??
          (mode === "signIn"
            ? "Imejl i lozinka se ne poklapaju. Probajte ponovo."
            : "Registracija nije uspela. Možda već imate nalog sa tim imejlom."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="max-w-md">
        <div role="tablist" aria-label="Prijava ili registracija" className="inline-flex rounded-pill bg-bg-sunken p-1">
          {(
            [
              ["signUp", "Registracija"],
              ["signIn", "Prijava"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={[
                "min-h-11 rounded-pill px-5 text-sm font-semibold transition-colors duration-150 focus-ring",
                mode === value ? "bg-bg-elev text-fg shadow-card" : "text-fg-muted hover:text-fg",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-5">
          <Input
            label="Imejl"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={needsCode}
          />

          {needsCode ? (
            <Input
              label="Kod iz imejla"
              numeric
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              error={errors.code}
              hint="Poslali smo šestocifreni kod na tu adresu."
            />
          ) : (
            <>
              <Input
                label="Lozinka"
                type="password"
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                hint={mode === "signUp" ? `Najmanje ${MIN_PASSWORD_LENGTH} znakova.` : undefined}
              />
              {mode === "signUp" ? (
                <Input
                  label="Potvrda lozinke"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={errors.confirm}
                />
              ) : null}
            </>
          )}

          {formError ? (
            <p role="alert" className="rounded-sm border border-danger p-3 text-sm text-danger-text">
              {formError}
            </p>
          ) : null}

          <p>
            <Button type="submit" size="lg" loading={busy}>
              {needsCode ? "Potvrdite kod" : mode === "signUp" ? "Napravite nalog" : "Prijavite se"}
            </Button>
          </p>
        </form>
      </div>

      <aside className="rounded-lg border border-line bg-accent-soft p-6">
        <h2 className="text-h3 text-fg">Šta nalog donosi</h2>
        <ul className="mt-4 space-y-3 text-sm text-fg">
          <li>{formatPercent(site.loyalty.discountPercent)} popusta na sledeći račun, i u salonu i na sajtu.</li>
          <li>Člansku karticu sa QR kodom koju pokazujete na naplati.</li>
          <li>Spisak svojih termina i porudžbina na jednom mestu.</li>
        </ul>
        <p className="mt-5 text-caption text-fg-muted">
          Termin možete da zakažete i bez naloga. Nalog služi popustu i pregledu.
        </p>
      </aside>
    </div>
  );
}
