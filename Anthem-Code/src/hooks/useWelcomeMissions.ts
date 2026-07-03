import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWallet, type Wallet } from "@/hooks/useWallet";
import type { OnboardingTaskId } from "@/lib/onboardingTasks";

export type WelcomeClaim = {
  mission_id: string;
  reward_px: number;
  claimed_at: string;
};

export function useWelcomeMissions(userId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const walletReady = !!userId && user?.id === userId;

  const claims = useQuery({
    queryKey: ["welcome-mission-claims", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("welcome_mission_claims")
        .select("mission_id, reward_px, claimed_at")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as WelcomeClaim[];
    },
  });

  const claim = useMutation({
    mutationFn: async (missionId: OnboardingTaskId) => {
      const { data, error } = await supabase.rpc("claim_welcome_mission", {
        _mission_id: missionId,
      });
      if (error) throw new Error(error.message ?? "ไม่สามารถรับรางวัลภารกิจได้");
      return data as {
        mission_id: string;
        reward_px: number;
        welcome_px: number;
        lifetime_welcome_px: number;
        cap: number;
      };
    },
    onSuccess: (data) => {
      if (!userId) return;
      qc.setQueryData<Wallet | undefined>(["wallet", userId], (old) => {
        const base: Wallet =
          old ??
          ({
            user_id: userId,
            balance_px: 0,
            purchased_px: 0,
            earned_px: 0,
            welcome_px: 0,
            lifetime_welcome_px: 0,
            lifetime_earned_px: 0,
            lifetime_spent_px: 0,
            updated_at: new Date().toISOString(),
          } satisfies Wallet);
        return {
          ...base,
          welcome_px: data.welcome_px,
          lifetime_welcome_px: data.lifetime_welcome_px,
          updated_at: new Date().toISOString(),
        };
      });
      void qc.invalidateQueries({ queryKey: ["wallet", userId] });
      void qc.invalidateQueries({ queryKey: ["wallet-available-gift", userId] });
      void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", userId] });
      void qc.invalidateQueries({ queryKey: ["welcome-mission-claims", userId] });
      void qc.invalidateQueries({ queryKey: ["onboarding-checklist", userId] });
      void qc.cancelQueries({ queryKey: ["daily-px-status", userId] });
    },
  });

  const claimedIds = new Set((claims.data ?? []).map((c) => c.mission_id));
  const claimedPxFromRecords = (claims.data ?? []).reduce((s, c) => s + c.reward_px, 0);
  const lifetimeWelcomePx = walletReady ? (wallet?.lifetime_welcome_px ?? 0) : 0;
  const welcomePx = walletReady ? (wallet?.welcome_px ?? 0) : 0;

  return {
    welcomePx,
    lifetimeWelcomePx,
    claimedPx: Math.max(claimedPxFromRecords, lifetimeWelcomePx),
    claimedIds,
    claims: claims.data ?? [],
    isLoading: (walletReady && walletLoading) || claims.isLoading,
    claim,
  };
}
