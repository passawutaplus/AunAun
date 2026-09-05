import { describe, expect, it } from "vitest";
import {
  composeWorkplace,
  jobDescriptionParts,
  jobResponsibilities,
  parseEmbeddedResponsibilities,
} from "@/lib/jobBrief";

const BRIEF = `เรนเดอร์สินค้าและพร็อปร้านให้ใช้บนเว็บเมื่อยังไม่มีของจริงครบ

หน้าที่หลัก
• โมเดล / ปรับโมเดลเสื้อผ้าหรือพร็อปร้าน
• จัดแสงโทนส้ม-ขาว แล้วเรนเดอร์ภาพใช้ขาย
• ส่งไฟล์พื้นหลังโปร่งและฉากร้าน

งานคิดเป็นโปรเจกต์ ส่งภายใน 3 สัปดาห์`;

describe("parseEmbeddedResponsibilities", () => {
  it("splits intro, duty bullets, and the trailing note", () => {
    const parsed = parseEmbeddedResponsibilities(BRIEF);
    expect(parsed.intro).toContain("เรนเดอร์สินค้า");
    expect(parsed.responsibilities).toHaveLength(3);
    expect(parsed.responsibilities[0]).toContain("โมเดล");
    expect(parsed.after).toContain("3 สัปดาห์");
  });
});

describe("jobResponsibilities", () => {
  it("prefers dedicated deliverables over the embedded list", () => {
    expect(
      jobResponsibilities({
        description: BRIEF,
        deliverables: ["จัดแสงสินค้า"],
        perks: ["รีโมต"],
      }),
    ).toEqual(["จัดแสงสินค้า"]);
  });

  it("ignores deliverables that were copied from perks", () => {
    expect(
      jobResponsibilities({
        description: BRIEF,
        deliverables: ["รีโมต"],
        perks: ["รีโมต"],
      }),
    ).toHaveLength(3);
  });
});

describe("jobDescriptionParts", () => {
  it("keeps the hook and timeline out of the duty list", () => {
    const parts = jobDescriptionParts({ description: BRIEF, deliverables: ["รีโมต"], perks: ["รีโมต"] });
    expect(parts.intro).not.toContain("หน้าที่หลัก");
    expect(parts.after).toContain("โปรเจกต์");
  });
});

describe("composeWorkplace", () => {
  it("joins venue, address, and transit", () => {
    expect(
      composeWorkplace({
        venue: "Same Old Days",
        address: "647 เจริญกรุง",
        landmark: "MRT หัวลำโพง ทางออก 1",
      }),
    ).toBe("Same Old Days · 647 เจริญกรุง · MRT หัวลำโพง ทางออก 1");
  });
});
