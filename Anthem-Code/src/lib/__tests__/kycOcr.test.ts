import { describe, expect, it } from "vitest";
import {
  extractLaserCodeFromText,
  extractNameFromText,
  extractNationalIdFromText,
  parseThaiIdDate,
  parseThaiIdOcrText,
  toGregorianYear,
} from "@/lib/kycOcr";

describe("kycOcr parsers", () => {
  it("converts Buddhist year", () => {
    expect(toGregorianYear(2540)).toBe(1997);
    expect(toGregorianYear(1997)).toBe(1997);
  });

  it("parses Thai ID dates", () => {
    expect(parseThaiIdDate("15/01/2540")).toBe("1997-01-15");
    expect(parseThaiIdDate("1-12-2020")).toBe("2020-12-01");
    expect(parseThaiIdDate("bad")).toBeNull();
  });

  it("extracts valid national ID", () => {
    expect(extractNationalIdFromText("ID 1-2345-67890-12-1 xxx")).toBe("1234567890121");
    expect(extractNationalIdFromText("no id here")).toBeNull();
  });

  it("extracts laser code", () => {
    expect(extractLaserCodeFromText("Laser JT0-1234567-89")).toBe("JT0123456789");
  });

  it("extracts Thai titled name", () => {
    const n = extractNameFromText("ชื่อตัวและชื่อสกุล\nนายสมชาย ใจดี\nName");
    expect(n.legalName).toContain("สมชาย");
    expect(n.lastName).toContain("ใจดี");
  });

  it("parses front card sample blob", () => {
    const text = `
บัตรประจำตัวประชาชน
ชื่อตัวและชื่อสกุล
นายสมชาย ใจดี
เลขประจำตัวประชาชน 1 2345 67890 12 1
เกิดวันที่ 15/01/2540
วันบัตรหมดอายุ 15/01/2575
`;
    const r = parseThaiIdOcrText(text, "front");
    expect(r.nationalId).toBe("1234567890121");
    expect(r.dateOfBirth).toBe("1997-01-15");
    expect(r.expiryDate).toBe("2032-01-15");
    expect(r.legalName).toMatch(/สมชาย/);
    expect(r.fieldsFound.length).toBeGreaterThanOrEqual(3);
  });
});
