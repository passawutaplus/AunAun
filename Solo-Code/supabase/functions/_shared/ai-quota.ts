// Shared AI credits guard for edge functions.
// Backed by public.debit_ai_credits(user_id, feature, environment, idempotency_key) RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface QuotaResult {
  allowed: boolean;
  cost?: number;
  daily_remaining?: number;
  daily_limit?: number;
  included_used?: number;
  included_limit?: number;
  included_remaining?: number;
  purchased_balance?: number;
  total_remaining?: number;
  reason?: string;
}

/** LINE / UI suffix — remaining credits (daily + pack + purchased). */
export function formatAiCreditSuffix(
  quota: Pick<QuotaResult, "total_remaining" | "daily_remaining" | "included_remaining">,
): string {
  const remaining = quota.total_remaining ?? 0;
  const daily = quota.daily_remaining ?? 0;
  const pool = quota.included_remaining ?? Math.max(remaining - daily, 0);
  const total = Math.max(remaining, daily + pool, 1);
  return `credit ai : ${remaining}/${total}`;
}

function paymentsEnv(): "sandbox" | "live" {
  const env = Deno.env.get("STRIPE_ENVIRONMENT");
  return env === "live" ? "live" : "sandbox";
}

export async function getAiUsageSummary(
  userId: string,
): Promise<QuotaResult & { total_remaining?: number }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { allowed: false, reason: "server_misconfiguration", total_remaining: 0 };
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await admin.rpc("get_ai_usage_summary", {
    _user_id: userId,
    _environment: paymentsEnv(),
  });
  if (error) {
    console.error("[ai-quota] summary rpc error", error.message);
    return { allowed: false, reason: "quota_check_failed", total_remaining: 0 };
  }
  return data as QuotaResult & { total_remaining?: number };
}

/**
 * Atomically debit AI credits for a user/feature.
 * Returns quota summary. When `allowed` is false the caller MUST short-circuit.
 */
export async function debitAiQuota(
  userId: string,
  feature: string,
  idempotencyKey?: string,
): Promise<QuotaResult> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return { allowed: false, reason: "server_misconfiguration" };
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await admin.rpc("debit_ai_credits", {
    _user_id: userId,
    _feature: feature,
    _environment: paymentsEnv(),
    _idempotency_key: idempotencyKey ?? null,
  });
  if (error) {
    console.error(`[ai-quota:${feature}] rpc error`, error.message);
    return { allowed: false, reason: "quota_check_failed" };
  }
  return data as QuotaResult;
}

/** @deprecated Use debitAiQuota — kept for gradual migration */
export async function checkAiQuota(
  userId: string,
  feature: string,
  _isPro: boolean,
): Promise<QuotaResult & { count: number; limit: number }> {
  const result = await debitAiQuota(userId, feature);
  return {
    ...result,
    count: result.included_used ?? 0,
    limit: result.included_limit ?? 0,
  };
}

/** Returns true if the user has an active Pro/Inhouse subscription. */
export async function isProUser(userId: string): Promise<boolean> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await admin
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", userId)
    .maybeSingle();
  const tier = (data?.subscription_tier ?? "free") as string;
  return tier === "pro" || tier === "pro_plus" || tier === "inhouse";
}
