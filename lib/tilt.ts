/**
 * Nagib pozadine heroja — JEDAN izvor, dva ulaza (spec 18 → D).
 *
 * Do koraka 18 je „polje se pomera za mišem" bio desktop luksuz: `pointermove` je pisao u
 * `drivers.pointer`, a telefon je gledao mrtvu sliku. Žiroskop daje isti vektor iz istog
 * modula — shader (`uPointer`), bočica (nagib tela) i svetla ne znaju odakle je došao.
 *
 * Izlaz: `{ x, y }` u opsegu −1..1, isti ugovor kao pointer (x nadesno, y nagore).
 *
 *  - `pointermove` samo za finu kazaljku (`hover: hover` i `pointer: fine`), amplituda 1;
 *  - `deviceorientation` inače, amplituda POLA (`GYRO_AMPLITUDE`) — telefon se stalno mrda,
 *    pozadina sme samo da diše;
 *  - kalibracija na PRVO očitavanje (`beta0`/`gamma0`): korisnik drži telefon kako drži, taj
 *    ugao je nula. Ne pretpostavljamo da neko čita ekran vodoravno;
 *  - mrtva zona 1.5°, pa lerp 0.12 po događaju — sirovi `deviceorientation` podrhtava i to bi
 *    se u shaderu videlo kao treperenje polja;
 *  - iOS 13+ traži dozvolu i mora IZ GESTA: `requestGyro()` zove `lib/heroPlayback.ts` iz istog
 *    gesta koji pušta animaciju. Nikad na učitavanju, nikad kroz posebno dugme. Odbijena
 *    dozvola ili API kojeg nema = tiho ostajemo na nuli (idle drift bočice i shader-a i dalje
 *    rade), bez ijedne poruke korisniku.
 *
 * BEZ React i BEZ three importa — čista matematika i DOM slušači.
 */

/** Koliko stepeni nagiba je pun otklon. */
export const GYRO_RANGE_DEG = 25;
/** Ispod ovoga se ne reaguje — ruka nikad ne miruje. */
export const GYRO_DEADZONE_DEG = 1.5;
/** Niskopropusni filter po događaju. */
export const GYRO_LERP = 0.12;
/** Amplituda na telefonu je pola desktopske. */
export const GYRO_AMPLITUDE = 0.5;

export type TiltVector = { x: number; y: number };

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

export type TiltSource = "pointer" | "gyro" | "none";

export type TiltHandle = {
  /** Trenutni izvor — dev provera i STATUS. */
  source(): TiltSource;
  /**
   * Traži iOS dozvolu za `deviceorientation`. Mora da se zove SINHRONO iz korisničkog gesta.
   * Bezopasno je zvati više puta i na uređajima bez tog API-ja.
   */
  requestGyro(): void;
  /** Hero van kadra ili tab sakriven — odjavi slušače (spec 18 → D5). */
  setActive(active: boolean): void;
  destroy(): void;
};

function clamp1(x: number): number {
  return Math.min(1, Math.max(-1, x));
}

/** Ugao sa mrtvom zonom, normalizovan na −1..1 preko `GYRO_RANGE_DEG`. */
export function tiltAxis(delta: number, range = GYRO_RANGE_DEG, deadzone = GYRO_DEADZONE_DEG): number {
  const sign = Math.sign(delta);
  const live = Math.max(0, Math.abs(delta) - deadzone);
  // `|| 0`: mrtva zona sa negativne strane inače vraća -0, a to putuje kroz lerp u shader.
  return clamp1((sign * live) / range) || 0;
}

/**
 * Kači slušače i piše u `write`. `reduced` (prefers-reduced-motion) ne montira ništa —
 * ni pointer ni žiroskop.
 */
export function createTilt(write: (v: TiltVector) => void, reduced: boolean): TiltHandle {
  if (reduced || typeof window === "undefined") {
    return { source: () => "none", requestGyro: () => {}, setActive: () => {}, destroy: () => {} };
  }

  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let source: TiltSource = "none";
  let active = true;
  let granted = false;
  let asked = false;
  /** Ugao pri prvom očitavanju — nula ovog korisnika. */
  let beta0: number | null = null;
  let gamma0 = 0;
  const smooth: TiltVector = { x: 0, y: 0 };

  const onPointer = (e: PointerEvent) => {
    if (!active) return;
    write({
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: 1 - (e.clientY / window.innerHeight) * 2,
    });
  };

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (!active || e.beta === null || e.gamma === null) return;
    if (beta0 === null) {
      beta0 = e.beta;
      gamma0 = e.gamma;
      return;
    }
    const x = tiltAxis(e.gamma - gamma0);
    const y = tiltAxis(e.beta - beta0);
    smooth.x += (x - smooth.x) * GYRO_LERP;
    smooth.y += (y - smooth.y) * GYRO_LERP;
    // `beta` raste kad se vrh telefona naginje KA korisniku; polje tada treba da ide nagore,
    // isti smer kao kad miš ide ka vrhu ekrana — otud minus.
    write({ x: smooth.x * GYRO_AMPLITUDE, y: -smooth.y * GYRO_AMPLITUDE });
  };

  const attachGyro = () => {
    if (granted) return;
    granted = true;
    source = "gyro";
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
  };

  if (fine) {
    source = "pointer";
    window.addEventListener("pointermove", onPointer, { passive: true });
  }

  const requestGyro = () => {
    if (fine || asked || typeof DeviceOrientationEvent === "undefined") return;
    asked = true;
    const ctor = DeviceOrientationEvent as OrientationCtor;
    if (typeof ctor.requestPermission !== "function") {
      // Android i stariji iOS: događaj stiže bez pitanja.
      attachGyro();
      return;
    }
    ctor
      .requestPermission()
      .then((state) => {
        if (state === "granted") attachGyro();
      })
      .catch(() => {
        /* Odbijeno ili van gesta — tiho ostajemo bez nagiba. */
      });
  };

  return {
    source: () => source,
    requestGyro,
    setActive: (next) => {
      if (next === active) return;
      active = next;
      // Van kadra vraćamo polje u miran položaj; ugao se rekalibriše na povratku.
      if (!next) {
        smooth.x = 0;
        smooth.y = 0;
        beta0 = null;
        write({ x: 0, y: 0 });
      }
    },
    destroy: () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrientation);
    },
  };
}
