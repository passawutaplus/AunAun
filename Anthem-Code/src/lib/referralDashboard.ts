import { supabase } from "@/integrations/supabase/client";
import type { ReferralDashboard } from "@/hooks/useReferral";

const DEFAULT_DASHBOARD = {
  signup_reward_px: 20,
  activation_reward_px: 100,
  referrer_reward_px: 50,
  invited_count: 0,
  qualified_count: 0,
  earned_px: 0,
  my_referral_status: null,
  my_signup_reward_px: 20,
  my_activation_reward_px: 100,
  recent: [],
} as const satisfies Omit<ReferralDashboard, "code">;

function asDashboard(raw: unknown): ReferralDashboard | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.code !== "string" || !d.code) return null;
  return {
    code: d.code,
    signup_reward_px: Number(d.signup_reward_px ?? DEFAULT_DASHBOARD.signup_reward_px),
    activation_reward_px: Number(d.activation_reward_px ?? DEFAULT_DASHBOARD.activation_reward_px),
    referrer_reward_px: Number(d.referrer_reward_px ?? DEFAULT_DASHBOARD.referrer_reward_px),
    invited_count: Number(d.invited_count ?? 0),
    qualified_count: Number(d.qualified_count ?? 0),
    earned_px: Number(d.earned_px ?? 0),
    my_referral_status: (d.my_referral_status as ReferralDashboard["my_referral_status"]) ?? null,
    my_signup_reward_px: Number(d.my_signup_reward_px ?? DEFAULT_DASHBOARD.my_signup_reward_px),
    my_activation_reward_px: Number(d.my_activation_reward_px ?? DEFAULT_DASHBOARD.my_activation_reward_px),
    recent: Array.isArray(d.recent) ? (d.recent as ReferralDashboard["recent"]) : [],
  };
}

/** Loads referral link + stats; falls back to get_or_create_referral_code when dashboard RPC is missing. */
export async function fetchReferralDashboard(): Promise<ReferralDashboard> {
  const dashRes = await supabase.rpc("get_referral_dashboard" as never);
  const fromDash = asDashboard(dashRes.data);
  if (!dashRes.error && fromDash) return fromDash;

  const { data: code, error: codeError } = await supabase.rpc("get_or_create_referral_code" as never);
  if (codeError) throw codeError;
  if (typeof code !== "string" || !code) throw new Error("NO_REFERRAL_CODE");

  return { code, ...DEFAULT_DASHBOARD };
}

export function buildReferralShareUrl(code: string): string {
  if (typeof window === "undefined") return `/?ref=${code}`;
  return `${window.location.origin}/?ref=${code}`;
}
