import type { FeeSnapshot, MoneyBreakdown, PaymentMethod } from "./types";

export const DEFAULT_PLATFORM_FEE_PERCENT = 10;
export const DEFAULT_FEE_VERSION = "aplus1-v1";

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

export function snapshotFees(
  jobPriceSatang: number,
  method: PaymentMethod,
  config: FeeConfig = DEFAULT_FEE_CONFIG,
): MoneyBreakdown {
  const platformFeeSatang = percentOfSatang(jobPriceSatang, config.platformFeePercent);
  let cardSurchargeSatang = 0;
  if (method === "card" && config.cardFeePassedToBuyer && config.cardSurchargePercent > 0) {
    cardSurchargeSatang = percentOfSatang(jobPriceSatang, config.cardSurchargePercent);
  }

  const buyerPaysSatang =
    method === "card" && config.cardFeePassedToBuyer
      ? jobPriceSatang + cardSurchargeSatang
      : jobPriceSatang;

  const fee: FeeSnapshot = {
    platformFeePercent: config.platformFeePercent,
    platformFeeSatang,
    cardSurchargePercent: config.cardSurchargePercent,
    cardSurchargeSatang,
    feeVersion: config.feeVersion,
  };

  return {
    jobPriceSatang,
    buyerPaysSatang,
    sellerNetSatang: jobPriceSatang - platformFeeSatang,
    fee,
  };
}

export function thbToSatang(thb: number): number {
  if (!Number.isFinite(thb)) throw new Error("invalid THB");
  return Math.round(thb * 100);
}

export function satangToThb(satang: number): number {
  return satang / 100;
}
