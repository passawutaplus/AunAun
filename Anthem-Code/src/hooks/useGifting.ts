import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { notifyAnthem } from "@/lib/notifyAnthem";
import { isOptionalQueryError } from "@/lib/supabaseErrors";

export interface Gift {
  id: string;
  code: string;
  name_th: string;
  name_en: string;
  price_px: number;
  icon: string;
  display_order: number;
  active: boolean;
}

export interface GiftTransaction {
  id: string;
  sender_id: string;
  recipient_id: string;
  gift_id: string;
  price_px: number;
  message: string;
  project_id: string | null;
  created_at: string;
}

export const useGifts = () =>
  useQuery({
    queryKey: ["gifts"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as Gift[];
    },
  });

export const useSendGift = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      recipientId: string;
      giftId: string;
      message?: string;
      projectId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("send_gift", {
        _recipient_id: vars.recipientId,
        _gift_id: vars.giftId,
        _message: vars.message ?? "",
        _project_id: vars.projectId ?? null,
      });
      if (error) throw error;
      return data as GiftTransaction;
    },
    onSuccess: (data, vars) => {
      notifyAnthem({ event: "gift", transaction_id: data.id });
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-available-gift", user?.id] });
      qc.invalidateQueries({ queryKey: ["wallet-available-purchased", user?.id] });
      qc.invalidateQueries({ queryKey: ["received-gifts", vars.recipientId] });
      qc.invalidateQueries({ queryKey: ["sent-gifts", user?.id] });
    },
  });
};

export const useReceivedGifts = (userId: string | undefined, limit = 100) =>
  useQuery({
    queryKey: ["received-gifts", userId, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_transactions")
        .select("*")
        .eq("recipient_id", userId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        if (isOptionalQueryError(error)) return [];
        throw error;
      }
      return (data ?? []) as GiftTransaction[];
    },
  });
