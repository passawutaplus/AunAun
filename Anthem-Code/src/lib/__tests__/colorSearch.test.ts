import { describe, expect, it } from "vitest";
import {
  COLOR_MATCH_MIN,
  hexToHsv,
  hsvToHex,
  normalizeColorList,
  normalizeColorQuery,
  parseColorList,
  scorePaletteAgainstColor,
  scorePaletteAgainstColors,
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

describe("multi-color search", () => {
  it("parses, normalizes and limits the list to three colors", () => {
    expect(parseColorList("#F00,#00ff00, 0000ff ,#abcdef")).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
    expect(parseColorList("#f00,#ff0000")).toEqual(["#ff0000"]);
    expect(parseColorList("nope,,")).toEqual([]);
    expect(parseColorList(null)).toEqual([]);
  });

  it("keeps the comma-joined form or null", () => {
    expect(normalizeColorList("#F00,#0f0")).toBe("#ff0000,#00ff00");
    expect(normalizeColorList("zzz")).toBeNull();
  });

  it("requires every color: the weakest one decides until all pass", () => {
    const palette = [{ h: 0, s: 90, l: 50, weight: 0.6 }];
    const red = scorePaletteAgainstColors(["#ff0000"], palette);
    const redAndBlue = scorePaletteAgainstColors(["#ff0000", "#0000ff"], palette);
    expect(red).toBeGreaterThanOrEqual(COLOR_MATCH_MIN);
    expect(redAndBlue).toBeLessThan(COLOR_MATCH_MIN);
    expect(scorePaletteAgainstColors([], palette)).toBe(0);
  });
});
