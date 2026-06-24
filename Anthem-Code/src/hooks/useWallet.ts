import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Wallet {
  user_id: string;
  balance_px: number;
  purchased_px: number;
  earned_px: number;
  welcome_px: number;
  lifetime_welcome_px: number;
  lifetime_earned_px: number;
  lifetime_spent_px: number;
  updated_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Wallet> => {
      const { data: existing } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (existing) return existing as Wallet;
      const { data: inserted, error } = await supabase
        .from("wallets")
        .insert({ user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return inserted as Wallet;
    },
  });
};

/** Purchased px พร้อมใช้ส่งของขวัญ (ใช้ได้ทันทีหลังเติม) */
export const useAvailablePurchasedPx = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet-available-purchased", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_purchased_px", { _uid: user!.id });
      if (error) throw error;
      return (data ?? 0) as number;
    },
  });
};

/** Welcome + purchased px พร้อมส่งของขวัญ (welcome ไม่มี holding) */
export const useAvailablePx = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet-available-gift", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_gift_px", { _uid: user!.id });
      if (error) throw error;
      return (data ?? 0) as number;
    },
  });
};

/** ยอดส่ง gift รวมของวันนี้ */
export const useDailyGiftTotal = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily-gift-total", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("daily_gift_total", { _uid: user!.id });
      if (error) throw error;
      return (data ?? 0) as number;
    },
  });
};

/** @deprecated Mock top-up — disabled when payment_settings.mock_topup_enabled = false */
export const useTopUp = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount_px: number) => {
      const { data, error } = await supabase.rpc("topup_wallet_mock", { _amount_px: amount_px });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-available-gift", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user?.id] });
      qc.invalidateQueries({ queryKey: ["topups", user?.id] });
    },
  });
};

export const useTopUpHistory = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topups", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_topups")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
};
