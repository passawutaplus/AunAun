import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { assertSourceUrl } from "@/lib/kuy-radar/compliance";
import { DEMO_COMPETITORS } from "@/lib/kuy-radar/demo-data";
import { isKuyTableMissing, newLocalId, readLocalKuyStore, writeLocalKuyStore } from "@/lib/kuy-radar/local-store";
import type { KuyCompetitor } from "@/lib/kuy-radar/types";
import { kuyCompetitorsKey } from "./useKuyRadarBusinesses";

function mapCompetitor(row: Record<string, unknown>): KuyCompetitor {
  return row as unknown as KuyCompetitor;
}

export function useKuyRadarCompetitors(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: kuyCompetitorsKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_competitors")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          let local = store.competitors.filter((c) => c.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_COMPETITORS.map((c) => ({ ...c, business_id: businessId }));
            store.competitors.push(...seeded);
            writeLocalKuyStore(store);
            local = store.competitors.filter((c) => c.business_id === businessId);
          }
          return local.map(mapCompetitor);
        }
        throw error;
      }
      return (data ?? []).map(mapCompetitor);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Omit<KuyCompetitor, "id" | "created_at" | "business_id">) => {
      const profile_url = assertSourceUrl(input.profile_url);
      const payload = { ...input, profile_url, business_id: businessId! };
      const { data, error } = await supabase.from("kuy_competitors").insert(payload).select().single();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const row = { id: newLocalId(), ...payload, created_at: new Date().toISOString() };
          store.competitors.unshift(row);
          writeLocalKuyStore(store);
          return mapCompetitor(row);
        }
        throw error;
      }
      return mapCompetitor(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyCompetitorsKey(businessId) }),
  });

  return { ...query, competitors: query.data ?? [], createCompetitor: createMutation.mutateAsync };
}
