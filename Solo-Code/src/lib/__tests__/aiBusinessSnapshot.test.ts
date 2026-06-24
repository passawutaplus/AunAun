import { describe, expect, it } from "vitest";
import { isBusinessQuestion } from "@/lib/aiBusinessSnapshot";

describe("isBusinessQuestion", () => {
  it("detects Thai business keywords", () => {
    expect(isBusinessQuestion("ลูกค้าท็อป 10 คือใคร")).toBe(true);
    expect(isBusinessQuestion("สรุปรายได้เดือนนี้")).toBe(true);
    expect(isBusinessQuestion("ใบค้างชำระมีกี่ใบ")).toBe(true);
  });

  it("detects English business keywords", () => {
    expect(isBusinessQuestion("show overdue invoices")).toBe(true);
  });

  it("returns false for design questions", () => {
    expect(isBusinessQuestion("ช่วยเลือกสีโลโก้")).toBe(false);
    expect(isBusinessQuestion("แนะนำฟอนต์สำหรับร้านกาแฟ")).toBe(false);
  });
});
