import { aggregatePayoutItems, evaluateManualPayout, type PayoutItemDraft } from "./payoutPolicy";
import type { PaymentProvider } from "./provider";
import type { CreateTransferResult } from "./types";

export type RecipientRecord = {
  id: string;
  userId: string;
  providerRecipientId: string | null;
  bankLast4: string;
  verified: boolean;
};

export type QueuePayoutInput = {
  userId: string;
  recipient: RecipientRecord;
  availableSatang: number;
  freeWithdrawalsUsedThisMonth: number;
  kycVerified: boolean;
  items: PayoutItemDraft[];
  isManual: boolean;
};

export type QueuedPayout = {
  userId: string;
  feeSatang: number;
  transferSatang: number;
  items: PayoutItemDraft[];
  usesFreeSlot: boolean;
};

export function buildQueuedPayout(input: QueuePayoutInput): QueuedPayout {
  if (!input.recipient.verified || !input.recipient.providerRecipientId) {
    throw new Error("recipient_not_ready");
  }
  const eligibility = evaluateManualPayout({
    availableSatang: input.availableSatang,
    freeWithdrawalsUsedThisMonth: input.freeWithdrawalsUsedThisMonth,
    bankVerified: input.recipient.verified,
    kycVerified: input.kycVerified,
    isManual: input.isManual,
  });
  if (!eligibility.ok) {
    throw new Error(eligibility.reason ?? "payout_not_eligible");
  }
  const { items, totalSatang } = aggregatePayoutItems(input.items);
  if (totalSatang <= 0) throw new Error("no_payout_items");
  return {
    userId: input.userId,
    feeSatang: eligibility.feeSatang,
    transferSatang: eligibility.transferSatang,
    items,
    usesFreeSlot: eligibility.usesFreeSlot,
  };
}

export async function executeOmiseTransfer(input: {
  provider: PaymentProvider;
  recipientProviderId: string;
  amountSatang: number;
  payoutRequestId: string;
}): Promise<CreateTransferResult> {
  return input.provider.createTransfer({
    amountSatang: input.amountSatang,
    recipientId: input.recipientProviderId,
    description: `Aplus1 payout ${input.payoutRequestId}`,
    metadata: { payout_request_id: input.payoutRequestId },
    idempotencyKey: `payout:${input.payoutRequestId}`,
  });
}

/** Mask account number for UI / audit. */
export function maskBankAccount(accountNumber: string): string {
  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
