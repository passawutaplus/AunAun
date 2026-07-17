import { snapshotFees, type FeeConfig } from "./fees";
import {
  applyLedgerEntries,
  EMPTY_LEDGER_BUCKETS,
  planPaymentReceivedEntries,
  planReleaseToAvailable,
  type LedgerBuckets,
} from "./ledger";
import type { FeeSnapshot, FxSnapshot, HireOrderStatus, PaymentMethod } from "./types";
import type { HireCancelMoneyTerms } from "@/lib/hireCancelRequest";

export type HireOrderDraft = {
  hiringRequestId: string;
  conversationId: string | null;
  buyerId: string;
  sellerId: string;
  jobPriceSatang: number;
  method: PaymentMethod;
  fee: FeeSnapshot;
  buyerPaysSatang: number;
  sellerNetSatang: number;
  fxSnapshot: FxSnapshot | null;
  status: HireOrderStatus;
};

export function createHireOrderDraft(input: {
  hiringRequestId: string;
  conversationId?: string | null;
  buyerId: string;
  sellerId: string;
  jobPriceSatang: number;
  method: PaymentMethod;
  feeConfig?: FeeConfig;
  fxSnapshot?: FxSnapshot | null;
}): HireOrderDraft {
  const money = snapshotFees(input.jobPriceSatang, input.method, input.feeConfig);
  return {
    hiringRequestId: input.hiringRequestId,
    conversationId: input.conversationId ?? null,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    jobPriceSatang: money.jobPriceSatang,
    method: input.method,
    fee: money.fee,
    buyerPaysSatang: money.buyerPaysSatang,
    sellerNetSatang: money.sellerNetSatang,
    fxSnapshot: input.fxSnapshot ?? null,
    status: "awaiting_payment",
  };
}

export type HireMoneyTransition =
  | { type: "payment_paid" }
  | { type: "work_submitted" }
  | { type: "client_approved" }
  | { type: "auto_approved" }
  | { type: "cancelled" }
  | { type: "disputed" }
  | { type: "refunded"; partial?: boolean };

export function nextHireOrderStatus(
  current: HireOrderStatus,
  event: HireMoneyTransition,
): HireOrderStatus {
  switch (event.type) {
    case "payment_paid":
      if (current === "awaiting_payment" || current === "draft") return "paid_pending";
      return current;
    case "work_submitted":
      if (current === "paid_pending" || current === "in_progress") return "awaiting_approval";
      return current;
    case "client_approved":
    case "auto_approved":
      if (
        current === "paid_pending" ||
        current === "in_progress" ||
        current === "awaiting_approval"
      ) {
        return "available";
      }
      return current;
    case "cancelled":
      return "cancelled";
    case "disputed":
      return "disputed";
    case "refunded":
      return event.partial ? "partially_refunded" : "refunded";
    default:
      return current;
  }
}

/** Apply webhook paid → pending ledger (seller buckets). */
export function onHirePaymentPaid(input: {
  sellerBuckets: LedgerBuckets;
  jobPriceSatang: number;
  platformFeeSatang: number;
  sellerNetSatang: number;
}): { buckets: LedgerBuckets; status: HireOrderStatus } {
  const entries = planPaymentReceivedEntries(input);
  return {
    buckets: applyLedgerEntries(input.sellerBuckets, entries),
    status: "paid_pending",
  };
}

export function onHireApproved(input: {
  sellerBuckets: LedgerBuckets;
  sellerNetSatang: number;
}): { buckets: LedgerBuckets; status: HireOrderStatus } {
  return {
    buckets: applyLedgerEntries(
      input.sellerBuckets,
      planReleaseToAvailable(input.sellerNetSatang),
    ),
    status: "available",
  };
}

export type CancelMoneySettlement = {
  buyerRefundSatang: number;
  sellerKeepSatang: number;
  sellerCompensationSatang: number;
  ledgerNote: string;
};

/**
 * Map hire cancel money terms → settlement amounts (of job price / paid amount).
 * Used when cancel is approved after payment.
 */
export function settleHireCancelMoney(input: {
  paidSatang: number;
  sellerNetSatang: number;
  terms: HireCancelMoneyTerms;
}): CancelMoneySettlement {
  const paid = input.paidSatang;
  switch (input.terms) {
    case "full_refund":
      return {
        buyerRefundSatang: paid,
        sellerKeepSatang: 0,
        sellerCompensationSatang: 0,
        ledgerNote: "full_refund",
      };
    case "half_refund":
      return {
        buyerRefundSatang: Math.floor(paid / 2),
        sellerKeepSatang: Math.ceil(paid / 2),
        sellerCompensationSatang: 0,
        ledgerNote: "half_refund",
      };
    case "no_refund":
      return {
        buyerRefundSatang: 0,
        sellerKeepSatang: paid,
        sellerCompensationSatang: 0,
        ledgerNote: "no_refund",
      };
    case "compensation_50":
      return {
        buyerRefundSatang: Math.floor(paid / 2),
        sellerKeepSatang: 0,
        sellerCompensationSatang: Math.ceil(input.sellerNetSatang / 2),
        ledgerNote: "compensation_50",
      };
    case "none":
    default:
      return {
        buyerRefundSatang: 0,
        sellerKeepSatang: 0,
        sellerCompensationSatang: 0,
        ledgerNote: "none_pending_agreement",
      };
  }
}

export { EMPTY_LEDGER_BUCKETS };
