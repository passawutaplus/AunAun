import { describe, it, expect } from "vitest";
import { fuzzyMatchAll, tokenizeQuery } from "../fuzzyMatch";

describe("tokenizeQuery", () => {
  it("filters short tokens & normalizes", () => {
    expect(tokenizeQuery("UI a Design")).toEqual(["ui", "design"]);
  });
});

describe("fuzzyMatchAll", () => {
  it("returns true for empty query", () => {
    expect(fuzzyMatchAll("", "anything")).toBe(true);
  });
  it("matches via substring", () => {
    expect(fuzzyMatchAll("design", "ui design portfolio")).toBe(true);
  });
  it("matches via alias", () => {
    expect(fuzzyMatchAll("ui", "great ux work")).toBe(true);
    expect(fuzzyMatchAll("ae", "after effects motion reel")).toBe(true);
  });
  it("tolerates typos via levenshtein", () => {
    expect(fuzzyMatchAll("desgn", "design system")).toBe(true);
  });
  it("requires ALL tokens", () => {
    expect(fuzzyMatchAll("design motion", "design only")).toBe(false);
  });
});
