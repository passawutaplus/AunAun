import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { sharedDb } from "@/integrations/supabase/db";

/** Invalidate metrics when new admin notifications arrive on shared.notifications */
export function useHubAlertWatcher(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const ch = sharedDb
      .channel("ops-hub-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "shared", table: "notifications" },
        (payload) => {
          const row = payload.new as { kind?: string };
          if (!row.kind?.startsWith("admin_")) return;
          qc.invalidateQueries({ queryKey: ["hub-metrics"] });
        },
      )
      .subscribe();

    return () => {
      sharedDb.removeChannel(ch);
    };
  }, [enabled, qc]);
}
