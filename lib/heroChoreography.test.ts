import { describe, expect, it } from "vitest";
import {
  BODY_HALF,
  BRUSH_TIP_Y,
  CAP_LIFT_OUT,
  HERO_CAMERA,
  NECK_TOP,
  TOTAL_HEIGHT,
} from "./bottleDims";
import {
  ACTS,
  CAP_SPIN_CLOSE_DEG,
  CAP_SPIN_OPEN_DEG,
  CAP_TILT_DEG,
  COPY_HIDDEN_P,
  EXIT,
  FOV_OPEN,
  FOV_REST,
  SHELF_SCALE,
  SPARKLE_MAX,
  SPARKLE_MIN,
  STAGE_LAG_RATIO,
  WORD_EXIT_Y,
  YAW_DEG,
  blockExitAt,
  copyReflowAt,
  expoInOut,
  heroChoreography,
  holdEndOf,
  logoSwap,
  pourCoverage,
  pourFront,
  pourMaxRadius,
  power2InOut,
  power3InOut,
  shelfEdgeInStage,
  smoothstep,
  stageLag,
  stageTop,
  wordExitAt,
} from "./heroChoreography";
import { BOTTLE_HEIGHT_RATIO, bottleLayout, bottleScreen, visibleHeightAt } from "./bottleScreen";

describe("heroChoreography v3", () => {
  it("na vrhu heroja ništa nije počelo: bočica lebdi, zatvorena, kamera u miru", () => {
    const c = heroChoreography(0);
    expect(c.idle).toBe(1);
    expect(c.interact).toBe(1);
    expect(c.fov).toBe(FOV_REST);
    expect(c.yawDeg).toBe(0);
    expect(c.capOut).toBe(0);
    expect(c.capSpinDeg).toBe(0);
    expect(c.capAway).toBe(0);
    expect(c.capTiltDeg).toBe(0);
    expect(c.drop).toBe(0);
    expect(c.dropVisible).toBe(false);
    expect(c.pour).toBe(0);
    expect(c.sparkle).toBe(SPARKLE_MIN);
    expect(c.shelf).toBe(0);
    expect(c.shelfScale).toBe(1);
    expect(c.shelfX).toBe(0);
    expect(c.shadowOpacity).toBe(0);
    expect(c.frostClip).toBe(100);
    expect(c.copyInteractive).toBe(true);
    expect(c.copyHidden).toBe(false);
    expect(c.copyFade).toBe(1);
  });

  it("idle se gasi do 0.10, interakcija do 0.20 (poza mora biti deterministička pre kapi)", () => {
    expect(heroChoreography(0.05).idle).toBeGreaterThan(0);
    expect(heroChoreography(0.1).idle).toBe(0);
    expect(heroChoreography(0.15).interact).toBeGreaterThan(0);
    expect(heroChoreography(0.2).interact).toBe(0);
    expect(heroChoreography(ACTS.dropGrow[0]).interact).toBe(0);
  });

  it("otvaranje 0.04–0.22: zatvarač 720°, četkica napolju, fov 34, yaw −25°, telo uspravno", () => {
    const c = heroChoreography(0.22);
    expect(c.capOut).toBeCloseTo(1, 9);
    expect(c.capSpinDeg).toBeCloseTo(CAP_SPIN_OPEN_DEG, 6);
    expect(c.fov).toBeCloseTo(FOV_OPEN, 9);
    expect(c.yawDeg).toBeCloseTo(YAW_DEG, 9);
    expect(c.capAway).toBe(0);
    // vrh dlačica iznad vrata + 0.3 — iz geometrije, ne hardkodovano
    expect(BRUSH_TIP_Y + CAP_LIFT_OUT * c.capOut).toBeCloseTo(NECK_TOP + 0.3, 9);
    expect(BRUSH_TIP_Y).toBeGreaterThan(0.14);
    expect(BRUSH_TIP_Y).toBeLessThan(1);
    const mid = heroChoreography(0.13);
    expect(mid.capOut).toBeGreaterThan(0);
    expect(mid.capOut).toBeLessThan(1);
    expect(mid.capSpinDeg).toBeCloseTo(CAP_SPIN_OPEN_DEG * mid.capOut, 6);
  });

  it("zatvarač odlazi ulevo i naginje se 0.22–0.30, kap raste na dlačicama 0.24–0.32, pada 0.32–0.42", () => {
    expect(heroChoreography(0.3).capAway).toBeCloseTo(1, 9);
    expect(heroChoreography(0.3).capTiltDeg).toBeCloseTo(CAP_TILT_DEG, 9);
    expect(heroChoreography(0.24).drop).toBe(0);
    expect(heroChoreography(0.32).drop).toBeCloseTo(1, 9);
    expect(heroChoreography(0.32).fall).toBe(0);
    expect(heroChoreography(0.3).dropVisible).toBe(true);
    const a = heroChoreography(0.35).fall;
    const b = heroChoreography(0.39).fall;
    expect(a).toBeGreaterThan(0);
    expect(b - a).toBeGreaterThan(a); // t² — drugi deo puta je duži
    expect(heroChoreography(0.42).fall).toBe(1);
    expect(heroChoreography(0.42).dropVisible).toBe(false);
    // kap se otkači tek kad zatvarač stane
    expect(ACTS.capAway[1]).toBeLessThanOrEqual(ACTS.dropFall[0]);
  });

  it("frost clip 0.30–0.42: 100 % na 0.30, delimičan na 0.36, 0 na 0.42", () => {
    expect(heroChoreography(0.3).frostClip).toBe(100);
    const mid = heroChoreography(0.36).frostClip;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
    expect(heroChoreography(0.42).frostClip).toBe(0);
  });

  it("razlivanje 0.36–0.78, kamera se vraća 0.42–0.58, bočica zablista dok front prolazi 0.5", () => {
    expect(heroChoreography(0.36).pour).toBe(0);
    expect(heroChoreography(0.57).pour).toBeCloseTo(0.5, 6);
    expect(heroChoreography(0.78).pour).toBe(1);
    expect(heroChoreography(0.42).fov).toBeCloseTo(FOV_OPEN, 9);
    expect(heroChoreography(0.58).fov).toBeCloseTo(FOV_REST, 9);
    expect(heroChoreography(0.5).sparkle).toBeCloseTo(SPARKLE_MAX, 9);
    expect(heroChoreography(0.78).sparkle).toBeCloseTo(SPARKLE_MIN, 9);
    expect(heroChoreography(0.45).sparkle).toBeGreaterThan(SPARKLE_MIN);
  });

  it("zatvaranje: 0.58–0.64 nazad nad vrat, 0.64–0.74 spušta se i zavrće 360°; na 0.74 zatvoreno", () => {
    expect(heroChoreography(0.58).capAway).toBeCloseTo(1, 9);
    expect(heroChoreography(0.64).capAway).toBe(0);
    expect(heroChoreography(0.64).capOut).toBeCloseTo(1, 9);
    const c = heroChoreography(0.74);
    expect(c.capOut).toBeCloseTo(0, 9);
    expect(c.capSpinDeg).toBeCloseTo(CAP_SPIN_OPEN_DEG - CAP_SPIN_CLOSE_DEG, 6);
    expect(heroChoreography(1).capOut).toBe(0);
  });

  it("polica: sletanje 0.62–0.70, skala 1 → 0.55 i x do 0.78, senka od 0.70", () => {
    expect(heroChoreography(0.62).shelf).toBe(0);
    expect(heroChoreography(0.7).shelf).toBeCloseTo(1, 9);
    expect(heroChoreography(0.62).shelfScale).toBe(1);
    expect(heroChoreography(0.78).shelfScale).toBeCloseTo(SHELF_SCALE, 9);
    expect(heroChoreography(0.78).shelfX).toBeCloseTo(1, 9);
    expect(heroChoreography(0.7).shadowOpacity).toBe(0);
    expect(heroChoreography(0.8).shadowOpacity).toBe(1);
    expect(heroChoreography(0.75).sway).toBe(0);
    expect(heroChoreography(0.3).sway).toBe(0);
    expect(heroChoreography(0.15).sway).toBeGreaterThan(0);
  });

  it("copy: klik do 0.55, `hidden` od 0.85, reduced fade 0.55–0.85", () => {
    expect(heroChoreography(0.549).copyInteractive).toBe(true);
    expect(heroChoreography(0.55).copyInteractive).toBe(false);
    expect(heroChoreography(0.849).copyHidden).toBe(false);
    expect(heroChoreography(COPY_HIDDEN_P).copyHidden).toBe(true);
    expect(heroChoreography(0.55).copyFade).toBe(1);
    expect(heroChoreography(0.7).copyFade).toBeCloseTo(0.5, 6);
    expect(heroChoreography(0.85).copyFade).toBe(0);
  });

  it("stega: vrednosti van 0..1 se ponašaju kao krajevi", () => {
    expect(heroChoreography(-0.5)).toEqual(heroChoreography(0));
    expect(heroChoreography(1.5)).toEqual(heroChoreography(1));
  });

  it("monotonost gde važi (bez trzaja unazad)", () => {
    let prev = heroChoreography(0);
    for (let i = 1; i <= 200; i += 1) {
      const c = heroChoreography(i / 200);
      expect(c.idle).toBeLessThanOrEqual(prev.idle);
      expect(c.interact).toBeLessThanOrEqual(prev.interact);
      expect(c.drop).toBeGreaterThanOrEqual(prev.drop);
      expect(c.fall).toBeGreaterThanOrEqual(prev.fall);
      expect(c.pour).toBeGreaterThanOrEqual(prev.pour);
      expect(c.frostClip).toBeLessThanOrEqual(prev.frostClip);
      expect(c.shelf).toBeGreaterThanOrEqual(prev.shelf);
      expect(c.shelfScale).toBeLessThanOrEqual(prev.shelfScale);
      expect(c.shelfX).toBeGreaterThanOrEqual(prev.shelfX);
      expect(c.shadowOpacity).toBeGreaterThanOrEqual(prev.shadowOpacity);
      expect(c.yawDeg).toBeLessThanOrEqual(prev.yawDeg);
      prev = c;
    }
  });

  it("logoSwap: bez puta je zamena stepenasta na pragu", () => {
    expect(logoSwap(0.29, 0.3)).toBe(0);
    expect(logoSwap(0.3, 0.3)).toBe(1);
    expect(logoSwap(0.49, 0.5)).toBe(0);
  });

  it("ease-ovi imaju tačne krajeve", () => {
    for (const ease of [smoothstep.bind(null, 0, 1), expoInOut, power2InOut, power3InOut]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(0.5)).toBeCloseTo(0.5, 6);
    }
    expect(expoInOut(0.36)).toBeLessThan(0.1); // slovo tek kreće
  });
});

describe("copy: reflow i izlaz reč po reč", () => {
  it("h1 završava tačno na 0.30, elementi iza kasne po 0.02; bez puta reflow tek posle zamene", () => {
    expect(copyReflowAt(0.12, 0)).toBe(0);
    expect(copyReflowAt(0.3, 0)).toBe(1);
    expect(copyReflowAt(0.3, 1)).toBeLessThan(1);
    expect(copyReflowAt(0.32, 1)).toBe(1);
    expect(copyReflowAt(0.36, 3)).toBe(1);
    expect(copyReflowAt(0.29, 0, true)).toBe(0);
    expect(copyReflowAt(0.48, 0, true)).toBe(1);
  });

  it("reflow ne ulazi u prostor slova pre nego što ona odu: na 0.22 h1 je prešao < 70 %", () => {
    expect(copyReflowAt(0.22, 0)).toBeLessThan(0.7);
  });

  it("reči izlaze od poslednje ka prvoj, svaka pada 18 px i bledi", () => {
    const n = 10;
    const last = wordExitAt(0.66, n - 1, n, EXIT.title);
    const first = wordExitAt(0.66, 0, n, EXIT.title);
    expect(last.opacity).toBeLessThan(1);
    expect(first.opacity).toBe(1);
    expect(wordExitAt(EXIT.title[0], n - 1, n, EXIT.title).opacity).toBe(1);
    const gone = wordExitAt(EXIT.title[1], 0, n, EXIT.title);
    expect(gone.opacity).toBe(0);
    expect(gone.y).toBe(WORD_EXIT_Y);
    // poslednja reč nestane pre nego što prva krene
    expect(wordExitAt(EXIT.title[0] + EXIT.word, n - 1, n, EXIT.title).opacity).toBe(0);
    expect(wordExitAt(EXIT.title[0] + EXIT.word, 0, n, EXIT.title).opacity).toBe(1);
    // jedna reč: ceo prozor je njen
    expect(wordExitAt(EXIT.lead[0] + EXIT.word / 2, 0, 1, EXIT.lead).opacity).toBeLessThan(1);
  });

  it("blokovi (CTA, strip) idu istim pokretom preko svog prozora; strip pre CTA", () => {
    expect(blockExitAt(0.55, EXIT.strip).opacity).toBe(1);
    expect(blockExitAt(0.65, EXIT.strip).opacity).toBe(0);
    expect(blockExitAt(0.6, EXIT.cta).opacity).toBe(1);
    expect(blockExitAt(0.78, EXIT.cta).y).toBe(WORD_EXIT_Y);
    expect(EXIT.strip[0]).toBeLessThanOrEqual(EXIT.lead[0]);
    expect(EXIT.lead[0]).toBeLessThanOrEqual(EXIT.cta[0]);
    expect(EXIT.cta[0]).toBeLessThanOrEqual(EXIT.title[0]);
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
    expect(stageTop(1, HOLD, H, VH)).toBeCloseTo(-VH + STAGE_LAG_RATIO * VH, 6);
    let prev = 0;
    for (let i = 1; i <= 100; i += 1) {
      const top = stageTop(HOLD + ((1 - HOLD) * i) / 100, HOLD, H, VH);
      expect(top).toBeLessThanOrEqual(prev);
      prev = top;
    }
  });

  it("ivica police u stage-u: dno stage-a tokom holda, pa vh − lag; na ekranu je to H·(1 − p)", () => {
    expect(shelfEdgeInStage(HOLD, HOLD, VH)).toBe(VH);
    for (const p of [0.5, 0.7, 0.85, 0.95, 1]) {
      const inStage = shelfEdgeInStage(p, HOLD, VH);
      expect(stageTop(p, HOLD, H, VH) + inStage).toBeCloseTo(H * (1 - p), 6);
    }
    expect(shelfEdgeInStage(1, HOLD, VH)).toBeCloseTo(VH - STAGE_LAG_RATIO * VH, 9);
  });

  it("reduced motion: hold 1 nema laga; zona 100 vh ima hold 0", () => {
    expect(stageLag(0.5, 1, VH)).toBe(0);
    expect(stageTop(0.5, 0, VH, VH)).toBeCloseTo(-0.5 * VH + STAGE_LAG_RATIO * VH * smoothstep(0, 1, 0.5), 6);
  });
});

describe("radijalno razlivanje", () => {
  const ORIGIN = { x: 0.52, y: 0 };
  const ASPECT = 1440 / 900;

  it("najdalji ugao je gore levo kad kap izlazi desno od centra", () => {
    const r = pourMaxRadius(ORIGIN, ASPECT);
    expect(r).toBeCloseTo(Math.hypot(0.52 * ASPECT, 1), 9);
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

  it("front stiže do ishodišta tek pošto kap padne (p ≈ 0.46), a do copy-ja posle polovine", () => {
    const at = (p: number) => heroChoreography(p).pour;
    expect(pourCoverage(ORIGIN, ORIGIN, ASPECT, at(0.42))).toBeLessThan(0.5);
    expect(pourCoverage(ORIGIN, ORIGIN, ASPECT, at(0.48))).toBeGreaterThan(0.5);
    const copy = { x: 0.3, y: 0.46 };
    expect(pourCoverage(copy, ORIGIN, ASPECT, 0.3)).toBeLessThan(0.5);
    expect(pourCoverage(copy, ORIGIN, ASPECT, 0.7)).toBeGreaterThan(0.5);
  });
});

describe("bočica u kadru", () => {
  const MODEL = TOTAL_HEIGHT;
  const W = 1440;
  const VH = 900;
  const HOLD = holdEndOf(1.7 * VH, VH);

  it("bočica staje u desnu polovinu i zauzima 62 % visine; visibleHeightAt: fov 30 na 28 ≈ 15", () => {
    const vh = visibleHeightAt(30, 28);
    const vw = vh * (W / VH);
    const l = bottleLayout(vw, vh, MODEL);
    expect(l.x).toBeCloseTo(vw / 4, 6);
    expect(l.scale * MODEL).toBeCloseTo(vh * BOTTLE_HEIGHT_RATIO, 6);
    expect(vh).toBeCloseTo(15.0, 1);
    expect(HERO_CAMERA.distance).toBe(28);
    expect(HERO_CAMERA.fov).toBe(FOV_REST);
  });

  it("u miru: centar na 75 % širine, baza na 81 % visine kadra", () => {
    const s = bottleScreen(0, HOLD, W, VH);
    expect(s.x / W).toBeCloseTo(0.75, 6);
    expect(s.baseY / VH).toBeCloseTo(0.5 + BOTTLE_HEIGHT_RATIO / 2, 6);
    expect(s.width).toBeCloseTo(((2 * BODY_HALF * s.layoutScale) / s.visibleWidth) * W, 6);
  });

  it("otvaranje: dolly-out smanjuje bočicu u kadru, telo pada, ali sve ostaje unutar kadra", () => {
    const rest = bottleScreen(0, HOLD, W, VH);
    const open = bottleScreen(0.22, HOLD, W, VH);
    expect(open.width).toBeLessThan(rest.width);
    expect(open.baseY).toBeGreaterThan(rest.baseY);
    // baza iznad dna kadra; vrh izvučenog zatvarača ispod vrha kadra (jedinice scene)
    const baseScene = (0.5 - open.baseY / VH) * open.visibleHeight;
    const capTop = baseScene + (TOTAL_HEIGHT + CAP_LIFT_OUT) * open.scale;
    expect(baseScene).toBeGreaterThan(-open.visibleHeight / 2);
    expect(capTop).toBeLessThan(open.visibleHeight / 2);
  });

  it("polica: od 0.70 baza je tačno na ivici .hero-overlap, na 0.62 nema skoka", () => {
    for (const p of [0.7, 0.85, 0.95, 1]) {
      const s = bottleScreen(p, HOLD, W, VH);
      expect(s.baseY).toBeCloseTo(shelfEdgeInStage(p, HOLD, VH), 6);
    }
    const before = bottleScreen(0.619, HOLD, W, VH);
    const at = bottleScreen(0.62, HOLD, W, VH);
    expect(Math.abs(at.baseY - before.baseY)).toBeLessThan(2);
    expect(bottleScreen(1, HOLD, W, VH).scale / bottleScreen(0, HOLD, W, VH).scale).toBeCloseTo(SHELF_SCALE, 6);
    expect(bottleScreen(1, HOLD, W, VH).x / W).toBeCloseTo(0.7, 6);
  });

  it("širi monitor gura bočicu dalje udesno, ali joj ne menja visinu", () => {
    const vh = visibleHeightAt(30, 28);
    const a = bottleLayout(vh * (1440 / 900), vh, MODEL);
    const b = bottleLayout(vh * (1920 / 1080), vh, MODEL);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.scale).toBeCloseTo(a.scale, 9);
  });
});
