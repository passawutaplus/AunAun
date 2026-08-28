import { describe, expect, it } from "vitest";
import { snapshotFees, thbToSatang } from "@/lib/payments/fees";
import {
  applyPreviewWithdraw,
  countFreeWithdrawalsUsed,
  countHireIncomeByFilter,
  filterHireIncome,
  filterHireLedger,
  hireLedgerToCsv,
  payoutEligibilityReasonTh,
  seedHireWalletPreview,
  shouldUseHireWalletPreview,
  summarizeHireIncome,
} from "@/lib/payments/hireWallet";
import { PAYOUT_FEE_SATANG, PAYOUT_MIN_SATANG } from "@/lib/payments/payoutPolicy";

describe("hire wallet preview", () => {
  it("seeds available balance from released jobs still in the wallet", () => {
    const seed = seedHireWalletPreview();
    const logo = snapshotFees(thbToSatang(8_000), "promptpay");
    const motion = snapshotFees(thbToSatang(12_500), "promptpay");
    expect(seed.availableSatang).toBe(logo.sellerNetSatang + motion.sellerNetSatang);
    expect(seed.pendingSatang).toBe(snapshotFees(thbToSatang(5_000), "promptpay").sellerNetSatang);
    expect(seed.payoutReservedSatang).toBe(snapshotFees(thbToSatang(4_000), "promptpay").sellerNetSatang);
    expect(seed.payouts).toHaveLength(2);
    expect(seed.payouts.some((p) => p.status === "processing")).toBe(true);
    expect(seed.payouts.some((p) => p.status === "completed")).toBe(true);
    expect(seed.income.every((row) => row.receipts.length === 2)).toBe(true);
    expect(seed.income.some((row) => row.whtSatang > 0)).toBe(true);
  });

  it("queues a preview withdraw with the second-of-month 25 THB fee", () => {
    const seed = seedHireWalletPreview();
    expect(seed.freeWithdrawalsUsedThisMonth).toBe(2);
    const amount = PAYOUT_MIN_SATANG + PAYOUT_FEE_SATANG;
    const result = applyPreviewWithdraw(seed, amount, new Date("2026-08-27T13:00:00+07:00"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.next.availableSatang).toBe(seed.availableSatang - amount);
    expect(result.next.payouts[0].status).toBe("processing");
    expect(result.next.payouts[0].feeSatang).toBe(PAYOUT_FEE_SATANG);
    expect(result.next.payouts[0].transferSatang).toBe(amount - PAYOUT_FEE_SATANG);
    expect(result.next.payoutReservedSatang).toBe(seed.payoutReservedSatang + amount - PAYOUT_FEE_SATANG);
    expect(countFreeWithdrawalsUsed(result.next.payouts, new Date("2026-08-27T13:00:00+07:00"))).toBe(3);
  });

  it("rejects below minimum and over-balance", () => {
    const seed = seedHireWalletPreview();
    expect(applyPreviewWithdraw(seed, 500_00).ok).toBe(false);
    expect(applyPreviewWithdraw(seed, seed.availableSatang + 1).ok).toBe(false);
    expect(payoutEligibilityReasonTh("below_minimum")).toContain("1,000");
  });

  it("filters income history by money status", () => {
    const seed = seedHireWalletPreview();
    const counts = countHireIncomeByFilter(seed.income);
    expect(counts.all).toBe(5);
    expect(counts.pending).toBe(1);
    expect(counts.available).toBe(2);
    expect(counts.transferring).toBe(1);
    expect(counts.paid_out).toBe(1);
    expect(filterHireIncome(seed.income, "pending").map((r) => r.title)).toEqual(["ปกพอดแคสต์ 4 ตอน"]);
    expect(filterHireIncome(seed.income, "transferring")[0]?.title).toBe("ตัดต่อวิดีโอรีวิวสินค้า");
  });

  it("uses labeled preview only when empty or forced", () => {
    expect(
      shouldUseHireWalletPreview({ hasRealIncome: true, forcePreview: false, allowEmptyPreview: true }),
    ).toBe(false);
    expect(
      shouldUseHireWalletPreview({ hasRealIncome: false, forcePreview: false, allowEmptyPreview: true }),
    ).toBe(true);
    expect(
      shouldUseHireWalletPreview({ hasRealIncome: true, forcePreview: true, allowEmptyPreview: false }),
    ).toBe(true);
  });

  it("summarizes income as net = revenue − fees − withholding", () => {
    const seed = seedHireWalletPreview();
    const summary = summarizeHireIncome(seed.income);
    expect(summary.revenueSatang).toBe(thbToSatang(43_000));
    expect(summary.platformFeeSatang).toBe(thbToSatang(4_300));
    expect(summary.whtSatang).toBe(thbToSatang(405));
    expect(summary.netSatang).toBe(
      summary.revenueSatang - summary.platformFeeSatang - summary.whtSatang,
    );
  });

  it("builds a transaction ledger with period, status, search, and csv", () => {
    const seed = seedHireWalletPreview();
    const now = new Date("2026-08-27T13:00:00+07:00");
    const week = filterHireLedger({
      income: seed.income,
      payouts: seed.payouts,
      period: "week",
      now,
    });
    expect(week.some((row) => row.kind === "income" && row.income.title === "ออกแบบโลโก้ร้านกาแฟ")).toBe(true);
    expect(week.some((row) => row.kind === "income" && row.income.title === "แบนเนอร์งานอีเวนต์")).toBe(false);
    expect(week.some((row) => row.kind === "payout" && row.payout.status === "processing")).toBe(true);

    const transferring = filterHireLedger({
      income: seed.income,
      payouts: seed.payouts,
      status: "transferring",
      now,
    });
    expect(transferring.map((row) => row.kind).sort()).toEqual(["income", "payout"]);
    expect(
      transferring.some((row) => row.kind === "income" && row.income.title === "ตัดต่อวิดีโอรีวิวสินค้า"),
    ).toBe(true);

    const found = filterHireLedger({
      income: seed.income,
      payouts: seed.payouts,
      query: "RCP-2026-1842",
      now,
    });
    expect(found).toHaveLength(1);
    if (found[0].kind !== "income") throw new Error("expected income row");
    expect(found[0].income.title).toBe("ออกแบบโลโก้ร้านกาแฟ");

    const csv = hireLedgerToCsv(
      filterHireLedger({ income: seed.income, payouts: seed.payouts, now }),
    );
    expect(csv.startsWith("ประเภท,รายการ")).toBe(true);
    expect(csv).toContain("รายได้");
    expect(csv).toContain("การถอน");
  });
});
