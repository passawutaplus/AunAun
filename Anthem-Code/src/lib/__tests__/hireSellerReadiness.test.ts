import { describe, expect, it } from "vitest";
import {
  evaluateHireSellerReadiness,
  isHireBankReady,
  isHireBillingComplete,
} from "@/lib/hireSellerReadiness";

describe("hireSellerReadiness", () => {
  it("requires address + name for individual billing", () => {
    expect(isHireBillingComplete(null)).toBe(false);
    expect(
      isHireBillingComplete({
        billing_type: "individual",
        legal_name: "สมชาย ใจดี",
        billing_address: "123",
      }),
    ).toBe(false);
    expect(
      isHireBillingComplete({
        billing_type: "individual",
        legal_name: "สมชาย ใจดี",
        billing_address: "123 ถนนสุขุมวิท กรุงเทพฯ",
      }),
    ).toBe(true);
  });

  it("requires company tax id for corporate billing", () => {
    expect(
      isHireBillingComplete({
        billing_type: "corporate",
        company_name: "บริษัท เอ จำกัด",
        contact_person: "คุณบี",
        tax_id: "1234567890123",
        billing_address: "88 อาคารซิตี้ กรุงเทพฯ",
      }),
    ).toBe(false); // invalid checksum
  });

  it("requires complete bank fields", () => {
    expect(isHireBankReady(null)).toBe(false);
    expect(
      isHireBankReady({
        bank_name: "กสิกรไทย",
        account_number: "1234567890",
        account_name: "สมชาย ใจดี",
      }),
    ).toBe(true);
  });

  it("is ready only when all checklist items pass", () => {
    const locked = evaluateHireSellerReadiness({
      emailConfirmed: true,
      billing: {
        billing_type: "individual",
        legal_name: "สมชาย",
        billing_address: "123 ถนนสุขุมวิท กรุงเทพฯ",
      },
      isVerified: false,
      bank: null,
    });
    expect(locked.ready).toBe(false);
    expect(locked.missingLabels.length).toBeGreaterThan(0);

    const ready = evaluateHireSellerReadiness({
      emailConfirmed: true,
      billing: {
        billing_type: "individual",
        legal_name: "สมชาย ใจดี",
        billing_address: "123 ถนนสุขุมวิท กรุงเทพฯ",
      },
      isVerified: true,
      bank: {
        bank_name: "กสิกรไทย",
        account_number: "1234567890",
        account_name: "สมชาย ใจดี",
      },
    });
    expect(ready.ready).toBe(true);
    expect(ready.missingLabels).toEqual([]);
  });
});
