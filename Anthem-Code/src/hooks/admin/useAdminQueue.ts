import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { countSource, useAdminAlertCounts } from "@/hooks/admin/useAdminAlerts";
import { adminBadgeCounts, adminQueueEntries, type AdminBadgeCounts } from "@/lib/admin/adminNavigation";

/** The three queues that are not part of the 30 s alert counters. Three head-counts, not the whole stats block. */
function useAdminExtraQueues() {
  return useQuery({
    queryKey: ["admin-queue-extra"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [pendingHiring, pendingCollabs, openFeedback] = await Promise.all([
        countSource("hiring", () => supabase.from("hiring_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่")),
        countSource("collabs", () => supabase.from("collab_requests").select("*", { count: "exact", head: true }).eq("status", "pending")),
        countSource("feedback", () => supabase.from("app_feedback" as never).select("*", { count: "exact", head: true }).eq("status", "new")),
      ]);
      return { pendingHiring, pendingCollabs, openFeedback };
    },
  });
}

/** One place for "what is waiting for me": counts per queue, the ordered list, and a grand total. */
export function useAdminQueue() {
  const { data: alerts, isLoading: alertsLoading } = useAdminAlertCounts();
  const { data: extra, isLoading: extraLoading } = useAdminExtraQueues();

  const counts: AdminBadgeCounts = useMemo(() => adminBadgeCounts(alerts, extra), [alerts, extra]);
  const entries = useMemo(() => adminQueueEntries(counts), [counts]);
  const total = useMemo(() => entries.reduce((sum, e) => sum + e.count, 0), [entries]);

  return { counts, entries, total, loading: alertsLoading || extraLoading, unavailable: alerts?.unavailable ?? [] };
}
