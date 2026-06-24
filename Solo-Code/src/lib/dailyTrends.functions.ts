import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DailyTrendsResponse } from "@/lib/dailyTrends.types";

export type {
  DailyTrendItem,
  DailyTrendsResponse,
  DailyTrendsStatus,
} from "@/lib/dailyTrends.types";

export const getDailyTrends = createServerFn({ method: "GET" }).handler(
  async (): Promise<DailyTrendsResponse> => {
    const { readDailyTrends } = await import("@/lib/dailyTrends.server");
    return readDailyTrends();
  },
);

/** Admin/cron warm-up only — expensive RSS+AI work must not be public. */
export const generateDailyTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyTrendsResponse> => {
    const { userId, supabase } = context;
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error || !isAdmin) {
      throw new Error("Forbidden: admin role required");
    }
    const { runDailyTrendsGeneration } = await import("@/lib/dailyTrends.server");
    return runDailyTrendsGeneration(false);
  });
