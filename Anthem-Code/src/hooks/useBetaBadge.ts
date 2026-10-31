import { useQuery } from "@tanstack/react-query";
import { anthemDb } from "@/integrations/supabase/client";
import { parseBetaBadge } from "@/lib/betaBadge";

export function useBetaBadge(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["beta-badge", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await anthemDb.rpc("get_beta_badge" as never, { _user_id: userId } as never);
      if (error) throw error;
      return parseBetaBadge(data);
    },
  });
}
