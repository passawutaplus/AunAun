import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AiMonitorResponse } from "@/lib/aiMonitorTypes";

export function useAdminAiMonitor() {
  return useQuery({
    queryKey: ["admin-ai-monitor"],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<AiMonitorResponse> => {
      const { data, error } = await supabase.functions.invoke("admin-ai-monitor", {
        method: "GET",
      });
      if (error) throw error;
      if (data?.error === "forbidden") throw new Error("ต้องเป็น admin");
      if (data?.error) throw new Error(String(data.error));
      return data as AiMonitorResponse;
    },
  });
}
