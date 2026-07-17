import type { FeeSnapshot, MoneyBreakdown, PaymentMethod } from "./types";

export const DEFAULT_PLATFORM_FEE_PERCENT = 10;
export const DEFAULT_FEE_VERSION = "aplus1-v1";
export const DEFAULT_WHT_RATE = 3;

export type FeeConfig = {
  platformFeePercent: number;
  /** When true, card PSP/surcharge is added to buyer total. */
  cardFeePassedToBuyer: boolean;
  cardSurchargePercent: number;
  /** PromptPay: buyer pays job price; platform bears PSP (default). */
  promptPayBuyerPaysJobOnly: boolean;
  feeVersion: string;
};

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  platformFeePercent: DEFAULT_PLATFORM_FEE_PERCENT,
  cardFeePassedToBuyer: true,
  cardSurchargePercent: 0,
  promptPayBuyerPaysJobOnly: true,
  feeVersion: DEFAULT_FEE_VERSION,
};

/** Integer percent of amount in satang (rounded half-up). */
export function percentOfSatang(amountSatang: number, percent: number): number {
  if (!Number.isInteger(amountSatang) || amountSatang < 0) {
    throw new Error("amountSatang must be a non-negative integer");
  }
  if (percent < 0) throw new Error("percent must be >= 0");
  return Math.round((amountSatang * percent) / 100);
}

export type SnapshotFeesOptions = {
  /** Withholding tax satang withheld by buyer (corporate). Reduces buyer charge. */
  whtSatang?: number;
  /**
   * Charge only this percent of (job − WHT) — for deposit installment.
   * Omit or 100 = full remaining payable base.
   */
  chargePercent?: number;
};

export function snapshotFees(
  jobPriceSatang: number,
  method: PaymentMethod,
  config: FeeConfig = DEFAULT_FEE_CONFIG,
  options: SnapshotFeesOptions = {},
): MoneyBreakdown {
  if (!Number.isInteger(jobPriceSatang) || jobPriceSatang < 0) {
    throw new Error("jobPriceSatang must be a non-negative integer");
  }
  const whtSatang = Math.max(0, Math.min(jobPriceSatang, Math.round(options.whtSatang ?? 0)));
  const chargePercent = Math.min(100, Math.max(1, Math.round(options.chargePercent ?? 100)));

  const platformFeeSatang = percentOfSatang(jobPriceSatang, config.platformFeePercent);
  const afterWht = jobPriceSatang - whtSatang;
  const chargeBaseSatang = Math.round((afterWht * chargePercent) / 100);

  let cardSurchargeSatang = 0;
  if (method === "card" && config.cardFeePassedToBuyer && config.cardSurchargePercent > 0) {
    cardSurchargeSatang = percentOfSatang(chargeBaseSatang, config.cardSurchargePercent);
  }

  const buyerPaysSatang =
    method === "card" && config.cardFeePassedToBuyer
      ? chargeBaseSatang + cardSurchargeSatang
      : chargeBaseSatang;

  const fee: FeeSnapshot = {
    platformFeePercent: config.platformFeePercent,
    platformFeeSatang,
    cardSurchargePercent: config.cardSurchargePercent,
    cardSurchargeSatang,
    feeVersion: config.feeVersion,
    whtSatang,
    whtRate: whtSatang > 0 ? DEFAULT_WHT_RATE : 0,
  };

  return {
    jobPriceSatang,
    buyerPaysSatang,
    sellerNetSatang: jobPriceSatang - platformFeeSatang - whtSatang,
    fee,
    whtSatang,
    chargeBaseSatang,
  };
}

/** Deposit / balance installment amounts (of after-WHT job price). */
export function planInstallmentSatang(
  jobPriceSatang: number,
  depositPercent: number,
  whtSatang = 0,
): { depositSatang: number; balanceSatang: number; afterWhtSatang: number } {
  const wht = Math.max(0, Math.min(jobPriceSatang, Math.round(whtSatang)));
  const afterWhtSatang = jobPriceSatang - wht;
  const pct = Math.min(100, Math.max(1, Math.round(depositPercent)));
  const depositSatang = Math.round((afterWhtSatang * pct) / 100);
  return {
    depositSatang,
    balanceSatang: afterWhtSatang - depositSatang,
    afterWhtSatang,
  };
}

export function thbToSatang(thb: number): number {
  if (!Number.isFinite(thb)) throw new Error("invalid THB");
  return Math.round(thb * 100);
}

export function satangToThb(satang: number): number {
  return satang / 100;
}
