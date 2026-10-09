import { describe, expect, it } from "vitest";
import { isAllowedKycFile, acceptForKycDoc, kycBucketForPath, kycStoragePath, KYC_BUCKET } from "@/lib/kycUpload";

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

describe("kyc storage location", () => {
  const uid = "11111111-1111-4111-8111-111111111111";

  it("new documents go to the private bucket under <userId>/<docType>/", () => {
    const p = kycStoragePath(uid, "id_front", "jpg", "abc");
    expect(p).toBe(`${uid}/id_front/abc.jpg`);
    expect(kycBucketForPath(p)).toBe(KYC_BUCKET);
    expect(KYC_BUCKET).toBe("kyc-documents");
  });

  it("legacy anthem/kyc/ paths are still read from the old bucket until migrated", () => {
    expect(kycBucketForPath(`anthem/kyc/${uid}/selfie/x.jpg`)).toBe("project-media");
  });

  it("the folder the storage policy checks is always the first segment", () => {
    expect(kycStoragePath(uid, "bank_book", "pdf").split("/")[0]).toBe(uid);
  });
});
