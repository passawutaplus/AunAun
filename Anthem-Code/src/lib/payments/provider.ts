import type {
  CreateChargeInput,
  CreateChargeResult,
  CreateRefundInput,
  CreateRefundResult,
  CreateTransferInput,
  CreateTransferResult,
  PaymentProviderId,
} from "./types";

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  createTransfer(input: CreateTransferInput): Promise<CreateTransferResult>;
  createRefund(input: CreateRefundInput): Promise<CreateRefundResult>;
}

export type OmiseServerEnv = {
  secretKey: string;
  publicKey: string;
  mode: "test" | "live";
  marketplaceApproved: boolean;
  webhookSecret: string;
  merchantName: string;
};

/** Read Omise env on the server only (Vercel/API / edge). Never import secrets into Vite bundles. */
export function readOmiseServerEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): OmiseServerEnv {
  const mode = env.OMISE_MODE === "live" ? "live" : "test";
  return {
    secretKey: env.OMISE_SECRET_KEY ?? "",
    publicKey: env.OMISE_PUBLIC_KEY ?? "",
    mode,
    marketplaceApproved: env.OMISE_MARKETPLACE_APPROVED === "true",
    webhookSecret: env.OMISE_WEBHOOK_SECRET ?? "",
    merchantName: env.OMISE_MERCHANT_NAME ?? "Aplus1",
  };
}

export function assertLiveOmiseAllowed(env: OmiseServerEnv): void {
  if (env.mode === "live" && !env.marketplaceApproved) {
    throw new Error("OMISE_MARKETPLACE_APPROVED=false — live charge/transfer blocked");
  }
}
