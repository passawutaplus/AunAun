import { describe, expect, it } from "vitest";
import { parseThaiBahtText, validateWhtThaiText } from "../thaiBahtText";

describe("parseThaiBahtText", () => {
  it("parses common WHT certificate amounts", () => {
    expect(parseThaiBahtText("หกร้อยบาทถ้วน")).toBe(600);
    expect(parseThaiBahtText("สองหมื่นบาทถ้วน")).toBe(20_000);
    expect(parseThaiBahtText("ยี่สิบพันบาทถ้วน")).toBe(20_000);
    expect(parseThaiBahtText("หนึ่งร้อยบาทถ้วน")).toBe(100);
    expect(parseThaiBahtText("เก้าร้อยเก้าสิบเก้าบาทถ้วน")).toBe(999);
  });

  it("handles satang", () => {
    expect(parseThaiBahtText("สามร้อยสิบเจ็ดบาทสิบสตางค์")).toBe(317.1);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseThaiBahtText("")).toBeNull();
    expect(parseThaiBahtText("abc")).toBeNull();
  });
});

describe("validateWhtThaiText", () => {
  it("passes when numeric and Thai text match", () => {
    expect(validateWhtThaiText(600, "หกร้อยบาทถ้วน")).toBeNull();
    expect(validateWhtThaiText(20_000, "สองหมื่นบาทถ้วน")).toBeNull();
  });

  it("fails when amounts differ", () => {
    const err = validateWhtThaiText(600, "ห้าร้อยบาทถ้วน");
    expect(err).toMatch(/ไม่ตรงกับข้อความภาษาไทย/);
  });

  it("skips when amount or text is missing by default", () => {
    expect(validateWhtThaiText(0, "")).toBeNull();
    expect(validateWhtThaiText(600, "")).toBeNull();
  });

  it("fails when Thai text is missing with requireBoth", () => {
    expect(validateWhtThaiText(600, "", { requireBoth: true })).toMatch(/ไม่พบข้อความ/);
  });
});
