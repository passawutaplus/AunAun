import { describe, expect, it } from "vitest";
import { buildCollabPlanHtmlDocument, buildCollabPlanPdfHtml } from "@/lib/collabPlanPdf";
import { emptyPlanPayload } from "@/lib/collabPlanDoc";

describe("collabPlanPdf", () => {
  it("builds printable html with all sections", () => {
    const payload = emptyPlanPayload();
    payload.align.idea = "ทำพอร์ตร่วม\n• เป้าหมาย: สะสมผลงาน";
    payload.align.draftAt = "2026-08-01";
    payload.align.dueAt = "2026-08-15";
    payload.review.finalLinks = ["https://example.com/work"];
    payload.create.progressEntries = [
      {
        id: "e1",
        userId: "u1",
        userName: "Alice",
        date: "2026-08-10",
        body: "ทำ WIP รอบแรก",
        images: [],
        comments: [
          {
            id: "c1",
            userId: "u2",
            userName: "Bob",
            text: "โอเคเลย",
            createdAt: "2026-08-10T12:00:00Z",
          },
        ],
      },
    ];

    const html = buildCollabPlanPdfHtml(payload, {
      memberNames: ["Alice", "Bob"],
      version: 3,
    });

    expect(html).toContain("สรุปรายละเอียดงานร่วม");
    expect(html).toContain("จัดแนวทางร่วมกัน");
    expect(html).toContain("ยืนยันสุดท้าย");
    expect(html).toContain("https://example.com/work");
    expect(html).toContain("ทำ WIP รอบแรก");
    expect(html).toContain("section-break");
    expect(html).toContain("section-divider");
    expect(html).toContain("Alice, Bob");
  });

  it("marks preview body so page breaks are disabled in CSS", () => {
    const html = buildCollabPlanHtmlDocument(emptyPlanPayload(), { preview: true });
    expect(html).toContain("is-preview");
    expect(html).toContain("section-break");
  });
});
