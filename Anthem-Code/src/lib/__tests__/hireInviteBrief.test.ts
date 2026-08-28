import { describe, expect, it } from "vitest";
import { hireInviteDisplay, parseHireInviteMessage } from "@/lib/hireBrief";
import { buildHireInviteMessage } from "@/components/hiring/HireInviteForm";

describe("parseHireInviteMessage", () => {
  it("reads job type, details, and links from invite text", () => {
    const message = buildHireInviteMessage({
      jobTypes: ["piece"],
      details: "อยากได้โลโก้โทนอุ่น สำหรับคาเฟ่",
      budgetMin: "",
      budgetMax: "",
      deadline: "",
      referenceUrls: ["https://example.com/mood"],
      attachmentUrls: ["https://cdn.example.com/a.jpg"],
    });
    const parsed = parseHireInviteMessage(message);
    expect(parsed.jobTypesLabel).toBe("จ้างทำชิ้นงาน");
    expect(parsed.details).toContain("อยากได้โลโก้โทนอุ่น");
    expect(parsed.links).toEqual(["https://example.com/mood"]);
  });

  it("prefers job_type column and attachment_urls", () => {
    const display = hireInviteDisplay({
      message: "ประเภทงาน: จ้างทำชิ้นงาน\n\nรายละเอียด:\nbrief จากฟอร์ม",
      job_type: "piece,project",
      attachment_urls: ["https://cdn.example.com/x.png"],
    });
    expect(display.jobTypesLabel).toBe("จ้างทำชิ้นงาน · จ้างทำเป็นโปรเจค");
    expect(display.details).toBe("brief จากฟอร์ม");
    expect(display.attachments).toEqual(["https://cdn.example.com/x.png"]);
  });

  it("strips the seeded chat wrapper around an invite body", () => {
    const inner = buildHireInviteMessage({
      jobTypes: ["piece"],
      details: "อยากได้โลโก้โทนอุ่น",
      budgetMin: "",
      budgetMax: "",
      deadline: "",
      referenceUrls: [],
      attachmentUrls: [],
    });
    const wrapped = ["📋 คำชวนงาน", "อ้างอิง: โลโก้คาเฟ่", "งบประมาณ: ฿5,000", "", inner, "", "ติดต่อ: ลูกค้า · a@b.c"].join(
      "\n",
    );
    const parsed = parseHireInviteMessage(wrapped);
    expect(parsed.jobTypesLabel).toBe("จ้างทำชิ้นงาน");
    expect(parsed.details).toBe("อยากได้โลโก้โทนอุ่น");
    expect(parsed.details).not.toContain("คำชวนงาน");
    expect(parsed.details).not.toContain("ติดต่อ:");

    const display = hireInviteDisplay({ message: wrapped });
    expect(display.projectTitle).toBe("โลโก้คาเฟ่");
    expect(display.budgetLabel).toBe("฿5,000");
    expect(display.deadlineLabel).toBeNull();
    expect(display.contact).toBe("ลูกค้า · a@b.c");
    expect(display.details).toBe("อยากได้โลโก้โทนอุ่น");
  });

  it("reads cover url from the seeded chat wrapper", () => {
    const display = hireInviteDisplay({
      message: [
        "📋 คำชวนงาน",
        "อ้างอิง: Journey Unknown",
        "ปกอ้างอิง: https://cdn.example.com/cover.jpg",
        "งบประมาณ: ฿8,000–฿12,000",
        "กำหนดส่ง: 15 ก.ย. 2569",
        "",
        "ประเภทงาน: จ้างทำชิ้นงาน",
        "",
        "รายละเอียด:",
        "อยากได้โมชันสั้น 15 วินาที",
        "",
        "ลิงก์อ้างอิง:",
        "- https://drive.google.com/file",
        "",
        "ติดต่อ: มด · ant@example.com",
      ].join("\n"),
    });
    expect(display.projectTitle).toBe("Journey Unknown");
    expect(display.projectCoverUrl).toBe("https://cdn.example.com/cover.jpg");
    expect(display.budgetLabel).toBe("฿8,000–฿12,000");
    expect(display.deadlineLabel).toBe("15 ก.ย. 2569");
    expect(display.jobTypesLabel).toBe("จ้างทำชิ้นงาน");
    expect(display.details).toBe("อยากได้โมชันสั้น 15 วินาที");
    expect(display.links).toEqual(["https://drive.google.com/file"]);
    expect(display.contact).toBe("มด · ant@example.com");
  });
});
