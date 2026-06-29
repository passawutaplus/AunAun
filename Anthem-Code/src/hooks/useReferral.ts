import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export type ReferralRecentItem = {
  id: string;
  status: "registered" | "qualified" | "rejected";
  registered_at: string;
  qualified_at: string | null;
  display_name: string;
};

export type ReferralDashboard = {
  code: string;
  signup_reward_px: number;
  activation_reward_px: number;
  referrer_reward_px: number;
  invited_count: number;
  qualified_count: number;
  earned_px: number;
  my_referral_status: "registered" | "qualified" | "rejected" | null;
  my_signup_reward_px: number;
  my_activation_reward_px: number;
  recent: ReferralRecentItem[];
};

type UseReferralDashboardOptions = {
  enabled?: boolean;
};

export function useReferralDashboard(options?: UseReferralDashboardOptions) {
  const { user } = useAuth();
  const enabled = (options?.enabled ?? true) && !!user?.id;
  return useQuery({
    queryKey: ["referral-dashboard", user?.id],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { fetchReferralDashboard } = await import("@/lib/referralDashboard");
      return fetchReferralDashboard();
    },
  });
}
