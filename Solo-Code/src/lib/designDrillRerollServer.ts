import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { debitAiCredits } from "@/lib/aiCreditsServer";

const FEATURE = "design_drill_reroll";
const DAILY_FREE_LIMIT = 3;

export type DrillRerollStatus = {
  used: number;
  limit: number;
  remaining: number;
  day_key: string;
};

export type DrillRerollResult = {
  salt: string;
  paid: boolean;
  creditsUsed: number;
  remainingFree: number;
};

export async function getDrillRerollStatus(userId: string): Promise<DrillRerollStatus> {
  const { data, error } = await (supabaseAdmin as any).rpc("get_design_drill_reroll_status", {
    _user_id: userId,
    _daily_limit: DAILY_FREE_LIMIT,
  });
  if (error) throw new Error(error.message);
  return data as DrillRerollStatus;
}

export async function executeDrillReroll(userId: string): Promise<DrillRerollResult> {
  const salt = crypto.randomUUID();

  const { data: claim, error: claimErr } = await (supabaseAdmin as any).rpc(
    "claim_design_drill_reroll",
    { _user_id: userId, _daily_limit: DAILY_FREE_LIMIT },
  );
  if (claimErr) throw new Error(claimErr.message);

  const claimResult = claim as {
    allowed: boolean;
    reason?: string;
    used?: number;
    limit?: number;
    remaining?: number;
  };

  if (claimResult.allowed) {
    return {
      salt,
      paid: false,
      creditsUsed: 0,
      remainingFree: claimResult.remaining ?? 0,
    };
  }

  if (claimResult.reason !== "daily_limit_reached") {
    throw new Error(claimResult.reason ?? "reroll_failed");
  }

  const idempotencyKey = `drill-reroll:${userId}:${claimResult.used ?? DAILY_FREE_LIMIT}:${salt}`;
  const quota = await debitAiCredits({
    userId,
    feature: FEATURE,
    idempotencyKey,
  });

  if (!quota.allowed) {
    throw new Error("limit_reached");
  }

  return {
    salt,
    paid: true,
    creditsUsed: quota.cost ?? 1,
    remainingFree: 0,
  };
}
