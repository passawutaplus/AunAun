/** Client/server feature flags for SAMECOR online payments (provider: Payso). */

export type PaymentFeatureFlags = {
  onlinePaymentsEnabled: boolean;
  promptPayEnabled: boolean;
  cardEnabled: boolean;
  bankTransferEnabled: boolean;
  manualPayoutEnabled: boolean;
  autoPayoutEnabled: boolean;
  endOfMonthSweepEnabled: boolean;
  liveMarketplacePaymentsEnabled: boolean;
  cardFeePassedToBuyer: boolean;
  displayCurrencyEnabled: boolean;
};

export const DEFAULT_PAYMENT_FEATURE_FLAGS: PaymentFeatureFlags = {
  onlinePaymentsEnabled: false,
  promptPayEnabled: true,
  cardEnabled: true,
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
    flags.onlinePaymentsEnabled &&
    flags.liveMarketplacePaymentsEnabled &&
    marketplaceApproved
  );
}

/**
 * Whether the client should call /api/hire-charge (Payso) instead of local mock.
 * Test: VITE_PAYSO_CHARGES_ENABLED=true (or admin flag) without marketplace.
 * Live: requires liveMarketplacePaymentsEnabled (marketplace gate is enforced server-side).
 */
export function canChargeOnlineClient(
  flags: PaymentFeatureFlags = DEFAULT_PAYMENT_FEATURE_FLAGS,
  method: "promptpay" | "card" | "bank_transfer" = "promptpay",
): boolean {
  const envOn =
    typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_PAYSO_CHARGES_ENABLED === "true";
  const onlineOn = flags.onlinePaymentsEnabled || envOn;
  if (!onlineOn) return false;

  const mode =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PAYSO_MODE === "live"
      ? "live"
      : "test";
  if (mode === "live" && !flags.liveMarketplacePaymentsEnabled) return false;

  if (method === "promptpay") return flags.promptPayEnabled;
  if (method === "card") return flags.cardEnabled;
  return flags.bankTransferEnabled;
}
