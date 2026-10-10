import { describe, expect, it } from "vitest";
import {
  composePeriodPoint,
  formatPeriodPoint,
  formatPeriodRange,
  parsePeriodPoint,
} from "@/lib/cvDates";
import { formatEducationPeriod } from "@/lib/profileCv";
import { formatExperiencePeriod } from "@/lib/validators";

describe("parsePeriodPoint / composePeriodPoint", () => {
  it("round-trips month+year and year-only values", () => {
    expect(parsePeriodPoint("2566-05")).toEqual({ year: "2566", month: "05" });
    expect(parsePeriodPoint("2566")).toEqual({ year: "2566", month: "" });
    expect(parsePeriodPoint("")).toEqual({ year: "", month: "" });
    expect(composePeriodPoint({ year: "2566", month: "05" })).toBe("2566-05");
    expect(composePeriodPoint({ year: "2566", month: "" })).toBe("2566");
  });

  it("returns null for legacy free text so it stays editable as text", () => {
    expect(parsePeriodPoint("ต.ค. 2566")).toBeNull();
    expect(parsePeriodPoint("2566-13")).toBeNull();
  });

  it("only emits a value once the year has four digits", () => {
    expect(composePeriodPoint({ year: "25", month: "05" })).toBe("");
  });
});

describe("formatting", () => {
  it("localises the month and keeps the year as typed", () => {
    expect(formatPeriodPoint("2566-05", "en")).toBe("May 2566");
    expect(formatPeriodPoint("2566-05", "th")).toBe("พ.ค. 2566");
    expect(formatPeriodPoint("2566", "th")).toBe("2566");
    expect(formatPeriodPoint("early 2020", "en")).toBe("early 2020");
  });

  it("builds ranges with the present label", () => {
    expect(formatPeriodRange({ periodStart: "2020-01", isCurrent: true }, "ปัจจุบัน", "th")).toBe(
      "ม.ค. 2020 - ปัจจุบัน",
    );
    expect(formatPeriodRange({ periodStart: "2020-01", periodEnd: "2022-03" })).toBe("Jan 2020 - Mar 2022");
    expect(formatPeriodRange({ period: "legacy" })).toBe("legacy");
  });

  it("is what the experience and education formatters use", () => {
    expect(formatExperiencePeriod({ periodStart: "2021-06", periodEnd: "2023" })).toBe("Jun 2021 - 2023");
    expect(formatEducationPeriod({ periodStart: "2018", periodEnd: "2022-04" }, "Present", "th")).toBe(
      "2018 - เม.ย. 2022",
    );
  });
});
