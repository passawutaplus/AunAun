import { describe, expect, it } from "vitest";
import {
  DEFAULT_FEE_CONFIG,
  MAX_WHT_RATE,
  percentOfSatang,
  planInstallmentSatang,
  snapshotFees,
} from "../fees";

/**
 * Edge cases for the client-side money formula. The database trigger
 * (shared.enforce_hire_order_money_guard) must agree with every value asserted here;
 * Solo-Code/supabase/tests/local-pg compares the two on 264 generated cases.
 */

// Small deterministic PRNG so failures are reproducible.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("percentOfSatang rounding (half-up, integers only)", () => {
  it.each([
    [0, 10, 0],
    [4, 10, 0], // 0.4 -> 0
    [5, 10, 1], // 0.5 -> 1
    [14, 10, 1], // 1.4 -> 1
    [15, 10, 2], // 1.5 -> 2
    [25, 10, 3], // 2.5 -> 3 (half-up, not banker's rounding)
    [99999, 10, 10000], // 9999.9 -> 10000
    [12345, 10, 1235], // 1234.5 -> 1235
  ])("percentOfSatang(%i, %i%%) = %i", (amount, pct, expected) => {
    expect(percentOfSatang(amount, pct)).toBe(expected);
  });

  it("rejects negative and non-integer amounts and negative percent", () => {
    expect(() => percentOfSatang(-1, 10)).toThrow();
    expect(() => percentOfSatang(10.5, 10)).toThrow();
    expect(() => percentOfSatang(Number.NaN, 10)).toThrow();
    expect(() => percentOfSatang(100, -1)).toThrow();
  });

  it("never returns a fractional satang, even for fractional percents", () => {
    const rand = rng(7);
    for (let i = 0; i < 2000; i++) {
      const amount = Math.floor(rand() * 5_000_000);
      const pct = Math.round(rand() * 4000) / 100; // 0.00 .. 40.00
      expect(Number.isInteger(percentOfSatang(amount, pct))).toBe(true);
    }
  });
});

describe("snapshotFees edge cases", () => {
  it("zero job price gives all zeros", () => {
    const s = snapshotFees(0, "promptpay");
    expect(s.buyerPaysSatang).toBe(0);
    expect(s.sellerNetSatang).toBe(0);
    expect(s.fee.platformFeeSatang).toBe(0);
  });

  it("rejects negative, fractional and non-finite job prices", () => {
    expect(() => snapshotFees(-1, "promptpay")).toThrow();
    expect(() => snapshotFees(100.5, "promptpay")).toThrow();
    expect(() => snapshotFees(Number.POSITIVE_INFINITY, "promptpay")).toThrow();
    expect(() => snapshotFees(Number.NaN, "promptpay")).toThrow();
  });

  it("stays exact for very large amounts (5e14 satang = 5 trillion baht)", () => {
    const job = 500_000_000_000_000;
    const s = snapshotFees(job, "promptpay");
    expect(s.fee.platformFeeSatang).toBe(50_000_000_000_000);
    expect(s.sellerNetSatang).toBe(450_000_000_000_000);
    expect(Number.isSafeInteger(s.buyerPaysSatang)).toBe(true);
  });

  it("clamps WHT to MAX_WHT_RATE of the job price (matches the DB guard), so seller net can never go negative", () => {
    const job = 100_000;
    const s = snapshotFees(job, "promptpay", undefined, { whtSatang: job * 5 });
    expect(s.whtSatang).toBe(Math.round((job * MAX_WHT_RATE) / 100));
    expect(s.sellerNetSatang).toBeGreaterThanOrEqual(0);
    expect(s.buyerPaysSatang).toBe(job - s.whtSatang);
  });

  it("negative WHT becomes 0", () => {
    expect(snapshotFees(100_000, "promptpay", undefined, { whtSatang: -5000 }).whtSatang).toBe(0);
  });

  it.each([
    [0, 1], // below 1% is raised to 1%
    [-20, 1],
    [150, 100], // above 100% is capped
    [33.4, 33], // rounded to a whole percent
    [33.5, 34],
  ])("deposit chargePercent %p is clamped/rounded to %p", (input, expected) => {
    const job = 100_000;
    const s = snapshotFees(job, "promptpay", undefined, { chargePercent: input });
    expect(s.buyerPaysSatang).toBe(Math.round((job * expected) / 100));
  });

  it("card surcharge is 0 by default config and added to the buyer total when configured", () => {
    expect(snapshotFees(100_000, "card").buyerPaysSatang).toBe(100_000);
    const withSurcharge = snapshotFees(100_000, "card", {
      ...DEFAULT_FEE_CONFIG,
      cardSurchargePercent: 3,
    });
    expect(withSurcharge.fee.cardSurchargeSatang).toBe(3000);
    expect(withSurcharge.buyerPaysSatang).toBe(103_000);
    // PromptPay never pays the surcharge.
    expect(
      snapshotFees(100_000, "promptpay", { ...DEFAULT_FEE_CONFIG, cardSurchargePercent: 3 }).buyerPaysSatang,
    ).toBe(100_000);
  });
});

describe("accounting invariants over random inputs", () => {
  it("job = platform fee + WHT + seller net; amounts are non-negative safe integers", () => {
    const rand = rng(42);
    for (let i = 0; i < 3000; i++) {
      const job = Math.floor(rand() * 20_000_000);
      const wht = Math.floor(rand() * job * 0.08); // sometimes above the 5% cap on purpose
      const dep = 1 + Math.floor(rand() * 100);
      const s = snapshotFees(job, i % 2 ? "card" : "promptpay", undefined, { whtSatang: wht, chargePercent: dep });

      expect(s.sellerNetSatang + s.fee.platformFeeSatang + s.whtSatang).toBe(job);
      for (const v of [s.buyerPaysSatang, s.sellerNetSatang, s.fee.platformFeeSatang, s.whtSatang]) {
        expect(Number.isSafeInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
      expect(s.buyerPaysSatang).toBeLessThanOrEqual(job - s.whtSatang);
    }
  });

  it("deposit + balance always equals the after-WHT price (no satang lost to rounding)", () => {
    const rand = rng(99);
    for (let i = 0; i < 3000; i++) {
      const job = Math.floor(rand() * 20_000_000);
      const wht = Math.floor(rand() * job * 0.05);
      const dep = 1 + Math.floor(rand() * 100);
      const p = planInstallmentSatang(job, dep, wht);
      expect(p.depositSatang + p.balanceSatang).toBe(p.afterWhtSatang);
      expect(p.balanceSatang).toBeGreaterThanOrEqual(0);
      // the deposit charged by snapshotFees equals the plan's deposit
      expect(snapshotFees(job, "promptpay", undefined, { whtSatang: wht, chargePercent: dep }).buyerPaysSatang).toBe(
        p.depositSatang,
      );
    }
  });
});
