import { describe, expect, it } from "vitest";
import {
  estimatePersonalIncomeTax,
  sumWhtWithheld,
  taxOnTaxableIncome,
} from "@/lib/payments/taxEstimate";
import { canOpenSellerDispute, disputeEligibleAt } from "@/lib/payments/hireOrder";
import { isValidThaiTaxId } from "@/lib/chatOffer";

describe("taxEstimate", () => {
  it("sums WHT", () => {
    expect(sumWhtWithheld([{ whtThb: 100 }, { whtThb: 50 }])).toBe(150);
  });

  it("zero tax under first bracket after allowances", () => {
    const r = estimatePersonalIncomeTax({ grossIncomeThb: 100_000 });
    expect(r.estimatedTaxThb).toBe(0);
    expect(r.expenseThb).toBe(50_000);
  });

  it("progressive tax applies above brackets", () => {
    expect(taxOnTaxableIncome(200_000)).toBeGreaterThan(0);
  });
});

describe("dispute window", () => {
  it("eligible after 7 days", () => {
    const submitted = new Date("2026-07-01T00:00:00Z");
    const at = disputeEligibleAt(submitted, 7);
    expect(canOpenSellerDispute({
      status: "awaiting_approval",
      autoDisputeAt: at,
      now: new Date("2026-07-08T00:00:01Z"),
    })).toBe(true);
    expect(canOpenSellerDispute({
      status: "awaiting_approval",
      autoDisputeAt: at,
      now: new Date("2026-07-05T00:00:00Z"),
    })).toBe(false);
  });
});

describe("thai tax id", () => {
  it("rejects short ids", () => {
    expect(isValidThaiTaxId("123")).toBe(false);
  });
});
