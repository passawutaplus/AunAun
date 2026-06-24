import { describe, expect, it } from "vitest";
import { detectProfanity, detectProfanityInFields, maskProfanity, normalizeForMatch, detectCommunitySpam } from "@/lib/profanity";

describe("profanity", () => {
  it("detects english vulgar words", () => {
    expect(detectProfanity("what the fuck").hasProfanity).toBe(true);
  });

  it("detects thai vulgar words", () => {
    expect(detectProfanity("ไอ้สัส").hasProfanity).toBe(true);
  });

  it("detects spaced thai evasion", () => {
    expect(detectProfanity("ไ อ ้ ส ั ส").hasProfanity).toBe(true);
  });

  it("detects leetspeak evasion", () => {
    expect(detectProfanity("f*ck").hasProfanity).toBe(true);
  });

  it("allows clean text", () => {
    expect(detectProfanity("สวัสดีครับ รับงาน branding").hasProfanity).toBe(false);
  });

  it("masks profanity", () => {
    expect(maskProfanity("fuck you")).toBe("*** you");
  });

  it("scans multiple fields", () => {
    const r = detectProfanityInFields({ title: "ok", body: "ไอ้เหี้ย" });
    expect(r.hasProfanity).toBe(true);
    expect(r.byField.body.hasProfanity).toBe(true);
  });

  it("normalizes repeats", () => {
    expect(normalizeForMatch("เหี้ยยยย")).toContain("เหี้ย");
  });
});

describe("community spam", () => {
  it("flags telegram promo", () => {
    expect(detectCommunitySpam("ทัก t.me/scam123")).toBe(true);
  });

  it("allows normal design post", () => {
    expect(detectCommunitySpam("แชร์ workflow Figma สำหรับ UI kit")).toBe(false);
  });
});
