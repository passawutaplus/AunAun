/** Aplus1 payment domain types — amounts are integer satang (THB). */

export type PaymentProviderId = "omise";

export type DisplayCurrency = "THB" | "USD";

export type HireOrderStatus =
  | "draft"
  | "awaiting_payment"
  | "deposit_paid"
  | "paid_pending"
  | "in_progress"
  | "awaiting_approval"
  | "available"
  | "refunded"
  | "partially_refunded"
  | "disputed"
  | "cancelled"
  | "failed";

export type HireQuoteStatus =
  | "sent"
  | "declined_by_client"
  | "expired"
  | "accepted"
  | "superseded";

export type HireWhtStatus = "none" | "awaiting_cert" | "complete";

export type HireDocumentKind =
  | "quotation"
  | "invoice"
  | "receipt"
  | "platform_fee_receipt"
  | "wht_cert";

export type PaymentMethod = "promptpay" | "card" | "bank_transfer";

export type PaymentStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "partially_refunded";

export type LedgerEntryType =
  | "payment_received"
  | "payment_processing_fee"
  | "platform_fee"
  | "seller_pending_credit"
  | "seller_available_credit"
  | "payout_reserved"
  | "payout_completed"
  | "payout_failed"
  | "refund_debit"
  | "chargeback_debit"
  | "manual_adjustment"
  | "dispute_hold"
  | "dispute_release"
  | "seller_compensation_credit";

export type PayoutStatus =
  | "queued"
  | "reserved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type FeeSnapshot = {
  platformFeePercent: number;
  platformFeeSatang: number;
  cardSurchargePercent: number;
  cardSurchargeSatang: number;
  feeVersion: string;
  whtSatang?: number;
  whtRate?: number;
};

export type FxSnapshot = {
  quoteCurrency: DisplayCurrency;
  rate: number;
  source: string;
  asOf: string;
};

export type MoneyBreakdown = {
  jobPriceSatang: number;
  buyerPaysSatang: number;
  sellerNetSatang: number;
  fee: FeeSnapshot;
  whtSatang?: number;
  chargeBaseSatang?: number;
};

export type CreateChargeInput = {
  amountSatang: number;
  currency: "THB";
  method: PaymentMethod;
  description: string;
  metadata: Record<string, string>;
  returnUri?: string;
  idempotencyKey: string;
};

export type CreateChargeResult = {
  providerChargeId: string;
  status: PaymentStatus;
  authorizeUri?: string;
  qrCodeUri?: string;
  raw?: unknown;
};

export type CreateTransferInput = {
  amountSatang: number;
  recipientId: string;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
};

export type CreateTransferResult = {
  providerTransferId: string;
  status: "pending" | "sent" | "paid" | "failed";
  raw?: unknown;
};

export type CreateRefundInput = {
  providerChargeId: string;
  amountSatang: number;
  reason?: string;
  idempotencyKey: string;
};

export type CreateRefundResult = {
  providerRefundId: string;
  status: "pending" | "closed" | "failed";
  amountSatang: number;
};
