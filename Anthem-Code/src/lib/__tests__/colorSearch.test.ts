import { describe, expect, it } from "vitest";
import {
  COLOR_MATCH_MIN,
  hexToHsv,
  hsvToHex,
  normalizeColorQuery,
  scorePaletteAgainstColor,
  type PaletteStop,
} from "@/lib/colorSearch";

const red: PaletteStop = { h: 0, s: 90, l: 48, weight: 0.4 };
const blue: PaletteStop = { h: 230, s: 80, l: 45, weight: 0.45 };
const black: PaletteStop = { h: 0, s: 0, l: 6, weight: 0.55 };
const white: PaletteStop = { h: 0, s: 2, l: 96, weight: 0.5 };

describe("normalizeColorQuery", () => {
  it("accepts hex with or without a hash", () => {
    expect(normalizeColorQuery("#E11D48")).toBe("#e11d48");
    expect(normalizeColorQuery("abc")).toBe("#aabbcc");
    expect(normalizeColorQuery("nope")).toBeNull();
    expect(normalizeColorQuery("")).toBeNull();
  });
});

describe("hsv round trip", () => {
  it("keeps a saturated red", () => {
    expect(hsvToHex(0, 100, 100)).toBe("#ff0000");
    const hsv = hexToHsv("#00ff00");
    expect(hsv).not.toBeNull();
    expect(hsvToHex(hsv!.h, hsv!.s, hsv!.v)).toBe("#00ff00");
  });
});

describe("scorePaletteAgainstColor", () => {
  it("keeps a nearby hue and drops the opposite hue", () => {
    expect(scorePaletteAgainstColor("#ff0000", [red])).toBeGreaterThanOrEqual(COLOR_MATCH_MIN);
    expect(scorePaletteAgainstColor("#ff0000", [blue])).toBeLessThan(COLOR_MATCH_MIN);
  });

  it("treats orange as near red and yellow as too far", () => {
    expect(scorePaletteAgainstColor("#ff8800", [red])).toBeGreaterThanOrEqual(COLOR_MATCH_MIN);
    expect(scorePaletteAgainstColor("#ffe600", [red])).toBeLessThan(COLOR_MATCH_MIN);
  });

  it("matches black and white by lightness", () => {
    expect(scorePaletteAgainstColor("#000000", [black])).toBeGreaterThanOrEqual(COLOR_MATCH_MIN);
    expect(scorePaletteAgainstColor("#000000", [red])).toBeLessThan(COLOR_MATCH_MIN);
    expect(scorePaletteAgainstColor("#ffffff", [white])).toBeGreaterThanOrEqual(COLOR_MATCH_MIN);
    expect(scorePaletteAgainstColor("#ffffff", [black])).toBeLessThan(COLOR_MATCH_MIN);
  });
});
