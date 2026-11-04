import { describe, expect, it } from "vitest";
import { deadlineLabel, eventLinkText, isSafeEventLink, parseEventInsights } from "../exhibitionEvents";

const bkk = (iso: string) => new Date(`${iso}+07:00`);

describe("parseEventInsights (category details)", () => {
  it("keeps old insights working and fills the new keys empty", () => {
    const out = parseEventInsights({ who_for: ["a"], takeaways: [], know_before: [], related_categories: [] });
    expect(out?.who_for).toEqual(["a"]);
    expect(out?.steps).toEqual([]);
    expect(out?.links).toEqual([]);
    expect(out?.capacity).toBeNull();
  });
  it("reads steps, links, capacity and deadline; drops unsafe links", () => {
    const out = parseEventInsights({
      steps: ["one", " ", "two"],
      capacity: " รับ 12 คน ",
      deadline: "2026-12-06",
      links: [
        { kind: "download", label: "ใบสมัคร", url: "https://www.bacc.or.th/a.docx" },
        { kind: "form", label: "x", url: "http://example.com" },
        { kind: "form", label: "y", url: "https://bit.ly/abc" },
        { kind: "nope", label: "z", url: "https://example.com" },
        { kind: "info", label: "", url: "https://example.com" },
      ],
    });
    expect(out?.steps).toEqual(["one", "two"]);
    expect(out?.capacity).toBe("รับ 12 คน");
    expect(out?.deadline).toBe("2026-12-06");
    expect(out?.links).toEqual([{ kind: "download", label: "ใบสมัคร", url: "https://www.bacc.or.th/a.docx" }]);
  });
  it("caps lists and returns null when empty", () => {
    expect(parseEventInsights({ steps: Array.from({ length: 12 }, (_, i) => `s${i}`) })?.steps).toHaveLength(8);
    expect(parseEventInsights({ steps: [], links: [] })).toBeNull();
  });
});

describe("links", () => {
  it("rejects shorteners and http", () => {
    expect(isSafeEventLink("https://www.bit.ly/x")).toBe(false);
    expect(isSafeEventLink("http://bacc.or.th")).toBe(false);
    expect(isSafeEventLink("https://dibbangkok.org/still-life-still-painting-2.html")).toBe(true);
  });
  it("says what the button opens", () => {
    expect(eventLinkText({ kind: "download", label: "FAQ PAP 2027" })).toBe("ดาวน์โหลด: FAQ PAP 2027");
    expect(eventLinkText({ kind: "download", label: "ดาวน์โหลดใบสมัคร" })).toBe("ดาวน์โหลดใบสมัคร");
    expect(eventLinkText({ kind: "tickets", label: "รอบ 7 พ.ย." })).toBe("ซื้อบัตร / จอง: รอบ 7 พ.ย.");
  });
});

describe("deadlineLabel", () => {
  it("counts down in Bangkok days", () => {
    expect(deadlineLabel("2026-12-06", bkk("2026-11-04T23:30:00"))).toBe("ปิดรับใน 32 วัน");
    expect(deadlineLabel("2026-11-05", bkk("2026-11-04T09:00:00"))).toBe("ปิดรับพรุ่งนี้");
    expect(deadlineLabel("2026-11-04", bkk("2026-11-04T09:00:00"))).toBe("ปิดรับวันนี้");
    expect(deadlineLabel("2026-11-03", bkk("2026-11-04T09:00:00"))).toBe("ปิดรับแล้ว");
    expect(deadlineLabel(null)).toBeNull();
  });
});
