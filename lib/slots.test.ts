import { describe, expect, it } from "vitest";
import {
  addDays,
  buildDaySlots,
  ceilToStep,
  countOverlapping,
  diffDays,
  fmt,
  fmtRange,
  groupByPartOfDay,
  hasCapacity,
  isValidDate,
  minStartFor,
  normalizeRanges,
  overlaps,
  startOfWeek,
  toMin,
  weekdayOf,
} from "./slots";

const r = (start: string, end: string) => ({ startMin: toMin(start), endMin: toMin(end) });
const at = (starts: number[]) => starts.map(fmt);

describe("pomoćne funkcije za vreme", () => {
  it("toMin / fmt u oba smera", () => {
    expect(toMin("10:30")).toBe(630);
    expect(toMin("9:05")).toBe(545);
    expect(fmt(630)).toBe("10:30");
    expect(fmt(0)).toBe("00:00");
    expect(fmtRange(630, 705)).toBe("10:30–11:45");
    expect(() => toMin("25:00")).toThrow();
    expect(ceilToStep(602, 15)).toBe(615);
    expect(ceilToStep(600, 15)).toBe(600);
  });

  it("datumi ne zavise od vremenske zone", () => {
    expect(weekdayOf("2026-09-06")).toBe(0); // nedelja
    expect(weekdayOf("2026-09-07")).toBe(1); // ponedeljak
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // prelazak na letnje vreme u Beogradu
    expect(diffDays("2026-09-03", "2026-10-03")).toBe(30);
    expect(startOfWeek("2026-09-06")).toBe("2026-08-31");
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-02-28")).toBe(true);
  });

  it("minStartFor poštuje najavu samo za današnji dan", () => {
    const now = { date: "2026-09-05", minutes: toMin("10:00") };
    expect(minStartFor(now, "2026-09-04", 120)).toBeNull(); // prošao dan
    expect(minStartFor(now, "2026-09-06", 120)).toBe(0); // naredni dan, bez ograničenja
    expect(minStartFor(now, "2026-09-05", 120)).toBe(toMin("12:00"));
  });

  it("groupByPartOfDay deli na prepodne i popodne", () => {
    const { prepodne, popodne } = groupByPartOfDay([toMin("09:00"), toMin("13:45"), toMin("14:00")]);
    expect(at(prepodne)).toEqual(["09:00", "13:45"]);
    expect(at(popodne)).toEqual(["14:00"]);
  });
});

describe("preklapanje intervala", () => {
  it("dodirivanje krajevima NIJE preklapanje", () => {
    expect(overlaps(r("10:00", "11:00"), r("11:00", "12:00"))).toBe(false);
    expect(overlaps(r("11:00", "12:00"), r("10:00", "11:00"))).toBe(false);
  });

  it("pravo preklapanje se prepoznaje sa obe strane", () => {
    expect(overlaps(r("10:00", "11:00"), r("10:59", "12:00"))).toBe(true);
    expect(overlaps(r("10:00", "11:00"), r("09:00", "10:01"))).toBe(true);
    // sadržan interval
    expect(overlaps(r("10:00", "11:00"), r("10:15", "10:30"))).toBe(true);
    // isti interval
    expect(overlaps(r("10:00", "11:00"), r("10:00", "11:00"))).toBe(true);
  });

  it("normalizeRanges spaja dodirujuće i preklapajuće, ali ne premošćuje rupu", () => {
    expect(normalizeRanges([r("09:00", "13:00"), r("13:00", "21:00")])).toEqual([r("09:00", "21:00")]);
    expect(normalizeRanges([r("15:00", "21:00"), r("09:00", "13:00")])).toEqual([
      r("09:00", "13:00"),
      r("15:00", "21:00"),
    ]);
  });
});

describe("brojanje kapaciteta", () => {
  const slot = r("10:00", "10:45");

  it("broji samo one koji se stvarno preklapaju", () => {
    const busy = [r("10:00", "10:45"), r("10:30", "11:15"), r("10:45", "11:30"), r("09:00", "10:00")];
    // prva dva se preklapaju; treći i četvrti samo dodiruju krajeve
    expect(countOverlapping(busy, slot)).toBe(2);
  });

  it("mesto ima dok je broj STROGO manji od kapaciteta", () => {
    const two = [r("10:00", "10:45"), r("10:15", "11:00")];
    expect(hasCapacity(two, slot, 3)).toBe(true);
    expect(hasCapacity([...two, r("10:30", "11:15")], slot, 3)).toBe(false);
    expect(hasCapacity([], slot, 0)).toBe(false);
  });
});

describe("buildDaySlots", () => {
  const base = { capacity: 1, durationMin: 45, stepMin: 15 };

  it("nudi počeke poravnate na mrežu, unutar radnog vremena", () => {
    const slots = buildDaySlots({ ...base, workRanges: [r("09:00", "11:00")] });
    expect(at(slots)).toEqual(["09:00", "09:15", "09:30", "09:45", "10:00", "10:15"]);
    // 10:30 + 45 min = 11:15 > 11:00, pa ga nema
    expect(at(slots)).not.toContain("10:30");
  });

  it("podeljena smena: rupa između smena nema termina, a usluga je ne premošćuje", () => {
    const slots = buildDaySlots({
      ...base,
      durationMin: 60,
      stepMin: 30,
      workRanges: [r("09:00", "12:00"), r("16:00", "19:00")],
    });
    expect(at(slots)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
    ]);
    expect(at(slots)).not.toContain("11:30"); // završilo bi u 12:30, van prve smene
    expect(at(slots)).not.toContain("15:30");
  });

  it("prazno radno vreme = nijedan termin", () => {
    expect(buildDaySlots({ ...base, workRanges: [] })).toEqual([]);
  });

  it("pauza gasi termin bez obzira na kapacitet", () => {
    const slots = buildDaySlots({
      ...base,
      capacity: 5,
      workRanges: [r("09:00", "12:00")],
      blockedRanges: [r("10:00", "10:30")],
    });
    expect(at(slots)).not.toContain("09:30"); // 09:30–10:15 seče pauzu
    expect(at(slots)).not.toContain("10:00");
    expect(at(slots)).toContain("09:00"); // 09:00–09:45, dodiruje pauzu krajem
    expect(at(slots)).toContain("10:30");
  });

  it("kapacitet 3: dva termina u 10:00 ne gase slot, treći ga gasi", () => {
    const workRanges = [r("09:00", "12:00")];
    const two = buildDaySlots({ ...base, capacity: 3, workRanges, busyRanges: [r("10:00", "10:45"), r("10:00", "10:45")] });
    expect(at(two)).toContain("10:00");
    const three = buildDaySlots({
      ...base,
      capacity: 3,
      workRanges,
      busyRanges: [r("10:00", "10:45"), r("10:00", "10:45"), r("10:00", "10:45")],
    });
    expect(at(three)).not.toContain("10:00");
    // susedni termin koji samo dodiruje kraj je i dalje slobodan
    expect(at(three)).toContain("10:45");
  });

  it("kapacitet 1 se ponaša kao salon sa jednim radnikom", () => {
    const slots = buildDaySlots({ ...base, workRanges: [r("09:00", "12:00")], busyRanges: [r("10:00", "10:45")] });
    expect(at(slots)).toEqual(["09:00", "09:15", "10:45", "11:00", "11:15"]);
  });

  it("kapacitet 0 = resurs se ne radi", () => {
    expect(buildDaySlots({ ...base, capacity: 0, workRanges: [r("09:00", "12:00")] })).toEqual([]);
  });

  it("minStartMin odseca najavu", () => {
    const slots = buildDaySlots({ ...base, workRanges: [r("09:00", "12:00")], minStartMin: toMin("10:20") });
    expect(at(slots)[0]).toBe("10:30");
  });
});
