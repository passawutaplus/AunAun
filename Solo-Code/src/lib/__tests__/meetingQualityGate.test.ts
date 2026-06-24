import { describe, expect, it } from "vitest";
import { meetingQualityGate } from "@/lib/meetingQualityGate";
import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";

const baseResult = (): AiBriefExtractResult => ({
  client: { name: "ร้านกาแฟดี", brand: "ร้านกาแฟดี", contact: "" },
  proposition: "ออกแบบเมนู",
  goal: "เพิ่มยอดขาย",
  deliverables: [{ name: "เมนู A4", quantity: 1, formats: ["PDF"] }],
  element_design: "",
  reference: "",
  style: "",
  timeline: { start: "", deadline: "" },
  budget: "50000",
  note: "",
});

describe("meetingQualityGate", () => {
  it("flags missing deliverables for retry", () => {
    const result = baseResult();
    result.deliverables = [];
    const gate = meetingQualityGate(result, "คุยเรื่องเมนูร้านกาแฟดี งบห้าหมื่น");
    expect(gate.shouldRetry).toBe(true);
    expect(gate.issues).toContain("ไม่พบ deliverables");
    expect(gate.score).toBeLessThan(0.6);
  });

  it("passes when deliverables and proposition exist", () => {
    const gate = meetingQualityGate(
      baseResult(),
      "ร้านกาแฟดี ต้องการออกแบบเมนู งบ 50000",
    );
    expect(gate.shouldRetry).toBe(false);
    expect(gate.score).toBeGreaterThanOrEqual(0.8);
  });

  it("warns when budget not mentioned in transcript", () => {
    const gate = meetingQualityGate(baseResult(), "ร้านกาแฟดี ต้องการออกแบบเมนู");
    expect(gate.issues).toContain("งบประมาณอาจถูกประมาณจากบริบท");
  });
});
