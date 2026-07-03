import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isForbiddenError, isOptionalQueryError } from "@/lib/supabaseErrors";

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

function emptyWallet(userId: string): Wallet {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    balance_px: 0,
    purchased_px: 0,
    earned_px: 0,
    welcome_px: 0,
    lifetime_welcome_px: 0,
    lifetime_earned_px: 0,
    lifetime_spent_px: 0,
    updated_at: now,
  };
}

function parseWalletRow(row: Record<string, unknown>, userId: string): Wallet {
  return {
    user_id: String(row.user_id ?? userId),
    balance_px: Number(row.balance_px ?? 0),
    purchased_px: Number(row.purchased_px ?? 0),
    earned_px: Number(row.earned_px ?? 0),
    welcome_px: Number(row.welcome_px ?? 0),
    lifetime_welcome_px: Number(row.lifetime_welcome_px ?? 0),
    lifetime_earned_px: Number(row.lifetime_earned_px ?? 0),
    lifetime_spent_px: Number(row.lifetime_spent_px ?? 0),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

export const useWallet = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user?.id,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Wallet> => {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_my_wallet");
      if (!rpcErr && rpcData && typeof rpcData === "object") {
        return parseWalletRow(rpcData as Record<string, unknown>, user!.id);
      }

      const { data: existing, error: readErr } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (readErr && isForbiddenError(readErr)) return emptyWallet(user!.id);
      if (existing) return existing as Wallet;
      const { data: inserted, error } = await supabase
        .from("wallets")
        .insert({ user_id: user!.id })
        .select()
        .single();
      if (error) {
        if (isOptionalQueryError(error)) return emptyWallet(user!.id);
        throw error;
      }
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
      if (!error) return (data ?? 0) as number;
      if (isOptionalQueryError(error)) {
        const { data: row, error: readErr } = await supabase
          .from("wallets")
          .select("purchased_px")
          .eq("user_id", user!.id)
          .maybeSingle();
        if (readErr && !isOptionalQueryError(readErr)) throw readErr;
        return Number(row?.purchased_px ?? 0);
      }
      throw error;
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
