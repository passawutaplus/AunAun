import { describe, expect, it } from "vitest";
import { googleCalendarLink } from "@/lib/googleCalendarLink";

describe("googleCalendarLink", () => {
  it("builds an all-day range with an exclusive end day", () => {
    const url = googleCalendarLink({
      title: "Bangkok Design Week 2027",
      starts_on: "2027-02-18",
      ends_on: "2027-02-28",
      location_name: "เจริญกรุง",
      url: "https://samecor.com/exhibition/abc",
    });
    const u = new URL(url!);
    expect(u.origin + u.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("dates")).toBe("20270218/20270301");
    expect(u.searchParams.get("location")).toBe("เจริญกรุง");
    expect(u.searchParams.get("details")).toContain("https://samecor.com/exhibition/abc");
  });

  it("uses a one-day range when the end is missing or before the start", () => {
    expect(new URL(googleCalendarLink({ title: "x", starts_on: "2026-12-31", ends_on: null })!).searchParams.get("dates")).toBe(
      "20261231/20270101",
    );
    expect(new URL(googleCalendarLink({ title: "x", starts_on: "2026-12-05", ends_on: "2026-12-01" })!).searchParams.get("dates")).toBe(
      "20261205/20261206",
    );
  });

  it("returns null without a start date", () => {
    expect(googleCalendarLink({ title: "x", starts_on: null, ends_on: null })).toBeNull();
  });
});
