import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_SLOT_MAX, supportSlotsRemaining } from "@/lib/supportSlots";

export const useSupportSlots = (recipientId: string | undefined) =>
  useQuery({
    queryKey: ["support-slots", recipientId],
    enabled: !!recipientId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_transactions")
        .select("sender_id")
        .eq("recipient_id", recipientId!);
      if (error) throw error;
      const uniqueSupporters = new Set((data ?? []).map((r) => r.sender_id)).size;
      return {
        uniqueSupporters,
        remaining: supportSlotsRemaining(uniqueSupporters),
        max: SUPPORT_SLOT_MAX,
        isFull: uniqueSupporters >= SUPPORT_SLOT_MAX,
      };
    },
  });
