import { describe, expect, it } from "vitest";
import { isAllowedKycFile, acceptForKycDoc } from "@/lib/kycUpload";

function fakeFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("kycUpload allowlist", () => {
  it("accepts jpeg/png/heic photos", () => {
    expect(isAllowedKycFile(fakeFile("id.jpg", "image/jpeg"))).toBe(true);
    expect(isAllowedKycFile(fakeFile("id.png", "image/png"))).toBe(true);
    expect(isAllowedKycFile(fakeFile("IMG_0001.HEIC", "image/heic"))).toBe(true);
    expect(isAllowedKycFile(fakeFile("shot.heif", ""))).toBe(true);
  });

  it("allows PDF only when requested (bank book)", () => {
    const pdf = fakeFile("book.pdf", "application/pdf");
    expect(isAllowedKycFile(pdf, { allowPdf: true })).toBe(true);
    expect(isAllowedKycFile(pdf, { allowPdf: false })).toBe(false);
  });

  it("accepts webp screenshots", () => {
    expect(isAllowedKycFile(fakeFile("slip.webp", "image/webp"))).toBe(true);
    expect(isAllowedKycFile(fakeFile("slip.webp", ""))).toBe(true);
  });

  it("rejects gif", () => {
    expect(isAllowedKycFile(fakeFile("x.gif", "image/gif"))).toBe(false);
  });

  it("uses image accept for ID/selfie and PDF for bank book", () => {
    expect(acceptForKycDoc("id_front")).not.toContain("pdf");
    expect(acceptForKycDoc("selfie")).not.toContain("pdf");
    expect(acceptForKycDoc("bank_book")).toContain("pdf");
  });
});
