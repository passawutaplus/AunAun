import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import type { InfraMonitorResponse } from "@/lib/infra-monitor-types";

export function useInfraMonitor() {
  return useQuery<InfraMonitorResponse>({
    queryKey: ["ops-infra-monitor"],
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<InfraMonitorResponse> => {
      const { data, error } = await supabase.functions.invoke("ops-infra-monitor", {
        method: "GET",
      });
      if (error) throw error;
      if (!data || (data as { error?: string }).error) {
        throw new Error((data as { error?: string })?.error ?? "ops-infra-monitor failed");
      }
      return data as InfraMonitorResponse;
    },
  });
}
