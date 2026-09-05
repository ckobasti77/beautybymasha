import { describe, expect, it } from "vitest";
import {
  ACTS,
  BOTTLE_HEIGHT_RATIO,
  COPY_LIFT_PX,
  EXIT_SCALE,
  STAGE_LAG_RATIO,
  TILT_X_DEG,
  TILT_Z_DEG,
  bottleLayout,
  heroChoreography,
  holdEndOf,
  logoSwap,
  pourCoverage,
  pourFront,
  pourMaxRadius,
  smoothstep,
  stageLag,
  stageTop,
  visibleHeightAt,
} from "./heroChoreography";

describe("heroChoreography", () => {
  it("na vrhu heroja ništa nije počelo, bočica lebdi", () => {
    const c = heroChoreography(0);
    expect(c.idle).toBe(1);
    expect(c.tiltZ).toBe(0);
    expect(c.tiltX).toBe(0);
    expect(c.drop).toBe(0);
    expect(c.dropVisible).toBe(false);
    expect(c.pour).toBe(0);
    expect(c.scale).toBe(1);
    expect(c.drift).toBe(0);
    expect(c.opacity).toBe(1);
    expect(c.logo).toBe(0);
    expect(c.wordmarkOpacity).toBe(1);
    expect(c.navLogoOpacity).toBe(0);
    expect(c.copyOpacity).toBe(1);
    expect(c.copyY).toBe(0);
    expect(c.copyInteractive).toBe(true);
    expect(c.copyHidden).toBe(false);
  });

  it("idle se gasi do 0.10, pre nego što kap krene da raste", () => {
    expect(heroChoreography(0.05).idle).toBeGreaterThan(0);
    expect(heroChoreography(0.1).idle).toBe(0);
    expect(heroChoreography(ACTS.dropGrow[0]).idle).toBe(0);
  });

  it("na 0.30: nagib pun, wordmark stigao u slot, kap puna i još na vratu, razlivanje nije počelo", () => {
    const c = heroChoreography(0.3);
    expect(c.tiltZ).toBeCloseTo(TILT_Z_DEG, 6);
    expect(c.tiltX).toBeCloseTo(TILT_X_DEG, 6);
    expect(c.logo).toBe(1);
    expect(c.drop).toBeCloseTo(1, 6);
    expect(c.fall).toBe(0);
    expect(c.dropVisible).toBe(true);
    expect(c.pour).toBe(0);
    expect(c.wordmarkOpacity).toBe(1);
    expect(c.navLogoOpacity).toBe(0);
  });

  it("crossfade 0.30–0.36: zbir je uvek 1, nikad oba loga preko 0.5", () => {
    for (const p of [0.3, 0.31, 0.33, 0.35, 0.36, 0.5]) {
      const c = heroChoreography(p);
      expect(c.wordmarkOpacity + c.navLogoOpacity).toBeCloseTo(1, 9);
      expect(Math.min(c.wordmarkOpacity, c.navLogoOpacity)).toBeLessThanOrEqual(0.5);
    }
    expect(heroChoreography(0.36).wordmarkOpacity).toBe(0);
    expect(heroChoreography(0.36).navLogoOpacity).toBe(1);
  });

  it("kap pada 0.30–0.40 ubrzavajući, na 0.40 je nema", () => {
    const a = heroChoreography(0.33).fall;
    const b = heroChoreography(0.37).fall;
    expect(a).toBeGreaterThan(0);
    expect(b - a).toBeGreaterThan(a); // t² — drugi deo puta je duži
    expect(heroChoreography(0.4).fall).toBe(1);
    expect(heroChoreography(0.4).dropVisible).toBe(false);
    expect(heroChoreography(0.36).dropVisible).toBe(true);
  });

  it("razlivanje 0.36–0.78, copy odlazi 0.55–0.85, bočica izlazi 0.60–1", () => {
    expect(heroChoreography(0.36).pour).toBe(0);
    expect(heroChoreography(0.57).pour).toBeCloseTo(0.5, 6);
    expect(heroChoreography(0.78).pour).toBe(1);

    expect(heroChoreography(0.55).copyOpacity).toBe(1);
    expect(heroChoreography(0.55).copyInteractive).toBe(false);
    expect(heroChoreography(0.549).copyInteractive).toBe(true);
    expect(heroChoreography(0.7).copyOpacity).toBeCloseTo(0.5, 6);
    expect(heroChoreography(0.7).copyY).toBeCloseTo(-COPY_LIFT_PX / 2, 6);
    expect(heroChoreography(0.85).copyOpacity).toBe(0);
    expect(heroChoreography(0.85).copyHidden).toBe(true);
    expect(heroChoreography(0.849).copyHidden).toBe(false);

    expect(heroChoreography(0.6).scale).toBe(1);
    expect(heroChoreography(0.6).opacity).toBe(1);
    const c = heroChoreography(1);
    expect(c.scale).toBeCloseTo(EXIT_SCALE, 6);
    expect(c.drift).toBeCloseTo(1, 6);
    expect(c.opacity).toBeCloseTo(0, 6);
    expect(c.pour).toBe(1);
  });

  it("stega: vrednosti van 0..1 se ponašaju kao krajevi", () => {
    expect(heroChoreography(-0.5)).toEqual(heroChoreography(0));
    expect(heroChoreography(1.5)).toEqual(heroChoreography(1));
  });

  it("svaki čin je monoton po napretku (bez trzaja unazad)", () => {
    let prev = heroChoreography(0);
    for (let i = 1; i <= 200; i += 1) {
      const c = heroChoreography(i / 200);
      expect(c.idle).toBeLessThanOrEqual(prev.idle);
      expect(c.tiltZ).toBeGreaterThanOrEqual(prev.tiltZ);
      expect(c.drop).toBeGreaterThanOrEqual(prev.drop);
      expect(c.fall).toBeGreaterThanOrEqual(prev.fall);
      expect(c.pour).toBeGreaterThanOrEqual(prev.pour);
      expect(c.logo).toBeGreaterThanOrEqual(prev.logo);
      expect(c.navLogoOpacity).toBeGreaterThanOrEqual(prev.navLogoOpacity);
      expect(c.copyOpacity).toBeLessThanOrEqual(prev.copyOpacity);
      expect(c.scale).toBeLessThanOrEqual(prev.scale);
      expect(c.opacity).toBeLessThanOrEqual(prev.opacity);
      expect(c.drift).toBeGreaterThanOrEqual(prev.drift);
      prev = c;
    }
  });

  it("logoSwap: bez puta je zamena stepenasta na pragu", () => {
    expect(logoSwap(0.29, 0.3)).toBe(0);
    expect(logoSwap(0.3, 0.3)).toBe(1);
    expect(logoSwap(0.49, 0.5)).toBe(0);
  });

  it("smoothstep ima meke krajeve", () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 6);
    expect(smoothstep(0, 1, 0.01)).toBeLessThan(0.001);
    expect(1 - smoothstep(0, 1, 0.99)).toBeLessThan(0.001);
  });
});

describe("sticky zona", () => {
  const VH = 900;
  const H = 1.7 * VH; // 170 vh
  const HOLD = holdEndOf(H, VH);

  it("HOLD_END iz izmerenih visina: 170 vh → 0.41, 130 vh → 0.23, 100 vh → 0", () => {
    expect(HOLD).toBeCloseTo(70 / 170, 9);
    expect(holdEndOf(1.3 * 844, 844)).toBeCloseTo(30 / 130, 9);
    expect(holdEndOf(VH, VH)).toBe(0);
    expect(holdEndOf(0, VH)).toBe(0);
  });

  it("do HOLD_END stage stoji na vrhu kadra (miruje), bez laga", () => {
    for (const p of [0, 0.1, 0.3, HOLD]) {
      expect(stageTop(p, HOLD, H, VH)).toBe(0);
      expect(stageLag(p, HOLD, VH)).toBe(0);
    }
  });

  it("posle holda sekcija ga gura naviše, a lag vraća do 40 % visine na kraju", () => {
    const mid = (HOLD + 1) / 2;
    expect(stageLag(mid, HOLD, VH)).toBeCloseTo(STAGE_LAG_RATIO * VH * 0.5, 6);
    expect(stageLag(1, HOLD, VH)).toBeCloseTo(STAGE_LAG_RATIO * VH, 9);
    // na p = 1 dno sekcije je na vrhu kadra: stage bi bio na −vh, lag ga spušta za 40 % vh
    expect(stageTop(1, HOLD, H, VH)).toBeCloseTo(-VH + STAGE_LAG_RATIO * VH, 6);
    // strogo opada: lag nikad ne prestigne pomeraj strane
    let prev = 0;
    for (let i = 1; i <= 100; i += 1) {
      const top = stageTop(HOLD + ((1 - HOLD) * i) / 100, HOLD, H, VH);
      expect(top).toBeLessThanOrEqual(prev);
      prev = top;
    }
  });

  it("reduced motion: hold 1 nema laga; zona 100 vh ima hold 0", () => {
    expect(stageLag(0.5, 1, VH)).toBe(0);
    expect(stageTop(0.5, 0, VH, VH)).toBeCloseTo(-0.5 * VH + STAGE_LAG_RATIO * VH * smoothstep(0, 1, 0.5), 6);
  });
});

describe("radijalno razlivanje", () => {
  const ORIGIN = { x: 0.7, y: 0 };
  const ASPECT = 1440 / 900;

  it("najdalji ugao je gore levo kad kap izlazi dole desno", () => {
    const r = pourMaxRadius(ORIGIN, ASPECT);
    expect(r).toBeCloseTo(Math.hypot(0.7 * ASPECT, 1), 9);
  });

  it("na uPour = 0 front je van kadra: ništa nije prekriveno, ni u samom ishodištu", () => {
    expect(pourFront(0, 2)).toBeLessThan(-0.2);
    expect(pourCoverage(ORIGIN, ORIGIN, ASPECT, 0)).toBe(0);
    expect(pourCoverage({ x: 0.3, y: 0.46 }, ORIGIN, ASPECT, 0)).toBe(0);
  });

  it("na uPour = 1 ceo kadar je prekriven, uključujući najdalji ugao", () => {
    expect(pourCoverage({ x: 0, y: 1 }, ORIGIN, ASPECT, 1)).toBeCloseTo(1, 6);
    expect(pourCoverage({ x: 1, y: 1 }, ORIGIN, ASPECT, 1)).toBeCloseTo(1, 6);
  });

  it("front stiže do centra copy kolone tek posle polovine razlivanja", () => {
    const copy = { x: 0.3, y: 0.46 };
    expect(pourCoverage(copy, ORIGIN, ASPECT, 0.3)).toBeLessThan(0.5);
    expect(pourCoverage(copy, ORIGIN, ASPECT, 0.7)).toBeGreaterThan(0.5);
    // ishodište je prekriveno mnogo ranije
    expect(pourCoverage(ORIGIN, ORIGIN, ASPECT, 0.3)).toBeCloseTo(1, 6);
  });
});

describe("bottleLayout", () => {
  const MODEL = 9.48;

  it("bočica staje u desnu polovinu i zauzima 62 % visine", () => {
    const vh = visibleHeightAt(30, 28);
    const vw = vh * (1440 / 900);
    const l = bottleLayout(vw, vh, MODEL);
    expect(l.x).toBeCloseTo(vw / 4, 6);
    expect(l.scale * MODEL).toBeCloseTo(vh * BOTTLE_HEIGHT_RATIO, 6);
  });

  it("širi monitor gura bočicu dalje udesno, ali joj ne menja visinu", () => {
    const vh = visibleHeightAt(30, 28);
    const a = bottleLayout(vh * (1440 / 900), vh, MODEL);
    const b = bottleLayout(vh * (1920 / 1080), vh, MODEL);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.scale).toBeCloseTo(a.scale, 9);
  });

  it("visibleHeightAt: fov 30 na 28 jedinica daje ~15 jedinica kadra", () => {
    expect(visibleHeightAt(30, 28)).toBeCloseTo(15.0, 1);
  });
});
