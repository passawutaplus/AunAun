import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseUsageResponse } from "@/lib/supabaseUsageTypes";

export function useAdminSupabaseUsage() {
  return useQuery({
    queryKey: ["admin-supabase-usage"],
    refetchInterval: 120_000,
    staleTime: 60_000,
    queryFn: async (): Promise<SupabaseUsageResponse> => {
      const { data, error } = await supabase.functions.invoke("admin-supabase-usage", {
        method: "GET",
      });
      if (error) throw error;
      if (data?.error === "forbidden") throw new Error("ต้องเป็น admin");
      if (data?.error) throw new Error(String(data.error));
      return data as SupabaseUsageResponse;
    },
  });
}
