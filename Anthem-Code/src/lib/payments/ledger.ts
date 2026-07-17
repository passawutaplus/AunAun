import type { LedgerEntryType } from "./types";

export type LedgerBuckets = {
  pendingBalance: number;
  availableBalance: number;
  payoutReservedBalance: number;
  paidOutBalance: number;
  disputedBalance: number;
};

export const EMPTY_LEDGER_BUCKETS: LedgerBuckets = {
  pendingBalance: 0,
  availableBalance: 0,
  payoutReservedBalance: 0,
  paidOutBalance: 0,
  disputedBalance: 0,
};

export type PlannedLedgerEntry = {
  entryType: LedgerEntryType;
  amountSatang: number;
  /** +1 credit to seller buckets, -1 debit */
  direction: 1 | -1;
  note?: string;
};

/**
 * After Omise webhook paid: credit seller pending only (never available).
 */
export function planPaymentReceivedEntries(input: {
  jobPriceSatang: number;
  platformFeeSatang: number;
  sellerNetSatang: number;
}): PlannedLedgerEntry[] {
  return [
    {
      entryType: "payment_received",
      amountSatang: input.jobPriceSatang,
      direction: 1,
      note: "buyer paid",
    },
    {
      entryType: "platform_fee",
      amountSatang: input.platformFeeSatang,
      direction: -1,
      note: "platform fee snapshot",
    },
    {
      entryType: "seller_pending_credit",
      amountSatang: input.sellerNetSatang,
      direction: 1,
      note: "held until approval",
    },
  ];
}

/** Client / auto approve: move pending → available. */
export function planReleaseToAvailable(sellerNetSatang: number): PlannedLedgerEntry[] {
  return [
    {
      entryType: "seller_available_credit",
      amountSatang: sellerNetSatang,
      direction: 1,
      note: "released from pending",
    },
  ];
}

export function applyLedgerDelta(
  buckets: LedgerBuckets,
  entry: PlannedLedgerEntry,
): LedgerBuckets {
  const next = { ...buckets };
  const amt = entry.amountSatang * entry.direction;
  switch (entry.entryType) {
    case "seller_pending_credit":
      next.pendingBalance += Math.abs(amt);
      break;
    case "seller_available_credit":
      next.pendingBalance = Math.max(0, next.pendingBalance - entry.amountSatang);
      next.availableBalance += entry.amountSatang;
      break;
    case "payout_reserved":
      next.availableBalance = Math.max(0, next.availableBalance - entry.amountSatang);
      next.payoutReservedBalance += entry.amountSatang;
      break;
    case "payout_completed":
      next.payoutReservedBalance = Math.max(0, next.payoutReservedBalance - entry.amountSatang);
      next.paidOutBalance += entry.amountSatang;
      break;
    case "payout_failed":
      next.payoutReservedBalance = Math.max(0, next.payoutReservedBalance - entry.amountSatang);
      next.availableBalance += entry.amountSatang;
      break;
    case "refund_debit":
    case "chargeback_debit":
      if (next.pendingBalance >= entry.amountSatang) {
        next.pendingBalance -= entry.amountSatang;
      } else {
        const fromPending = next.pendingBalance;
        next.pendingBalance = 0;
        next.availableBalance = Math.max(0, next.availableBalance - (entry.amountSatang - fromPending));
      }
      break;
    case "dispute_hold":
      next.disputedBalance += entry.amountSatang;
      next.availableBalance = Math.max(0, next.availableBalance - entry.amountSatang);
      break;
    case "dispute_release":
      next.disputedBalance = Math.max(0, next.disputedBalance - entry.amountSatang);
      next.availableBalance += entry.amountSatang;
      break;
    default:
      break;
  }
  return next;
}

export function applyLedgerEntries(
  buckets: LedgerBuckets,
  entries: PlannedLedgerEntry[],
): LedgerBuckets {
  return entries.reduce(applyLedgerDelta, buckets);
}
