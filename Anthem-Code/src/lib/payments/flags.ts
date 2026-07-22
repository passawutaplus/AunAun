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

/** Production live charge (real money) — needs marketplace approval + flags. */
export function canChargeLive(flags: PaymentFeatureFlags, marketplaceApproved: boolean): boolean {
  return (
    flags.omisePaymentsEnabled &&
    flags.liveMarketplacePaymentsEnabled &&
    marketplaceApproved
  );
}

/**
 * Whether the client should call /api/hire-charge (Omise) instead of local mock.
 * Test: VITE_OMISE_CHARGES_ENABLED=true (or admin flag) without marketplace.
 * Live: requires liveMarketplacePaymentsEnabled (marketplace gate is enforced server-side).
 */
export function canChargeOmiseClient(
  flags: PaymentFeatureFlags = DEFAULT_PAYMENT_FEATURE_FLAGS,
  method: "promptpay" | "card" | "bank_transfer" = "promptpay",
): boolean {
  const envOn =
    typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_OMISE_CHARGES_ENABLED === "true";
  const omiseOn = flags.omisePaymentsEnabled || envOn;
  if (!omiseOn) return false;

  const mode =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_OMISE_MODE === "live"
      ? "live"
      : "test";
  if (mode === "live" && !flags.liveMarketplacePaymentsEnabled) return false;

  if (method === "promptpay") return flags.omisePromptPayEnabled;
  if (method === "card") return flags.omiseCardEnabled;
  return flags.bankTransferEnabled;
}
