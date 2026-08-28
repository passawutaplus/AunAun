import { describe, expect, it } from "vitest";
import { inboxPriorityDotClass, parseInboxPriority } from "@/lib/inboxPriority";

describe("parseInboxPriority", () => {
  it("defaults unknown values to ปกติ", () => {
    expect(parseInboxPriority(null)).toBe("ปกติ");
    expect(parseInboxPriority("")).toBe("ปกติ");
    expect(parseInboxPriority("high")).toBe("ปกติ");
  });

  it("keeps รอได้ and ด่วน", () => {
    expect(parseInboxPriority("รอได้")).toBe("รอได้");
    expect(parseInboxPriority("ด่วน")).toBe("ด่วน");
  });
});

describe("inboxPriorityDotClass", () => {
  it("uses distinct colors", () => {
    expect(inboxPriorityDotClass("ปกติ")).toContain("emerald");
    expect(inboxPriorityDotClass("รอได้")).toContain("amber");
    expect(inboxPriorityDotClass("ด่วน")).toContain("red");
  });
});
