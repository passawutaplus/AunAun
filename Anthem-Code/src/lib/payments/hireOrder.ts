import { planInstallmentSatang, snapshotFees, type FeeConfig } from "./fees";
import {
  applyLedgerEntries,
  EMPTY_LEDGER_BUCKETS,
  planPaymentReceivedEntries,
  planReleaseToAvailable,
  type LedgerBuckets,
} from "./ledger";
import type { FeeSnapshot, FxSnapshot, HireOrderStatus, PaymentMethod } from "./types";
import type { HireCancelMoneyTerms } from "@/lib/hireCancelRequest";

export const DISPUTE_SILENCE_DAYS = 7;

export type HireOrderDraft = {
  hiringRequestId: string;
  conversationId: string | null;
  quoteId: string | null;
  buyerId: string;
  sellerId: string;
  jobPriceSatang: number;
  method: PaymentMethod;
  fee: FeeSnapshot;
  buyerPaysSatang: number;
  sellerNetSatang: number;
  whtSatang: number;
  depositPercent: number;
  amountPaidSatang: number;
  balanceDueSatang: number;
  fxSnapshot: FxSnapshot | null;
  status: HireOrderStatus;
};

export function createHireOrderDraft(input: {
  hiringRequestId: string;
  conversationId?: string | null;
  quoteId?: string | null;
  buyerId: string;
  sellerId: string;
  jobPriceSatang: number;
  method: PaymentMethod;
  feeConfig?: FeeConfig;
  fxSnapshot?: FxSnapshot | null;
  whtSatang?: number;
  depositPercent?: number;
}): HireOrderDraft {
  const depositPercent = Math.min(100, Math.max(1, Math.round(input.depositPercent ?? 100)));
  const whtSatang = Math.max(0, Math.round(input.whtSatang ?? 0));
  const installment = planInstallmentSatang(input.jobPriceSatang, depositPercent, whtSatang);
  const money = snapshotFees(input.jobPriceSatang, input.method, input.feeConfig, {
    whtSatang,
    chargePercent: depositPercent,
  });
  return {
    hiringRequestId: input.hiringRequestId,
    conversationId: input.conversationId ?? null,
    quoteId: input.quoteId ?? null,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    jobPriceSatang: money.jobPriceSatang,
    method: input.method,
    fee: money.fee,
    buyerPaysSatang: money.buyerPaysSatang,
    sellerNetSatang: money.sellerNetSatang,
    whtSatang,
    depositPercent,
    amountPaidSatang: 0,
    balanceDueSatang: installment.afterWhtSatang,
    fxSnapshot: input.fxSnapshot ?? null,
    status: "awaiting_payment",
  };
}

export type HireMoneyTransition =
  | { type: "payment_paid"; amountSatang?: number; isDeposit?: boolean }
  | { type: "balance_paid"; amountSatang: number }
  | { type: "work_submitted" }
  | { type: "client_approved" }
  | { type: "auto_approved" }
  | { type: "disputed" }
  | { type: "cancelled" }
  | { type: "refunded"; partial?: boolean };

export function nextHireOrderStatus(
  current: HireOrderStatus,
  event: HireMoneyTransition,
): HireOrderStatus {
  switch (event.type) {
    case "payment_paid":
      if (current === "awaiting_payment" || current === "draft") {
        return event.isDeposit ? "deposit_paid" : "paid_pending";
      }
      if (current === "deposit_paid" && !event.isDeposit) return "paid_pending";
      return current;
    case "balance_paid":
      if (current === "deposit_paid" || current === "in_progress" || current === "awaiting_approval") {
        return "paid_pending";
      }
      return current;
    case "work_submitted":
      if (
        current === "paid_pending" ||
        current === "deposit_paid" ||
        current === "in_progress"
      ) {
        return "awaiting_approval";
      }
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
    case "disputed":
      if (current === "awaiting_approval" || current === "paid_pending" || current === "in_progress") {
        return "disputed";
      }
      return current;
    case "cancelled":
      return "cancelled";
    case "refunded":
      return event.partial ? "partially_refunded" : "refunded";
    default:
      return current;
  }
}

/** Apply installment paid → update paid/balance; status via nextHireOrderStatus. */
export function applyInstallmentPaid(input: {
  amountPaidSatang: number;
  balanceDueSatang: number;
  chargeSatang: number;
  currentStatus: HireOrderStatus;
  isDeposit: boolean;
}): {
  amountPaidSatang: number;
  balanceDueSatang: number;
  status: HireOrderStatus;
} {
  const paid = input.amountPaidSatang + input.chargeSatang;
  const due = Math.max(0, input.balanceDueSatang - input.chargeSatang);
  const status = nextHireOrderStatus(input.currentStatus, {
    type: "payment_paid",
    amountSatang: input.chargeSatang,
    isDeposit: input.isDeposit && due > 0,
  });
  return { amountPaidSatang: paid, balanceDueSatang: due, status };
}

export function disputeEligibleAt(workSubmittedAt: Date, silenceDays = DISPUTE_SILENCE_DAYS): Date {
  const d = new Date(workSubmittedAt.getTime());
  d.setDate(d.getDate() + silenceDays);
  return d;
}

export function canOpenSellerDispute(input: {
  status: HireOrderStatus;
  autoDisputeAt: string | Date | null | undefined;
  now?: Date;
}): boolean {
  if (input.status !== "awaiting_approval") return false;
  if (!input.autoDisputeAt) return false;
  const at = typeof input.autoDisputeAt === "string" ? new Date(input.autoDisputeAt) : input.autoDisputeAt;
  return (input.now ?? new Date()) >= at;
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
