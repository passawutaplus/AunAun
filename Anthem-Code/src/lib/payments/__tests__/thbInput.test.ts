import { describe, expect, it } from "vitest";
import { digitsFromThbInput, formatThbGrouped, parseThbGroupedToNumber } from "@/lib/payments/thbInput";

describe("thb input grouping", () => {
  it("strips non-digits and leading zeros", () => {
    expect(digitsFromThbInput("18,450")).toBe("18450");
    expect(digitsFromThbInput("018450")).toBe("18450");
    expect(digitsFromThbInput("12a34")).toBe("1234");
  });

  it("formats thousands with commas", () => {
    expect(formatThbGrouped("18450")).toBe("18,450");
    expect(formatThbGrouped("1000")).toBe("1,000");
    expect(formatThbGrouped("")).toBe("");
  });

  it("parses grouped text to a number", () => {
    expect(parseThbGroupedToNumber("18,450")).toBe(18_450);
    expect(parseThbGroupedToNumber("")).toBe(0);
  });
});
