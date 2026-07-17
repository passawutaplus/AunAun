import { describe, expect, it } from "vitest";
import { percentOfSatang, snapshotFees, thbToSatang } from "@/lib/payments/fees";
import {
  applyLedgerEntries,
  EMPTY_LEDGER_BUCKETS,
  planPaymentReceivedEntries,
  planReleaseToAvailable,
} from "@/lib/payments/ledger";
import {
  evaluateManualPayout,
  decideAutoPayout,
  aggregatePayoutItems,
  PAYOUT_FEE_SATANG,
  PAYOUT_MIN_SATANG,
} from "@/lib/payments/payoutPolicy";
import { buildCheckoutDisplay, convertSatangToQuote } from "@/lib/payments/fxDisplay";
import {
  createHireOrderDraft,
  nextHireOrderStatus,
  onHireApproved,
  onHirePaymentPaid,
  settleHireCancelMoney,
} from "@/lib/payments/hireOrder";
import { planWeeklyAutoPayouts, planEndOfMonthSweeps } from "@/lib/payments/payoutCron";
import { diffReconciliation } from "@/lib/payments/reconciliation";
import { canChargeLive, DEFAULT_PAYMENT_FEATURE_FLAGS } from "@/lib/payments/flags";
import { buildPaymentNotify } from "@/lib/payments/notifications";
import { maskBankAccount } from "@/lib/payments/payoutService";

describe("fees", () => {
  it("platform fee 10% in satang", () => {
    const job = thbToSatang(1000);
    expect(percentOfSatang(job, 10)).toBe(10_000);
    const money = snapshotFees(job, "promptpay");
    expect(money.buyerPaysSatang).toBe(job);
    expect(money.fee.platformFeeSatang).toBe(10_000);
    expect(money.sellerNetSatang).toBe(90_000);
  });

  it("card surcharge passed to buyer when configured", () => {
    const job = thbToSatang(1000);
    const money = snapshotFees(job, "card", {
      platformFeePercent: 10,
      cardFeePassedToBuyer: true,
      cardSurchargePercent: 3,
      promptPayBuyerPaysJobOnly: true,
      feeVersion: "t",
    });
    expect(money.fee.cardSurchargeSatang).toBe(3_000);
    expect(money.buyerPaysSatang).toBe(103_000);
  });

  it("WHT reduces buyer charge and seller net", () => {
    const job = thbToSatang(1000);
    const wht = percentOfSatang(job, 3);
    const money = snapshotFees(job, "promptpay", undefined, { whtSatang: wht });
    expect(money.whtSatang).toBe(3_000);
    expect(money.buyerPaysSatang).toBe(97_000);
    expect(money.sellerNetSatang).toBe(87_000);
  });

  it("deposit chargePercent charges installment only", () => {
    const job = thbToSatang(1000);
    const money = snapshotFees(job, "promptpay", undefined, { chargePercent: 50 });
    expect(money.buyerPaysSatang).toBe(50_000);
    expect(money.fee.platformFeeSatang).toBe(10_000);
  });
});

describe("ledger hire lifecycle", () => {
  it("paid → pending then approve → available", () => {
    const job = 100_000;
    const fee = 10_000;
    const net = 90_000;
    const paid = onHirePaymentPaid({
      sellerBuckets: EMPTY_LEDGER_BUCKETS,
      jobPriceSatang: job,
      platformFeeSatang: fee,
      sellerNetSatang: net,
    });
    expect(paid.status).toBe("paid_pending");
    expect(paid.buckets.pendingBalance).toBe(net);

    const approved = onHireApproved({
      sellerBuckets: paid.buckets,
      sellerNetSatang: net,
    });
    expect(approved.status).toBe("available");
    expect(approved.buckets.pendingBalance).toBe(0);
    expect(approved.buckets.availableBalance).toBe(net);
  });

  it("plan entries match apply", () => {
    const entries = [
      ...planPaymentReceivedEntries({
        jobPriceSatang: 100,
        platformFeeSatang: 10,
        sellerNetSatang: 90,
      }),
      ...planReleaseToAvailable(90),
    ];
    const b = applyLedgerEntries(EMPTY_LEDGER_BUCKETS, entries);
    expect(b.availableBalance).toBe(90);
  });
});

describe("payout policy", () => {
  it("manual free once then 25 THB", () => {
    const free = evaluateManualPayout({
      availableSatang: PAYOUT_MIN_SATANG,
      freeWithdrawalsUsedThisMonth: 0,
      bankVerified: true,
      kycVerified: true,
      isManual: true,
    });
    expect(free.ok).toBe(true);
    expect(free.feeSatang).toBe(0);

    const paid = evaluateManualPayout({
      availableSatang: PAYOUT_MIN_SATANG + PAYOUT_FEE_SATANG,
      freeWithdrawalsUsedThisMonth: 1,
      bankVerified: true,
      kycVerified: true,
      isManual: true,
    });
    expect(paid.ok).toBe(true);
    expect(paid.feeSatang).toBe(PAYOUT_FEE_SATANG);
  });

  it("weekly vs eom", () => {
    expect(decideAutoPayout({ availableSatang: 500_00, isEndOfMonthSweep: false }).shouldPayout).toBe(
      false,
    );
    expect(
      decideAutoPayout({ availableSatang: PAYOUT_MIN_SATANG, isEndOfMonthSweep: false }).reason,
    ).toBe("weekly_threshold");
    expect(decideAutoPayout({ availableSatang: 100, isEndOfMonthSweep: true }).reason).toBe(
      "eom_sweep",
    );
  });

  it("aggregates payout items", () => {
    const { totalSatang } = aggregatePayoutItems([
      { hireOrderId: "a", amountSatang: 100 },
      { hireOrderId: "b", amountSatang: 50 },
    ]);
    expect(totalSatang).toBe(150);
  });
});

describe("fx display", () => {
  it("checkout shows THB + quote", () => {
    const d = buildCheckoutDisplay({
      buyerPaysSatang: 100_000,
      displayCurrency: "USD",
      fx: { quoteCurrency: "USD", rate: 0.03, source: "test", asOf: new Date().toISOString() },
    });
    expect(d.payableThbMajor).toBe(1000);
    expect(d.quoteMajor).toBeCloseTo(30);
    expect(convertSatangToQuote(100_000, 0.028)).toBeCloseTo(28);
  });
});

describe("hire cancel money", () => {
  it("maps terms to refund amounts", () => {
    expect(settleHireCancelMoney({ paidSatang: 100, sellerNetSatang: 90, terms: "full_refund" }))
      .toMatchObject({ buyerRefundSatang: 100, sellerKeepSatang: 0 });
    expect(settleHireCancelMoney({ paidSatang: 100, sellerNetSatang: 90, terms: "half_refund" }))
      .toMatchObject({ buyerRefundSatang: 50, sellerKeepSatang: 50 });
    expect(
      settleHireCancelMoney({ paidSatang: 100, sellerNetSatang: 90, terms: "compensation_50" })
        .sellerCompensationSatang,
    ).toBe(45);
  });
});

describe("hire order status + cron + misc", () => {
  it("creates draft with fee snapshot", () => {
    const d = createHireOrderDraft({
      hiringRequestId: "h1",
      buyerId: "b",
      sellerId: "s",
      jobPriceSatang: 100_000,
      method: "promptpay",
    });
    expect(d.status).toBe("awaiting_payment");
    expect(d.sellerNetSatang).toBe(90_000);
  });

  it("status transitions", () => {
    expect(nextHireOrderStatus("awaiting_payment", { type: "payment_paid" })).toBe("paid_pending");
    expect(nextHireOrderStatus("awaiting_approval", { type: "client_approved" })).toBe("available");
  });

  it("cron planners", () => {
    expect(planWeeklyAutoPayouts([{ userId: "u", availableSatang: PAYOUT_MIN_SATANG }])).toHaveLength(
      1,
    );
    expect(planEndOfMonthSweeps([{ userId: "u", availableSatang: 10 }])).toHaveLength(1);
  });

  it("reconciliation diffs", () => {
    const diffs = diffReconciliation(
      [{ label: "charges", amountSatang: 100 }],
      [{ label: "charges", amountSatang: 90 }],
    );
    expect(diffs[0].deltaSatang).toBe(10);
  });

  it("live gate + notify + mask", () => {
    expect(canChargeLive(DEFAULT_PAYMENT_FEATURE_FLAGS, true)).toBe(false);
    expect(buildPaymentNotify("payment_succeeded", "u").titleTh).toContain("ชำระ");
    expect(maskBankAccount("1234567890")).toBe("******7890");
  });
});
