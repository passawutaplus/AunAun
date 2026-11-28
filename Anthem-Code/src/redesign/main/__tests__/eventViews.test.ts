import { describe, expect, it } from "vitest";
import type { HomeEventRow } from "@/server/queries/homeEvents";
import { inView, viewDays, weekOf } from "../useHomeEvents";

const ev = (starts_on: string, ends_on: string | null = null) => ({ starts_on, ends_on }) as HomeEventRow;
const TODAY = "2026-11-28"; // Saturday

describe("Event tab views", () => {
  it("All = every event that has not ended", () => {
    expect(inView(ev("2026-10-01", "2026-12-13"), "all", TODAY)).toBe(true);
    expect(inView(ev("2027-01-05"), "all", TODAY)).toBe(true);
    expect(inView(ev("2026-11-20", "2026-11-27"), "all", TODAY)).toBe(false);
  });

  it("This Week runs Monday to Sunday", () => {
    expect(weekOf(TODAY)).toEqual(["2026-11-23", "2026-11-29"]);
    expect(weekOf("2026-11-23")).toEqual(["2026-11-23", "2026-11-29"]);
    expect(weekOf("2026-11-29")).toEqual(["2026-11-23", "2026-11-29"]);
  });

  it("says which days a view covers", () => {
    expect(viewDays("now", TODAY)).toBe("Today · 28 Nov");
    expect(viewDays("week", TODAY)).toBe("23 – 29 Nov");
    expect(viewDays("week", "2026-12-02")).toBe("30 Nov – 6 Dec");
    expect(viewDays("all", TODAY)).toBeNull();
  });
});
