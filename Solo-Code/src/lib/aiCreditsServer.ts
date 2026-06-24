import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AiUsageSummary } from "@/lib/aiCredits";
import { getFeatureCreditCost } from "@/lib/aiCreditWeights";

export type DebitResult = {
  allowed: boolean;
  reason?: string;
  cost?: number;
  daily_remaining?: number;
  daily_limit?: number;
  included_used?: number;
  included_limit?: number;
  included_remaining?: number;
  purchased_balance?: number;
  total_remaining?: number;
};

/** Stripe/payments environment for user_credits row selection. */
export function getServerPaymentsEnv(): "sandbox" | "live" {
  const token = process.env.VITE_PAYMENTS_CLIENT_TOKEN || process.env.PAYMENTS_CLIENT_TOKEN || "";
  if (token.startsWith("pk_live_")) return "live";
  if (process.env.STRIPE_ENVIRONMENT === "live") return "live";
  return "sandbox";
}

export async function getAiUsageSummary(
  userId: string,
  environment = getServerPaymentsEnv(),
): Promise<AiUsageSummary> {
  const { data, error } = await (supabaseAdmin as any).rpc("get_ai_usage_summary", {
    _user_id: userId,
    _environment: environment,
  });
  if (error) throw new Error(error.message);
  return data as AiUsageSummary;
}

/** Throws `limit_reached` when the user cannot afford this feature. */
export async function assertAiCreditsAvailable(userId: string, feature: string): Promise<number> {
  const cost = getFeatureCreditCost(feature);
  const preview = await getAiUsageSummary(userId);
  if (preview.total_remaining < cost) throw new Error("limit_reached");
  return cost;
}

export async function debitAiCredits(opts: {
  userId: string;
  feature: string;
  idempotencyKey?: string;
  environment?: string;
}): Promise<DebitResult> {
  const { data, error } = await (supabaseAdmin as any).rpc("debit_ai_credits", {
    _user_id: opts.userId,
    _feature: opts.feature,
    _environment: opts.environment ?? getServerPaymentsEnv(),
    _idempotency_key: opts.idempotencyKey ?? null,
  });
  if (error) throw new Error(error.message);
  return data as DebitResult;
}

/** Reverse a prior debit when the AI request fails after charge. */
export async function refundAiCredits(opts: {
  userId: string;
  originalIdempotencyKey: string;
  refundIdempotencyKey: string;
}): Promise<{ refunded: boolean }> {
  const { data, error } = await (supabaseAdmin as any).rpc("refund_ai_credits", {
    _user_id: opts.userId,
    _original_idempotency_key: opts.originalIdempotencyKey,
    _refund_idempotency_key: opts.refundIdempotencyKey,
  });
  if (error) throw new Error(error.message);
  return data as { refunded: boolean };
}
