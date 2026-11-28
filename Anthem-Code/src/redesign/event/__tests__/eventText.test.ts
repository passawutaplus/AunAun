import { describe, expect, it } from "vitest";
import { parseEventInsights } from "@/lib/exhibitionEvents";
import { feeLabel, mainAction, paragraphs, siteLabel, summaryRows } from "../eventSummary";
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

describe("mainAction", () => {
  const ev = {
    category: "exhibition",
    starts_on: "2026-11-01",
    ends_on: "2026-12-31",
    fee_type: "free",
    registration_url: null as string | null,
    registration_open: false,
    ticket_url: null as string | null,
    website_url: "https://example.org" as string | null,
    source_url: null as string | null,
  };
  const today = "2026-11-28";

  it("hides the button once the event is over", () => {
    expect(mainAction({ ...ev, ends_on: "2026-11-27" }, null, today)).toEqual({ kind: "ended", label: "งานนี้จบแล้ว" });
    expect(mainAction({ ...ev, starts_on: "2026-11-20", ends_on: null }, null, today)?.kind).toBe("ended");
  });

  it("closes an open call after its deadline, even if the event runs on", () => {
    const oc = { ...ev, category: "open_call", registration_url: "https://apply.example.org", registration_open: true };
    expect(mainAction(oc, parseEventInsights({ deadline: "2026-11-20" }), today)).toEqual({ kind: "closed", label: "ปิดรับแล้ว" });
    expect(mainAction(oc, parseEventInsights({ deadline: "2026-12-01" }), today)).toMatchObject({ kind: "go", href: "https://apply.example.org", label: "ไปสมัครที่เว็บผู้จัด", counts: true });
  });

  it("says closed when the owner turned registration off", () => {
    expect(mainAction({ ...ev, registration_url: "https://reg.example.org", registration_open: false }, null, today)).toEqual({ kind: "closed", label: "ปิดรับแล้ว" });
    expect(mainAction({ ...ev, registration_url: "https://reg.example.org", registration_open: true }, null, today)).toMatchObject({ label: "ไปลงทะเบียนที่เว็บผู้จัด", counts: true });
  });

  it("sells tickets for a paid event first, and falls back to the event site", () => {
    expect(mainAction({ ...ev, fee_type: "paid", ticket_url: "https://t.example.org", registration_url: "https://reg.example.org", registration_open: true }, null, today)).toMatchObject({ href: "https://t.example.org", label: "ไปซื้อบัตรที่เว็บผู้จัด" });
    expect(mainAction(ev, null, today)).toEqual({ kind: "go", href: "https://example.org", label: "ไปเว็บไซต์งาน", counts: false });
    expect(mainAction({ ...ev, website_url: "javascript:alert(1)" }, null, today)).toBeNull();
  });
});
