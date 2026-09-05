import { describe, expect, it } from "vitest";
import { compensationPercent, expoOut, linear, logoTravel, restBox, wordmarkTopAt } from "./logoTravel";

const HERO = 900; // top top → bottom top na 1440×900
const END = 0.7;
// wordmark u heroju (u miru): 540 px širok, 185 px visok, gore levo ispod nav trake
const FROM = { left: 120, top: 200, width: 540 };
const FROM_HEIGHT = 185;
// nav slot: 88 px širok, u fiksnoj traci
const TO = { left: 32, top: 25, width: 88 };

describe("logoTravel", () => {
  it("skala je odnos širina, x i y su razlike ivica na ekranu", () => {
    const t = logoTravel({ from: FROM, to: TO, heroHeight: HERO, endProgress: END });
    expect(t.scale).toBeCloseTo(88 / 540, 9);
    expect(t.x).toBe(32 - 120);
    expect(t.y).toBe(25 - 200);
  });

  it("kompenzacija je tačno ono što strana odnese do kraja putovanja", () => {
    const t = logoTravel({ from: FROM, to: TO, heroHeight: HERO, endProgress: END });
    expect(t.compensation).toBeCloseTo(0.7 * 900, 9);
    expect(compensationPercent(t, FROM_HEIGHT)).toBeCloseTo((630 / 185) * 100, 9);
  });

  it("na kraju putovanja wordmark stoji tačno na slotu, sa bilo kojim ease-om", () => {
    const t = logoTravel({ from: FROM, to: TO, heroHeight: HERO, endProgress: END });
    expect(wordmarkTopAt(FROM, t, HERO, END, END, linear)).toBeCloseTo(TO.top, 9);
    expect(wordmarkTopAt(FROM, t, HERO, END, END, expoOut)).toBeCloseTo(TO.top, 9);
  });

  it("skrol član se skrati: položaj na ekranu je samo rest + ease(t) · put", () => {
    const t = logoTravel({ from: FROM, to: TO, heroHeight: HERO, endProgress: END });
    for (const p of [0.05, 0.1, 0.25, 0.35, 0.5, 0.6]) {
      const u = p / END;
      expect(wordmarkTopAt(FROM, t, HERO, END, p, linear)).toBeCloseTo(FROM.top + u * t.y, 9);
      expect(wordmarkTopAt(FROM, t, HERO, END, p, expoOut)).toBeCloseTo(FROM.top + expoOut(u) * t.y, 9);
    }
  });

  it("expo.out izbegava copy: već na 20 % heroja wordmark je u zoni nav trake", () => {
    const t = logoTravel({ from: FROM, to: TO, heroHeight: HERO, endProgress: END });
    const top = wordmarkTopAt(FROM, t, HERO, END, 0.2, expoOut);
    const scale = 1 + expoOut(0.2 / END) * (t.scale - 1);
    const bottom = top + FROM_HEIGHT * scale;
    // naslov je u miru 40 px ispod wordmark-a i ide naviše brzinom strane
    const headlineTop = FROM.top + FROM_HEIGHT + 40 - 0.2 * HERO;
    expect(bottom).toBeLessThan(headlineTop);
    expect(bottom).toBeLessThan(110);
  });

  it("posle kraja putovanja wordmark nastavlja da skroluje sa stranom (tween stoji)", () => {
    const t = logoTravel({ from: FROM, to: TO, heroHeight: HERO, endProgress: END });
    const atEnd = wordmarkTopAt(FROM, t, HERO, END, END);
    expect(wordmarkTopAt(FROM, t, HERO, END, 0.8)).toBeCloseTo(atEnd - 0.1 * HERO, 9);
  });

  it("restBox vraća element na položaj koji bi imao na startu trigera", () => {
    // izmereno dok je strana skrolovana 300 px od starta: element je 300 px više
    expect(restBox({ left: 120, top: -100, width: 540 }, 300)).toEqual(FROM);
  });

  it("nulta širina ili visina ne deli nulom", () => {
    const t = logoTravel({ from: { ...FROM, width: 0 }, to: TO, heroHeight: HERO, endProgress: END });
    expect(t.scale).toBe(1);
    expect(compensationPercent(t, 0)).toBe(0);
  });
});
