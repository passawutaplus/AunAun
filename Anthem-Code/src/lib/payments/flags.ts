/** Client/server feature flags for Aplus1 Omise payments. */

export type PaymentFeatureFlags = {
  omisePaymentsEnabled: boolean;
  omisePromptPayEnabled: boolean;
  omiseCardEnabled: boolean;
  bankTransferEnabled: boolean;
  manualPayoutEnabled: boolean;
  autoPayoutEnabled: boolean;
  endOfMonthSweepEnabled: boolean;
  liveMarketplacePaymentsEnabled: boolean;
  cardFeePassedToBuyer: boolean;
  displayCurrencyEnabled: boolean;
};

export const DEFAULT_PAYMENT_FEATURE_FLAGS: PaymentFeatureFlags = {
  omisePaymentsEnabled: false,
  omisePromptPayEnabled: true,
  omiseCardEnabled: true,
  bankTransferEnabled: false,
  manualPayoutEnabled: true,
  autoPayoutEnabled: false,
  endOfMonthSweepEnabled: false,
  liveMarketplacePaymentsEnabled: false,
  cardFeePassedToBuyer: true,
  displayCurrencyEnabled: false,
};

export function canChargeLive(flags: PaymentFeatureFlags, marketplaceApproved: boolean): boolean {
  return (
    flags.omisePaymentsEnabled &&
    flags.liveMarketplacePaymentsEnabled &&
    marketplaceApproved
  );
}
