import { describe, expect, it } from "vitest";
import {
  buildKycResubmitPrefill,
  joinKycRejectLabels,
  kycClearKeysForReasons,
  parseKycRejectCodes,
} from "@/lib/kycPrefill";

describe("kycPrefill", () => {
  it("parses multiple codes from column, falling back to single code", () => {
    expect(
      parseKycRejectCodes({
        reject_reason_codes: ["blurry_id", "name_mismatch"],
        reject_reason_code: "other",
      }),
    ).toEqual(["blurry_id", "name_mismatch"]);
    expect(parseKycRejectCodes({ reject_reason_code: "blurry_selfie" })).toEqual(["blurry_selfie"]);
  });

  it("unions clear keys for multiple reasons", () => {
    const keys = kycClearKeysForReasons(["blurry_id", "bank_name_mismatch"]);
    expect(keys.has("idFront")).toBe(true);
    expect(keys.has("accountName")).toBe(true);
    expect(keys.has("selfie")).toBe(false);
  });

  it("keeps good fields and drops rejected docs", () => {
    const prefill = buildKycResubmitPrefill({
      legal_name: "สมชาย ใจดี",
      national_id_number: "1234567890121",
      date_of_birth: "1990-01-15",
      phone: "0812345678",
      contact_email: "a@b.com",
      bank_name: "กสิกรไทย",
      account_number: "1234567890",
      account_name: "นาย สมชาย ใจดี",
      address_json: {
        line1: "1 ถนนทดสอบ",
        subdistrict: "ทดสอบ",
        district: "ทดสอบ",
        province: "กรุงเทพมหานคร",
        postal_code: "10100",
      },
      reject_reason_codes: ["blurry_id", "name_mismatch"],
      submission_meta: { given_name: "สมชาย", family_name: "ใจดี" },
      documents: [
        { doc_type: "id_front", storage_path: "kyc/id.jpg" },
        { doc_type: "selfie", storage_path: "kyc/selfie.jpg" },
        { doc_type: "bank_book", storage_path: "kyc/bank.jpg" },
      ],
    });
    expect(prefill.givenName).toBe("");
    expect(prefill.familyName).toBe("");
    expect(prefill.nationalId).toBe("1234567890121");
    expect(prefill.docs.id_front).toBeUndefined();
    expect(prefill.docs.selfie).toBe("kyc/selfie.jpg");
    expect(prefill.docs.bank_book).toBe("kyc/bank.jpg");
    expect(prefill.address.postalCode).toBe("10100");
  });

  it("joins labels", () => {
    expect(joinKycRejectLabels(["blurry_id", "name_mismatch"])).toContain(" · ");
  });
});
