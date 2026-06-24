import { describe, it, expect } from "vitest";
import { estimateClientPaymentCheckout, thbToStripeCents } from "../stripeClientPaymentFees";

describe("estimateClientPaymentCheckout", () => {
  it("returns fee on top of job amount", () => {
    const r = estimateClientPaymentCheckout(10000);
    expect(r.jobAmount).toBe(10000);
    expect(r.feeAmount).toBeGreaterThan(0);
    expect(r.totalAmount).toBe(r.jobAmount + r.feeAmount);
  });

  it("rounds small amounts to at least 1 THB job", () => {
    const r = estimateClientPaymentCheckout(0.4);
    expect(r.jobAmount).toBe(1);
    expect(r.totalAmount).toBeGreaterThan(1);
  });
});

describe("thbToStripeCents", () => {
  it("converts whole baht to satang", () => {
    expect(thbToStripeCents(100)).toBe(10000);
  });

  it("enforces minimum 100 satang", () => {
    expect(thbToStripeCents(0)).toBe(100);
  });
});
