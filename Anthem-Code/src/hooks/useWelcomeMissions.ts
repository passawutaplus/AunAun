import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
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
      if (error) throw error;
      return data as {
        mission_id: string;
        reward_px: number;
        welcome_px: number;
        lifetime_welcome_px: number;
        cap: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", userId] });
      qc.invalidateQueries({ queryKey: ["wallet-available-gift", userId] });
      qc.invalidateQueries({ queryKey: ["welcome-mission-claims", userId] });
      qc.invalidateQueries({ queryKey: ["onboarding-checklist", userId] });
    },
  });

  const claimedIds = new Set((claims.data ?? []).map((c) => c.mission_id));
  const claimedPx = (claims.data ?? []).reduce((s, c) => s + c.reward_px, 0);

  return {
    welcomePx: walletReady ? (wallet?.welcome_px ?? 0) : 0,
    lifetimeWelcomePx: walletReady ? (wallet?.lifetime_welcome_px ?? 0) : 0,
    claimedIds,
    claimedPx,
    claims: claims.data ?? [],
    isLoading: (walletReady && walletLoading) || claims.isLoading,
    claim,
  };
}
