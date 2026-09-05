"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Phone } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { useOptionalLenis } from "@/components/providers/SmoothScroll";
import { formatDuration, formatRsd } from "@/lib/format";
import {
  BOOKING_SECTION_ID,
  BOOK_EVENT,
  clearBookingHash,
  parseBookingHash,
  syncBookingHash,
  type BookDetail,
} from "@/lib/sectionIntent";
import { addDays, belgradeNow, startOfWeek } from "@/lib/slots";
import { serviceByKey } from "@/lib/services";
import { site, type LocationKey } from "@/lib/site";
import { useHashIntent } from "@/lib/useHashIntent";
import { DetailsStep } from "./DetailsStep";
import {
  emptyDetails,
  validateDetails,
  type DetailsErrors,
  type DetailsField,
  type DetailsValues,
} from "./detailsRules";
import { ErrorBanner } from "./ErrorBanner";
import { LocationStep } from "./LocationStep";
import { ServiceStep } from "./ServiceStep";
import { SlotChips, type EmptyReason } from "./SlotChips";
import { StepDots } from "./StepDots";
import { STEPS, booking, isSlotGone, serverMessage } from "./strings";
import { SuccessView, type SuccessData } from "./SuccessView";
import { SummaryCard } from "./SummaryCard";
import { WeekStrip, isDayEnabled, type DayInfo } from "./WeekStrip";

/**
 * Čarobnjak za zakazivanje, ugrađen u landing (nije zasebna stranica).
 * Lokacija → Usluga → Dan i vreme → Podaci → Potvrda.
 *
 * Klijent NE računa dostupnost: počeci dolaze iz `convex/availability.slots`, a
 * `bookings.create` ih proverava ponovo, u istoj transakciji. Ovde nema nijedne
 * odluke o kapacitetu, samo prikaz.
 *
 * Izabrani dan i izabrano vreme su IZVEDENI, ne prepisani u efektu: `pickedDate` i
 * `pickedStart` su ono što je gost dodirnuo, a `date` i `startMin` su ono što je i
 * dalje moguće. Kad neko drugi uzme termin, izbor prestane da važi sam od sebe —
 * bez `setState` u efektu i bez skoka unazad ispod prstiju.
 *
 * `now` se šalje zaokružen NAGORE na 5 minuta: ključ pretplate ostaje stabilan, a
 * klijent je bar toliko strog koliko i server, pa ne nudi termin koji bi mutacija
 * odbila zbog najave.
 *
 * Deep link iz cenovnika (spec 11): `#zakazivanje?usluga=<key>` pri učitavanju ili
 * `bbm:book` na klik (lib/sectionIntent.ts). Usluga se upiše, korak Usluga se preskače
 * (Lokacija → Dan i vreme), a gost je menja kroz „Promenite uslugu". Nepoznat ili
 * nebookable ključ: čarobnjak kreće normalno, samo se doskroluje do njega.
 */

const NOW_ROUND_MS = 5 * 60 * 1000;
const HAS_BACKEND = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
/** Prvi dodir skrola gasi praćenje rasporeda posle deep linka (vidi `scrollToWizard`). */
const SETTLE_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
/** Koliko dugo posle deep linka pratimo pomeranje rasporeda (LoyaltyBar, fontovi). */
const SETTLE_MS = 2000;

type Clock = { now: number; today: string };
type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "error"; message: string }
  | ({ kind: "success" } & SuccessData);

function makeClock(): Clock {
  const now = Math.ceil(Date.now() / NOW_ROUND_MS) * NOW_ROUND_MS;
  return { now, today: belgradeNow(now).date };
}

function NoBackend() {
  return (
    <div className="rounded-md border border-line bg-bg-elev p-6 shadow-card">
      <p className="text-fg">{booking.errors.offline}</p>
      <a
        href={site.phone.href}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill bg-brand px-5 text-sm font-semibold text-brand-fg focus-ring"
      >
        <Phone size={16} strokeWidth={1.5} aria-hidden />
        {booking.errors.callUs} <span className="num">{site.phone.display}</span>
      </a>
    </div>
  );
}

function BookingWizardLive() {
  const base = useId();
  const ids = useMemo(
    () => ({
      name: `${base}-name`,
      phone: `${base}-phone`,
      email: `${base}-email`,
      note: `${base}-note`,
      website: `${base}-website`,
    }),
    [base],
  );

  const lenis = useOptionalLenis();
  const create = useMutation(api.bookings.create);
  const info = useQuery(api.settings.publicInfo, {});
  const horizonDays = info?.horizonDays ?? site.booking.horizonDays;
  const holdHours = info?.holdHours ?? site.booking.holdHours;

  const [step, setStep] = useState(0);
  const [locationKey, setLocationKey] = useState<LocationKey | null>(null);
  const [serviceKey, setServiceKey] = useState<string | null>(null);
  const [clock, setClock] = useState<Clock | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedStart, setPickedStart] = useState<number | null>(null);
  const [details, setDetails] = useState<DetailsValues>(emptyDetails);
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [touched, setTouched] = useState<Partial<Record<DetailsField, boolean>>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [live, setLive] = useState("");

  const headingRef = useRef<HTMLParagraphElement>(null);
  const navigatedRef = useRef(false);

  // Sat za „danas" i najavu. Nova vrednost se prihvata tek kad zaokruženi `now` ili
  // dan stvarno pređu, pa isti objekat ne izaziva re-render svakog minuta.
  useEffect(() => {
    const tick = () =>
      setClock((prev) => {
        const next = makeClock();
        return prev && prev.now === next.now && prev.today === next.today ? prev : next;
      });
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const service = serviceKey ? serviceByKey(serviceKey) : undefined;
  const durationMin = service?.durationMin ?? 0;
  const today = clock?.today ?? null;
  const horizonEnd = today ? addDays(today, horizonDays) : null;
  const effectiveWeekStart = weekStart ?? (today ? startOfWeek(today) : null);
  const settled = status.kind === "success";
  const listening = Boolean(clock && locationKey && serviceKey && step >= 2 && !settled);

  const weekArgs =
    listening && effectiveWeekStart && clock && locationKey && serviceKey
      ? { locationKey, serviceKey, fromDate: effectiveWeekStart, now: clock.now }
      : "skip";
  const week = useQuery(api.availability.week, weekArgs);

  const days = useMemo<DayInfo[]>(() => {
    if (!effectiveWeekStart) return [];
    const byDate = new Map((week ?? []).map((d) => [d.date, d] as const));
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(effectiveWeekStart, i);
      const found = byDate.get(d);
      return {
        date: d,
        count: week === undefined ? undefined : (found?.count ?? 0),
        open: week === undefined ? undefined : (found?.open ?? false),
      };
    });
  }, [effectiveWeekStart, week]);

  // Dan koji se stvarno gleda: ono što je gost izabrao, ili prvi slobodan u nedelji
  // (traka nikad ne stoji prazna). Izvedeno u renderu, bez setState u efektu.
  const date = useMemo(() => {
    if (pickedDate) return pickedDate;
    if (!today || !horizonEnd || week === undefined) return null;
    return days.find((d) => isDayEnabled(d, today, horizonEnd))?.date ?? null;
  }, [pickedDate, today, horizonEnd, week, days]);

  const dayArgs =
    listening && date && clock && locationKey && serviceKey
      ? { locationKey, serviceKey, date, now: clock.now }
      : "skip";
  const day = useQuery(api.availability.slots, dayArgs);
  const slots = day?.slots;

  /**
   * Izabrano vreme važi samo dok stoji u odgovoru servera. Ako je nestalo (neko ga je
   * upravo uzeo ili je prošla najava), izbor pada sam — a korak „Podaci" to kaže i
   * ponudi povratak, umesto da gosta odbaci unazad usred kucanja.
   */
  const startMin = pickedStart !== null && slots !== undefined && !slots.includes(pickedStart) ? null : pickedStart;
  const slotVanished = pickedStart !== null && startMin === null;

  const emptyReason: EmptyReason = day?.open === false ? "closed" : date === today ? "today" : "full";

  const go = useCallback((to: number) => {
    navigatedRef.current = true;
    setStep(to);
    setStatus((s) => (s.kind === "error" ? { kind: "idle" } : s));
  }, []);

  // Posle promene koraka fokus ide na naslov koraka; ako je naslov iznad ekrana
  // (duga lista usluga na mobilnom), doskrolujemo do njega.
  useEffect(() => {
    if (!navigatedRef.current) return;
    const el = headingRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const top = el.getBoundingClientRect().top;
    if (top >= 96) return;
    const target = window.scrollY + top - 120;
    const smooth = lenis?.current;
    if (smooth) smooth.scrollTo(target);
    else window.scrollTo({ top: target });
  }, [step, lenis]);

  /**
   * Skrol do sekcije posle deep linka — jedan vlasnik (efekat iznad se preskače preko
   * `navigatedRef`). Klik iz cenovnika: Lenis glatko, pa fokus na naslov koraka.
   * Direktno učitavanje: nativni `scrollIntoView` odmah (Next hash bez mete ne
   * skroluje, a Lenis još ne postoji — sinhronizuje se preko nativnog skrola);
   * reload i nazad/napred vraćaju staru poziciju, kao i nativna sidra. `LoyaltyBar`
   * iznad se montira posle hidratacije i pomera raspored, pa kratko pratimo visinu
   * strane i ponovo skačemo — dok gost ne pipne skrol.
   */
  const settleRef = useRef<(() => void) | null>(null);
  useEffect(() => () => settleRef.current?.(), []);

  const scrollToWizard = useCallback(
    (initial: boolean) => {
      const section = document.getElementById(BOOKING_SECTION_ID);
      if (!section) return;
      const focusHeading = () => headingRef.current?.focus({ preventScroll: true });

      if (!initial) {
        const smooth = lenis?.current;
        if (smooth) smooth.scrollTo(section, { onComplete: focusHeading });
        else {
          section.scrollIntoView();
          focusHeading();
        }
        return;
      }

      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const restored = nav?.type === "reload" || nav?.type === "back_forward";
      if (restored && performance.now() < 3000) return;

      section.scrollIntoView();
      focusHeading();

      settleRef.current?.();
      const observer = new ResizeObserver(() => section.scrollIntoView());
      const stop = () => {
        observer.disconnect();
        for (const ev of SETTLE_EVENTS) window.removeEventListener(ev, stop);
        window.clearTimeout(timer);
        settleRef.current = null;
      };
      const timer = window.setTimeout(stop, SETTLE_MS);
      for (const ev of SETTLE_EVENTS) window.addEventListener(ev, stop, { passive: true });
      observer.observe(document.body);
      settleRef.current = stop;
    },
    [lenis],
  );

  const setField = <K extends keyof DetailsValues>(key: K, value: DetailsValues[K]) => {
    const next = { ...details, [key]: value };
    setDetails(next);
    setErrors(validateDetails(next));
  };

  const canProceed =
    step === 0
      ? Boolean(locationKey)
      : step === 1
        ? Boolean(serviceKey)
        : step === 2
          ? Boolean(date && startMin !== null)
          : startMin !== null;

  const reset = () => {
    setStep(0);
    setLocationKey(null);
    setServiceKey(null);
    setPickedDate(null);
    setPickedStart(null);
    setWeekStart(null);
    setDetails(emptyDetails);
    setErrors({});
    setTouched({});
    setStatus({ kind: "idle" });
    setLive("");
    clearBookingHash();
  };

  useHashIntent<string>({
    event: BOOK_EVENT,
    parseHash: parseBookingHash,
    fromEvent: (e) => {
      const d = e.detail as BookDetail | undefined;
      return typeof d?.serviceKey === "string" ? d.serviceKey : null;
    },
    onIntent: (key, { initial }) => {
      scrollToWizard(initial);
      const s = serviceByKey(key);
      if (!s || !s.bookable || s.priceRsd === null) return;
      if (status.kind === "pending") return;
      const fresh = status.kind === "success";
      if (fresh) reset();
      setServiceKey(s.key);
      setPickedStart(null);
      setStatus((st) => (st.kind === "error" ? { kind: "idle" } : st));
      // Lokal već izabran → pravo na dan i vreme; inače od lokala (korak Usluga se preskače).
      navigatedRef.current = false;
      setStep(!fresh && locationKey ? 2 : 0);
      setLive(booking.preset.announced(s.title));
    },
  });

  const submit = async () => {
    if (!service || !locationKey || !date || startMin === null) return;
    setTouched({ name: true, phone: true, email: true, note: true });
    const found = validateDetails(details);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = (["name", "phone", "email", "note"] as const).find((f) => found[f]);
      if (first) document.getElementById(ids[first])?.focus();
      return;
    }

    setStatus({ kind: "pending" });
    setLive(booking.submitting);
    const name = details.name.trim();
    try {
      const res = await create({
        name,
        phone: details.phone.trim(),
        email: details.email.trim() || undefined,
        serviceKey: service.key,
        locationKey,
        date,
        startMin,
        note: details.note.trim() || undefined,
        website: details.website || undefined,
      });
      setStatus({
        kind: "success",
        name,
        serviceTitle: service.title,
        locationKey: res.locationKey,
        date,
        startMin: res.startMin,
        endMin: res.endMin,
      });
      setLive(booking.success.title);
      clearBookingHash();
    } catch (err) {
      const message = err instanceof ConvexError ? serverMessage(err.data) : booking.errors.generic;
      setLive(message);
      if (isSlotGone(message)) {
        setPickedStart(null);
        setStep(2);
      }
      setStatus({ kind: "error", message });
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === "pending") return;
    if (step < STEPS.length - 1) {
      // Usluga već izabrana (cenovnik ili raniji prolaz) → sa lokala pravo na dan i vreme.
      if (canProceed) go(step === 0 && serviceKey ? 2 : step + 1);
      return;
    }
    void submit();
  };

  if (status.kind === "success") {
    return (
      <div data-reveal="off" className="rounded-lg border border-line bg-bg-elev p-6 shadow-card md:p-8">
        <p aria-live="polite" className="sr-only">
          {live}
        </p>
        <SuccessView data={status} holdHours={holdHours} onAgain={reset} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <form onSubmit={onSubmit} noValidate className="rounded-lg border border-line bg-bg-elev p-5 shadow-card md:p-8">
        <StepDots
          step={step}
          onJump={go}
          disabled={status.kind === "pending"}
          completed={(i) => i === 1 && Boolean(serviceKey)}
        />

        <p aria-live="polite" className="sr-only">
          {live}
        </p>

        <p ref={headingRef} tabIndex={-1} className="mt-6 text-h3 text-fg outline-none">
          {step === 0
            ? booking.location.title
            : step === 1
              ? booking.service.title
              : step === 2
                ? booking.day.title
                : booking.details.title}
        </p>
        {step === 0 ? <p className="mt-1 text-sm text-fg-muted">{booking.location.hint}</p> : null}
        {step === 1 ? <p className="mt-1 text-sm text-fg-muted">{booking.service.hint}</p> : null}

        {step === 0 && service ? (
          // Usluga stigla iz cenovnika: gost vidi šta zakazuje pre nego što bira lokal
          // (na telefonu je rezime ispod forme). Unutar <form>-a, pa bez reveal-a.
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-bg-sunken px-4 py-3">
            <p className="text-sm text-fg">
              <span className="text-fg-muted">{booking.preset.label}: </span>
              <span className="font-semibold">{service.title}</span>
              <span className="num text-fg-muted">
                {" · "}
                {formatDuration(service.durationMin)}
                {service.priceRsd !== null ? ` · ${formatRsd(service.priceRsd)}` : ""}
              </span>
            </p>
            <Button type="button" variant="ghost" magnetic={false} onClick={() => go(1)}>
              {booking.preset.change}
            </Button>
          </div>
        ) : null}

        <div className="mt-6">
          {step === 0 ? (
            <LocationStep
              selected={locationKey}
              onSelect={(k) => {
                setLocationKey(k);
                setPickedStart(null);
                setPickedDate(null);
              }}
            />
          ) : null}

          {step === 1 ? (
            <ServiceStep
              selected={serviceKey}
              onSelect={(k) => {
                setServiceKey(k);
                setPickedStart(null);
                syncBookingHash(k);
              }}
            />
          ) : null}

          {step === 2 && today && horizonEnd && effectiveWeekStart ? (
            <div className="space-y-6">
              <WeekStrip
                weekStart={effectiveWeekStart}
                today={today}
                horizonEnd={horizonEnd}
                selected={date}
                days={days}
                onSelect={(d) => {
                  setPickedDate(d);
                  setPickedStart(null);
                }}
                onPrev={() => {
                  setWeekStart(addDays(effectiveWeekStart, -7));
                  setPickedDate(null);
                  setPickedStart(null);
                }}
                onNext={() => {
                  setWeekStart(addDays(effectiveWeekStart, 7));
                  setPickedDate(null);
                  setPickedStart(null);
                }}
              />
              <SlotChips
                slots={date ? slots : []}
                selected={startMin}
                durationMin={durationMin}
                emptyReason={emptyReason}
                onSelect={setPickedStart}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              {slotVanished ? (
                <div role="alert" data-reveal="off" className="rounded-md border border-line bg-bg-sunken p-4">
                  <p className="text-sm text-fg">{booking.errors.taken}</p>
                  <p className="mt-3">
                    <Button type="button" variant="ghost" magnetic={false} onClick={() => go(2)}>
                      {booking.day.pickTime}
                    </Button>
                  </p>
                </div>
              ) : null}
              <DetailsStep
                ids={ids}
                values={details}
                errors={errors}
                touched={touched}
                disabled={status.kind === "pending"}
                onChange={setField}
                onBlur={(f) => {
                  setTouched((prev) => ({ ...prev, [f]: true }));
                  setErrors(validateDetails(details));
                }}
              />
            </div>
          ) : null}
        </div>

        {status.kind === "error" ? (
          <div className="mt-6">
            <ErrorBanner message={status.message} />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            magnetic={false}
            onClick={() => go(Math.max(0, step - 1))}
            disabled={step === 0 || status.kind === "pending"}
          >
            {booking.back}
          </Button>
          <Button type="submit" size="lg" magnetic={false} disabled={!canProceed} loading={status.kind === "pending"}>
            {step < STEPS.length - 1 ? booking.next : booking.submit}
          </Button>
        </div>
      </form>

      <SummaryCard
        data={{ locationKey, serviceKey, date, startMin }}
        onChangeService={serviceKey && step !== 1 && status.kind !== "pending" ? () => go(1) : undefined}
      />
    </div>
  );
}

export function BookingWizard() {
  if (!HAS_BACKEND) return <NoBackend />;
  return <BookingWizardLive />;
}
