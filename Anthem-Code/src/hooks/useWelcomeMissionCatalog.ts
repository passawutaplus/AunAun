import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OnboardingTaskId } from "@/lib/onboardingTasks";

export type WelcomeMissionCatalogRow = {
  id: OnboardingTaskId;
  reward_px: number;
  title_th: string;
  active: boolean;
};

export function useWelcomeMissionCatalog() {
  return useQuery({
    queryKey: ["welcome-mission-catalog"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("welcome_mission_catalog")
        .select("id, reward_px, title_th, active")
        .eq("active", true);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.id, row.reward_px ?? 0);
      }
      return map;
    },
  });
}

export function useWelcomePxCap() {
  return useQuery({
    queryKey: ["welcome-px-cap"],
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_limits_config")
        .select("welcome_px_cap")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.welcome_px_cap ?? 100);
    },
  });
}
