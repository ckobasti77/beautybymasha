import { describe, expect, it } from "vitest";
import { getHeroProgress, setHeroProgress, subscribeHeroProgress } from "./heroProgress";

describe("heroProgress store", () => {
  it("počinje od p = 0 bez boje, javlja samo stvarne promene", () => {
    expect(getHeroProgress()).toEqual({ p: 0, color: null });
    let calls = 0;
    const off = subscribeHeroProgress(() => {
      calls += 1;
    });
    setHeroProgress({ p: 0 });
    expect(calls).toBe(0);
    setHeroProgress({ p: 0.5 });
    expect(calls).toBe(1);
    expect(getHeroProgress()).toEqual({ p: 0.5, color: null });
    setHeroProgress({ color: "#7B2233" });
    expect(getHeroProgress()).toEqual({ p: 0.5, color: "#7B2233" });
    setHeroProgress({ color: null });
    expect(getHeroProgress().color).toBeNull();
    expect(calls).toBe(3);
    off();
    setHeroProgress({ p: 1 });
    expect(calls).toBe(3);
    setHeroProgress({ p: 0, color: null });
  });
});
