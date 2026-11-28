import { describe, expect, it } from "vitest";
import { buildEventsIcs, foldLine, icsText } from "../../../api/_events-ics.js";

describe("events.ics", () => {
  it("escapes text values", () => {
    expect(icsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("folds long lines at 75 octets without breaking a Thai character", () => {
    const line = `SUMMARY:${"ก".repeat(60)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join("")).toBe(line);
  });

  it("writes all-day events with an exclusive end and skips rows without a start", () => {
    const ics = buildEventsIcs([
      { id: "e1", slug: "riso", title: "Riso Poster Prize", category: "open_call", starts_on: "2026-11-01", ends_on: "2026-11-29", updated_at: "2026-11-02T00:00:00Z" },
      { id: "e2", title: "No date", starts_on: null },
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261101");
    expect(ics).toContain("DTEND;VALUE=DATE:20261130");
    expect(ics).toContain("SUMMARY:Open Call: Riso Poster Prize");
    expect(ics).toContain("URL:https://www.samecor.com/exhibition/riso");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});
