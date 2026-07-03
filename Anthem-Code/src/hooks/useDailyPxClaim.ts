import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Wallet } from "@/hooks/useWallet";

export type DailyPxStatus = {
  claim_date: string;
  claimed_today: boolean;
  reward_px: number;
  streak: number;
  welcome_px?: number;
  purchased_px?: number;
  balance_px?: number;
  giftable_px?: number;
};

export type DailyPxClaimResult = DailyPxStatus & {
  welcome_px: number;
  balance_px: number;
};

function parseDailyPxStatus(row: Record<string, unknown>): DailyPxStatus {
  return {
    claim_date: String(row.claim_date ?? ""),
    claimed_today: Boolean(row.claimed_today),
    reward_px: Number(row.reward_px ?? 1),
    streak: Number(row.streak ?? 0),
    welcome_px: row.welcome_px != null ? Number(row.welcome_px) : undefined,
    purchased_px: row.purchased_px != null ? Number(row.purchased_px) : undefined,
    balance_px: row.balance_px != null ? Number(row.balance_px) : undefined,
    giftable_px: row.giftable_px != null ? Number(row.giftable_px) : undefined,
  };
}

export function useDailyPxStatus(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const enabled = (options?.enabled ?? true) && !!user?.id;

  return useQuery({
    queryKey: ["daily-px-status", user?.id],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<DailyPxStatus> => {
      const { data, error } = await supabase.rpc("daily_px_claim_status");
      if (error) throw error;
      return parseDailyPxStatus(data as Record<string, unknown>);
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
      const row = parseDailyPxStatus(data as Record<string, unknown>);
      return {
        ...row,
        claimed_today: true,
        welcome_px: Number((data as Record<string, unknown>).welcome_px ?? row.welcome_px ?? 0),
        balance_px: Number((data as Record<string, unknown>).balance_px ?? row.balance_px ?? 0),
      };
    },
    onSuccess: (result) => {
      qc.setQueryData<Wallet | undefined>(["wallet", user?.id], (old) => {
        if (!old) {
          return {
            user_id: user!.id,
            balance_px: result.balance_px,
            purchased_px: result.purchased_px ?? 0,
            earned_px: 0,
            welcome_px: result.welcome_px,
            lifetime_welcome_px: 0,
            lifetime_earned_px: 0,
            lifetime_spent_px: 0,
            updated_at: new Date().toISOString(),
          };
        }
        return {
          ...old,
          welcome_px: result.welcome_px,
          balance_px: result.balance_px,
          updated_at: new Date().toISOString(),
        };
      });
      void qc.invalidateQueries({ queryKey: ["daily-px-status", user?.id] });
      void qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      void qc.invalidateQueries({ queryKey: ["wallet-available-gift", user?.id] });
      void qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user?.id] });
    },
  });
}
