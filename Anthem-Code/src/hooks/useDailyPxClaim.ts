import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DailyPxStatus = {
  claim_date: string;
  claimed_today: boolean;
  reward_px: number;
  streak: number;
};

export type DailyPxClaimResult = DailyPxStatus & {
  welcome_px: number;
  balance_px: number;
};

export function useDailyPxStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily-px-status", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<DailyPxStatus> => {
      const { data, error } = await supabase.rpc("daily_px_claim_status");
      if (error) throw error;
      const row = data as Record<string, unknown>;
      return {
        claim_date: String(row.claim_date ?? ""),
        claimed_today: Boolean(row.claimed_today),
        reward_px: Number(row.reward_px ?? 1),
        streak: Number(row.streak ?? 0),
      };
    },
  });
}

export function useClaimDailyPx() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<DailyPxClaimResult> => {
      const { data, error } = await supabase.rpc("claim_daily_px");
      if (error) throw error;
      const row = data as Record<string, unknown>;
      return {
        claim_date: String(row.claim_date ?? ""),
        claimed_today: true,
        reward_px: Number(row.reward_px ?? 1),
        streak: Number(row.streak ?? 0),
        welcome_px: Number(row.welcome_px ?? 0),
        balance_px: Number(row.balance_px ?? 0),
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-px-status", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-available-gift", user?.id] });
    },
  });
}
