import { describe, expect, it } from "vitest";
import {
  buildStudioCalendarEvents,
  monthCells,
  parseDeadlineDay,
  upcomingStudioCalendarEvents,
} from "@/lib/studioCalendar";

describe("studio calendar", () => {
  it("parses ISO deadline days and ignores free text", () => {
    expect(parseDeadlineDay("2026-08-27")).toBe("2026-08-27");
    expect(parseDeadlineDay("2026-08-27T12:00:00Z")).toBe("2026-08-27");
    expect(parseDeadlineDay("ภายใน 2 สัปดาห์")).toBeNull();
    expect(parseDeadlineDay(null)).toBeNull();
  });

  it("builds open hire and collab dates, skips terminal rows", () => {
    const events = buildStudioCalendarEvents({
      hires: [
        { id: "h1", status: "ตอบรับ", deadline: "2026-08-30", project_title: "โลโก้ร้านกาแฟ" },
        { id: "h2", status: "ปิดแล้ว", deadline: "2026-08-20", project_title: "จบแล้ว" },
      ],
      collabs: [
        { id: "c1", status: "pending", timeline: "2026-09-01", project_title: "ชุดภาพร่วม" },
        { id: "c2", status: "declined", timeline: "2026-09-02", project_title: "ไม่รับ" },
      ],
    });
    expect(events.map((e) => e.id)).toEqual(["hire-h1", "collab-c1"]);
    expect(events[0]?.label).toBe("โลโก้ร้านกาแฟ");
  });

  it("lists upcoming from today and pads a month grid", () => {
    const events = [
      { id: "a", date: "2026-08-26", kind: "hire" as const, label: "ก่อน", to: "/dashboard/hire" },
      { id: "b", date: "2026-08-27", kind: "hire" as const, label: "วันนี้", to: "/dashboard/hire" },
      { id: "c", date: "2026-08-29", kind: "collab" as const, label: "หลัง", to: "/dashboard/collab" },
    ];
    expect(upcomingStudioCalendarEvents(events, "2026-08-27").map((e) => e.id)).toEqual(["b", "c"]);
    expect(monthCells(2026, 7).filter((d) => d === 1)).toHaveLength(1);
  });
});
