/** Aplus1 payout policy — amounts in satang. */

export const PAYOUT_MIN_SATANG = 100_000; // 1,000 THB
export const PAYOUT_FEE_SATANG = 2_500; // 25 THB
export const PAYOUT_TIMEZONE = "Asia/Bangkok";

export type PayoutEligibilityInput = {
  availableSatang: number;
  /** Manual free withdrawals already used this calendar month (Bangkok). */
  freeWithdrawalsUsedThisMonth: number;
  bankVerified: boolean;
  kycVerified: boolean;
  isManual: boolean;
};

export type PayoutEligibility = {
  ok: boolean;
  reason?: string;
  feeSatang: number;
  transferSatang: number;
  usesFreeSlot: boolean;
};

export function bangkokMonthKey(date: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYOUT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  });
  // en-CA → YYYY-MM-DD parts; take year-month
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

export function evaluateManualPayout(input: PayoutEligibilityInput): PayoutEligibility {
  if (!input.bankVerified) {
    return { ok: false, reason: "bank_not_verified", feeSatang: 0, transferSatang: 0, usesFreeSlot: false };
  }
  if (!input.kycVerified) {
    return { ok: false, reason: "kyc_required", feeSatang: 0, transferSatang: 0, usesFreeSlot: false };
  }
  if (input.availableSatang < PAYOUT_MIN_SATANG) {
    return { ok: false, reason: "below_minimum", feeSatang: 0, transferSatang: 0, usesFreeSlot: false };
  }

  const usesFreeSlot = input.freeWithdrawalsUsedThisMonth < 1;
  const feeSatang = usesFreeSlot ? 0 : PAYOUT_FEE_SATANG;
  const transferSatang = input.availableSatang - feeSatang;
  if (transferSatang <= 0) {
    return { ok: false, reason: "fee_exceeds_balance", feeSatang, transferSatang: 0, usesFreeSlot };
  }
  return { ok: true, feeSatang, transferSatang, usesFreeSlot };
}

export type AutoPayoutDecision = {
  shouldPayout: boolean;
  amountSatang: number;
  reason: "weekly_threshold" | "eom_sweep" | "skip";
};

/** Weekly auto: pay when available ≥ min. EOM sweep: pay any remainder > 0. */
export function decideAutoPayout(input: {
  availableSatang: number;
  isEndOfMonthSweep: boolean;
}): AutoPayoutDecision {
  if (input.isEndOfMonthSweep) {
    if (input.availableSatang <= 0) {
      return { shouldPayout: false, amountSatang: 0, reason: "skip" };
    }
    return { shouldPayout: true, amountSatang: input.availableSatang, reason: "eom_sweep" };
  }
  if (input.availableSatang >= PAYOUT_MIN_SATANG) {
    return {
      shouldPayout: true,
      amountSatang: input.availableSatang,
      reason: "weekly_threshold",
    };
  }
  return { shouldPayout: false, amountSatang: 0, reason: "skip" };
}

export type PayoutItemDraft = {
  hireOrderId: string;
  amountSatang: number;
};

/** Aggregate order leftovers into one transfer payload. */
export function aggregatePayoutItems(items: PayoutItemDraft[]): {
  totalSatang: number;
  items: PayoutItemDraft[];
} {
  const positive = items.filter((i) => i.amountSatang > 0);
  const totalSatang = positive.reduce((s, i) => s + i.amountSatang, 0);
  return { totalSatang, items: positive };
}
