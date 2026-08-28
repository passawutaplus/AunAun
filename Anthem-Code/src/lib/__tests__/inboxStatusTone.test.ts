import { describe, expect, it } from "vitest";
import { inboxStatusPillClass } from "@/lib/inboxStatusTone";

describe("inboxStatusPillClass", () => {
  it("uses distinct tones for new, accepted, declined, and forwarded", () => {
    expect(inboxStatusPillClass("ติดต่อใหม่")).toContain("primary");
    expect(inboxStatusPillClass("ตอบรับ")).toContain("emerald");
    expect(inboxStatusPillClass("ปฏิเสธ")).toContain("destructive");
    expect(inboxStatusPillClass("ส่งต่อ")).toContain("chat-hire");
  });
});
