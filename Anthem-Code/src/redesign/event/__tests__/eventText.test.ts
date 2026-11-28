import { describe, expect, it } from "vitest";
import { parseEventInsights } from "@/lib/exhibitionEvents";
import { feeLabel, paragraphs, siteLabel, summaryRows } from "../eventSummary";
import { thaiHours, venueStatus } from "../venueText";

describe("summaryRows", () => {
  it("keeps the mock's open-call headings first and drops empty rows", () => {
    const ins = parseEventInsights({ steps: ["a", "b"], eligibility: ["x"], benefits: ["p"], who_for: ["w"], links: [] });
    const rows = summaryRows(ins, "open_call");
    expect(rows.map((r) => r.title)).toEqual(["How to apply", "Who can apply", "Prizes", "Who it's for"]);
    expect(rows[0].numbered).toBe(true);
  });

  it("is empty without insights", () => {
    expect(summaryRows(null, "exhibition")).toEqual([]);
  });
});

describe("event text helpers", () => {
  it("formats fee, site and paragraphs", () => {
    expect(feeLabel("free", null)).toBe("ค่าเข้าร่วม: ฟรี");
    expect(feeLabel("unspecified", "")).toBe("ค่าเข้าร่วม: ไม่ระบุ");
    expect(feeLabel("paid", "฿300")).toBe("ค่าเข้าร่วม: ฿300");
    expect(siteLabel("https://www.bkkartbiennale.com/x")).toBe("bkkartbiennale.com");
    expect(paragraphs("one\n\ntwo")).toEqual(["one", "two"]);
    expect(paragraphs("a\nb")).toEqual(["a", "b"]);
  });
});

describe("venue text", () => {
  it("writes opening hours like the mock", () => {
    expect(thaiHours([{ d: [2, 3, 4, 5, 6, 0], o: "10:00", c: "20:00" }])).toBe("อ.–อา. 10.00–20.00");
    expect(thaiHours([{ d: [0, 1, 2, 3, 4, 5, 6], o: "08:00", c: "19:30" }])).toBe("ทุกวัน 08.00–19.30");
  });

  it("tells open, closed today and not announced", () => {
    // Wednesday 2026-12-02 12:00 in Bangkok = 05:00 UTC
    const noon = new Date("2026-12-02T05:00:00Z");
    const base = { starts_on: "2026-10-29", ends_on: "2027-02-28", date_note: null };
    expect(venueStatus({ ...base, opening_hours: [{ d: [3], o: "10:00", c: "18:00" }] }, noon)).toEqual({ kind: "open", label: "เปิด · ถึง 18:00" });
    expect(venueStatus({ ...base, opening_hours: [{ d: [1], o: "10:00", c: "18:00" }] }, noon)).toEqual({ kind: "closed", label: "ปิดวันนี้" });
    expect(venueStatus({ ...base, starts_on: null, opening_hours: [] }, noon)).toEqual({ kind: "wait", label: "รอประกาศวันเปิด" });
  });
});
