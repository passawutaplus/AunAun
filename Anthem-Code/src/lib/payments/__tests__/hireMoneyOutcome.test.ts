import { describe, expect, it } from "vitest";
import {
  computeHireMoneyOutcome,
  estimatePaysoChargeFeeSatang,
  HIRE_MONEY_DEMO_SCENARIOS,
  PAYSO_LATE_CANCEL_FEE_THB,
} from "@/lib/payments/hireMoneyOutcome";
import { thbToSatang } from "@/lib/payments/fees";

describe("estimatePaysoChargeFeeSatang", () => {
  it("PromptPay uses 1.35% with VAT and min 5 THB", () => {
    // 1000 * 1.35% = 13.5 → *1.07 = 14.445 → 14.45 satang round
    expect(estimatePaysoChargeFeeSatang(thbToSatang(1000), "promptpay")).toBe(
      Math.round(thbToSatang(13.5) * 1.07),
    );
    // tiny amount hits min 5 * 1.07
    expect(estimatePaysoChargeFeeSatang(thbToSatang(100), "promptpay")).toBe(
      Math.round(thbToSatang(5) * 1.07),
    );
  });

  it("card uses ~3% + VAT", () => {
    expect(estimatePaysoChargeFeeSatang(thbToSatang(1000), "card")).toBe(
      Math.round(thbToSatang(30) * 1.07),
    );
  });
});

describe("computeHireMoneyOutcome", () => {
  it("S1 completed full pay 2500", () => {
    const o = computeHireMoneyOutcome({
      jobPriceSatang: thbToSatang(2500),
      amountPaidSatang: thbToSatang(2500),
      method: "promptpay",
      outcome: "completed",
    });
    expect(o.platformFeeSatang).toBe(thbToSatang(250));
    expect(o.parties.seller.netSatang).toBe(thbToSatang(2250));
    expect(o.parties.buyer.netSatang).toBe(-thbToSatang(2500));
    expect(o.parties.aplus1.netSatang).toBe(thbToSatang(250) - o.parties.payso.netSatang);
    expect(o.checks.balanced).toBe(true);
  });

  it("S3 cancel full refund — platform loses PSP fee", () => {
    const o = computeHireMoneyOutcome({
      jobPriceSatang: thbToSatang(1000),
      amountPaidSatang: thbToSatang(1000),
      method: "promptpay",
      outcome: "cancelled",
      cancelTerms: "full_refund",
      daysSincePaymentAtCancel: 2,
    });
    expect(o.platformFeeSatang).toBe(0);
    expect(o.parties.buyer.netSatang).toBe(0);
    expect(o.parties.seller.netSatang).toBe(0);
    expect(o.parties.aplus1.netSatang).toBeLessThan(0);
    expect(o.checks.balanced).toBe(true);
  });

  it("S5 half refund of deposit paid", () => {
    const o = computeHireMoneyOutcome({
      jobPriceSatang: thbToSatang(2000),
      amountPaidSatang: thbToSatang(1000),
      method: "promptpay",
      outcome: "cancelled",
      cancelTerms: "half_refund",
      depositPercent: 50,
      daysSincePaymentAtCancel: 5,
    });
    expect(o.parties.buyer.refundedSatang).toBe(thbToSatang(500));
    expect(o.parties.seller.netSatang).toBe(thbToSatang(500));
    expect(o.parties.buyer.netSatang).toBe(-thbToSatang(500));
    expect(o.checks.balanced).toBe(true);
  });

  it("S6 late cancel adds 300 THB fee estimate", () => {
    const o = computeHireMoneyOutcome({
      jobPriceSatang: thbToSatang(2000),
      amountPaidSatang: thbToSatang(1000),
      method: "promptpay",
      outcome: "cancelled",
      cancelTerms: "full_refund",
      daysSincePaymentAtCancel: 8,
      applyLateCancelFeeEstimate: true,
    });
    expect(o.pspCharges.some((c) => c.kind === "late_cancel_fee")).toBe(true);
    expect(o.parties.payso.netSatang).toBeGreaterThanOrEqual(thbToSatang(PAYSO_LATE_CANCEL_FEE_THB));
    expect(o.checks.warnings.some((w) => w.includes("7 วัน"))).toBe(true);
  });

  it("deposit complete splits two payment fee lines", () => {
    const o = computeHireMoneyOutcome({
      jobPriceSatang: thbToSatang(3500),
      amountPaidSatang: thbToSatang(3500),
      method: "promptpay",
      outcome: "completed",
      depositPercent: 50,
    });
    expect(o.pspCharges.filter((c) => c.kind === "payment")).toHaveLength(2);
    expect(o.parties.seller.netSatang).toBe(thbToSatang(3150));
  });

  it("demo scenarios all compute without throw", () => {
    for (const s of HIRE_MONEY_DEMO_SCENARIOS) {
      const o = computeHireMoneyOutcome(s.input);
      expect(o.parties.buyer.label).toBeTruthy();
      expect(o.timeline.length).toBeGreaterThan(0);
    }
  });
});
