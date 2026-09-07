"use client";

import { gsap } from "./gsap";

/**
 * Reprodukcija hero uvoda jednim skrolom (spec 18 → B).
 *
 * ZAHTEV: sa samog vrha strane jedan mali pokret točkića (ili prvi dodir-povlačenje) pušta CELU
 * koreografiju u ~2,2 s, korisnik ne mora da skroluje kroz nju, a kad se završi strana sama
 * odskroluje do sledeće sekcije — istim parallax preklopom koji već postoji.
 *
 * KO VOZI `p`. Koreografija (`lib/heroChoreography.ts`) se ne dira; menja se samo izvor:
 * `p = max(timeP, scrollP)`. Ali `p` NIJE samo izgled — `stageLag(p)` i `shelfEdgeInStage(p)`
 * prevode napredak u PIKSELE rasporeda i oba pretpostavljaju `p === scrollP` (sticky stage
 * miruje do HOLD_END, posle zaostaje za stranom). Vremenski `p` uz zaključan skrol na 0 bi na
 * `p = 0.75` gurnuo stage 29 % visine kadra naniže i bočicu ostavio da lebdi iznad police —
 * kompozicija bi pukla. Zato reprodukcija vozi VREME I SKROL u koraku: tween piše `timeP` i
 * istim brojem programski postavlja poziciju strane. `max(timeP, scrollP)` je i dalje ono što
 * se izvršava i štiti od dva ivična slučaja: kad ScrollTrigger kasni frejm, vreme vodi; kad
 * korisnik prekine i skoči napred, skrol vodi. Odstupanje od slova specifikacije je upisano u
 * docs/STATUS.md.
 *
 * Zaključavanje postoji SAMO ovde i ima tri izlaza (nikad zamka): drugi namerni ulaz, `Escape`
 * ili klik, i tvrdi tajmer od 3 s koji radi i kad je tab u pozadini (`setTimeout` se izvršava i
 * tada, `requestAnimationFrame` ne). Nijedan ulaz ne sme da bude progutan duže od 150 ms.
 */

/** Trajanje reprodukcije — jedan broj, sve ostalo se izvodi iz njega (spec 18 → C1). */
export const PLAY_MS = 2200;
/** Dokle vreme vozi `p`; ostatak (0.75 → 1) vozi handoff skrol, pa je preklop isti kao i do sada. */
export const PLAY_TARGET_P = 0.75;
/** Koliko mirovanja na vrhu pre nego što se reprodukcija naoruža (povratak na vrh ne okida odmah). */
export const ARM_HOLD_MS = 350;
/** Na vrhu smo dok je `scrollY` ispod ovoga. */
export const TOP_EPSILON = 2;
/** Auto-skrol do `.hero-overlap`. */
export const HANDOFF_S = 0.9;
/** Tvrdi kraj: `playing` ne sme da traje duže od ovoga ni pod kojim uslovima. */
export const HARD_STOP_MS = 3000;
/** Kumulativni `deltaY` posle okidača koji znači „pusti me". */
export const ABORT_WHEEL_PX = 120;
/** Povlačenje prstom posle okidača koje znači isto. */
export const ABORT_TOUCH_PX = 60;
/** Povlačenje prstom koje pušta animaciju. */
export const TRIGGER_TOUCH_PX = 6;
/** Posle ovoliko poseta u sesiji uvod ide kraće — povratnika ne kažnjavamo punim uvodom. */
export const REPEAT_VISITS = 3;
export const REPEAT_SCALE = 0.6;
export const VISITS_KEY = "bbm-hero-visits";

export type PlaybackState = "idle" | "armed" | "playing" | "handoff" | "done";

export type PlaybackHost = {
  /** `p` iz vremena; `null` otpušta vremenski izvor i dalje vozi samo skrol. */
  setTimeProgress(p: number | null): void;
  /** Postavi poziciju strane na `p` hero zone (programski, u prozoru reprodukcije). */
  syncScroll(p: number): void;
  /** Vrh `.hero-overlap` u px od vrha dokumenta; `null` = ne znamo, handoff se preskače. */
  handoffTarget(): number | null;
  lock(): void;
  unlock(): void;
  /** Glatki skrol do `y`; `null` znači „nema Lenis-a", tada handoff ide nativno. */
  scrollTo(y: number, seconds: number): void;
  /** Prvi gest — odavde ide iOS zahtev za žiroskop (mora sinhrono iz gesta). */
  onGesture(): void;
  onState(state: PlaybackState): void;
};

/** `easeInOutCubic` iz specifikacije, u zapisu koji Lenis prima. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Koliko traje uvod za ovu posetu: pun, ili 60 % za `?nointro` i povratnika (spec 18 → C4). */
export function playDuration(search: string, visits: number): number {
  const short = search.includes("nointro") || visits >= REPEAT_VISITS;
  return short ? PLAY_MS * REPEAT_SCALE : PLAY_MS;
}

/** Broj poseta u ovoj sesiji, uvećan za tekuću. Privatni režim = uvek prva. */
function bumpVisits(): number {
  try {
    const next = Number(window.sessionStorage.getItem(VISITS_KEY) ?? 0) + 1;
    window.sessionStorage.setItem(VISITS_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

/** Fokus je u polju za unos — tada strelica i razmak pišu, ne skroluju. */
function typing(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Meni ili dijalog drži svoj lock (`body { overflow: hidden }`) — tada se ne naoružavamo. */
function blocked(): boolean {
  return document.body.style.overflow === "hidden";
}

export function createHeroPlayback(host: PlaybackHost) {
  let state: PlaybackState = "idle";
  let armTimer = 0;
  let hardTimer = 0;
  let tween: gsap.core.Tween | null = null;
  const proxy = { v: 0 };
  let wheelSince = 0;
  let touchStartY = 0;
  let handoffAt = 0;
  const duration = playDuration(window.location.search, bumpVisits());

  const setState = (next: PlaybackState) => {
    if (next === state) return;
    state = next;
    host.onState(next);
  };

  /* ---------------- naoružavanje ---------------- */

  const disarm = () => {
    if (armTimer) {
      window.clearTimeout(armTimer);
      armTimer = 0;
    }
    if (state === "armed") setState("done");
  };

  const watchTop = () => {
    if (state === "playing" || state === "handoff") return;
    const top = window.scrollY <= TOP_EPSILON;
    if (!top) {
      disarm();
      return;
    }
    if (state === "armed" || armTimer) return;
    armTimer = window.setTimeout(() => {
      armTimer = 0;
      // Uslovi se proveravaju TEK sada: za 350 ms se i meni otvori i fokus pomeri.
      if (window.scrollY > TOP_EPSILON || blocked() || typing()) return;
      host.setTimeProgress(null);
      setState("armed");
    }, ARM_HOLD_MS);
  };

  /* ---------------- reprodukcija ---------------- */

  const finish = (runHandoff: boolean) => {
    if (state !== "playing") return;
    if (hardTimer) {
      window.clearTimeout(hardTimer);
      hardTimer = 0;
    }
    if (tween) {
      tween.kill();
      tween = null;
    }
    // Vremenski izvor se OTPUŠTA, ne zamrzava na 0.75: skrol je već tu gde treba (vozili smo ga
    // u koraku), pa `p = scrollP` daje isti kadar bez skoka — i ostaje ispravan kad se korisnik
    // kasnije vrati nagore.
    host.setTimeProgress(null);
    host.unlock();
    if (!runHandoff) {
      setState("done");
      return;
    }
    const target = host.handoffTarget();
    setState("handoff");
    handoffAt = performance.now();
    if (target !== null) host.scrollTo(target, HANDOFF_S);
    // Lenis sam otkazuje `scrollTo` na korisnikov ulaz; nama ostaje samo da zatvorimo stanje.
    window.setTimeout(() => {
      if (state === "handoff") setState("done");
    }, HANDOFF_S * 1000 + 60);
  };

  const play = () => {
    if (state !== "armed") return;
    host.onGesture();
    setState("playing");
    wheelSince = 0;
    proxy.v = 0;
    host.lock();
    tween = gsap.to(proxy, {
      v: PLAY_TARGET_P,
      duration: duration / 1000,
      ease: "power2.inOut",
      onUpdate: () => {
        host.setTimeProgress(proxy.v);
        host.syncScroll(proxy.v);
      },
      onComplete: () => finish(true),
    });
    // Tvrdi tajmer: `setTimeout` radi i u pozadinskom tabu, `requestAnimationFrame` ne. Bez
    // ovoga bi sakriven tab ostavio zaključanu stranu do povratka.
    hardTimer = window.setTimeout(() => {
      hardTimer = 0;
      finish(true);
    }, HARD_STOP_MS);
  };

  /* ---------------- ulazi ---------------- */

  const onWheel = (e: WheelEvent) => {
    if (state === "armed") {
      if (e.deltaY > 0) play();
      return;
    }
    if (state !== "playing") return;
    wheelSince += Math.abs(e.deltaY);
    if (wheelSince > ABORT_WHEEL_PX) finish(true);
  };

  const onTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0]?.clientY ?? 0;
  };

  const onTouchMove = (e: TouchEvent) => {
    const y = e.touches[0]?.clientY ?? 0;
    const moved = touchStartY - y;
    if (state === "armed") {
      if (moved > TRIGGER_TOUCH_PX) play();
      return;
    }
    if (state === "playing" && Math.abs(moved) > ABORT_TOUCH_PX) finish(true);
  };

  const onKey = (e: KeyboardEvent) => {
    if (typing()) return;
    if (state === "playing") {
      if (e.key === "Escape") finish(true);
      return;
    }
    if (state !== "armed") return;
    if (e.key === " " || e.key === "Spacebar" || e.key === "PageDown" || e.key === "ArrowDown") play();
  };

  /**
   * Klik bilo gde prekida. Izuzetak je hero CTA: on ima svoju nameru (`#zakazivanje`) i sam
   * zove `skip(false)` — auto-skrol na `.hero-overlap` bi mu otimao sidro.
   */
  const onClick = (e: MouseEvent) => {
    if (state !== "playing") return;
    const el = e.target;
    if (el instanceof Element && el.closest("[data-hero-cta]")) return;
    finish(true);
  };

  const onVisibility = () => {
    if (document.hidden && state === "playing") finish(true);
  };

  const onScroll = () => {
    if (state === "handoff" && performance.now() - handoffAt > HANDOFF_S * 1000) setState("done");
    watchTop();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("keydown", onKey);
  window.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onVisibility);
  watchTop();

  return {
    state: () => state,
    /** „Preskoči" dugme i hero CTA. `handoff` = da li posle preskoka ide auto-skrol. */
    skip: (handoff = true) => finish(handoff),
    destroy: () => {
      if (armTimer) window.clearTimeout(armTimer);
      if (hardTimer) window.clearTimeout(hardTimer);
      if (tween) tween.kill();
      if (state === "playing") host.unlock();
      host.setTimeProgress(null);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export type HeroPlayback = ReturnType<typeof createHeroPlayback>;
