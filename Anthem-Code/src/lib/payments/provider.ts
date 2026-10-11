import type {
  CreateChargeInput,
  CreateChargeResult,
  CreateRefundInput,
  CreateRefundResult,
  CreateTransferInput,
  CreateTransferResult,
  PaymentProviderId,
} from "./types";

/** A payment provider adapter (Payso). Server-side only; never import secrets into Vite bundles. */
export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  createTransfer(input: CreateTransferInput): Promise<CreateTransferResult>;
  createRefund(input: CreateRefundInput): Promise<CreateRefundResult>;
}
