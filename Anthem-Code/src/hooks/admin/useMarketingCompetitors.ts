import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { assertSourceUrl } from "@/lib/marketing/compliance";
import { DEMO_COMPETITORS } from "@/lib/marketing/demo-data";
import { isMarketingTableMissing, newLocalId, readLocalMarketingStore, writeLocalMarketingStore } from "@/lib/marketing/local-store";
import type { MarketingCompetitor } from "@/lib/marketing/types";
import { marketingCompetitorsKey } from "./useMarketingBusinesses";

function mapCompetitor(row: Record<string, unknown>): MarketingCompetitor {
  return row as unknown as MarketingCompetitor;
}

export function useMarketingCompetitors(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: marketingCompetitorsKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_competitors")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          let local = store.competitors.filter((c) => c.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_COMPETITORS.map((c) => ({ ...c, business_id: businessId }));
            store.competitors.push(...seeded);
            writeLocalMarketingStore(store);
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
    mutationFn: async (input: Omit<MarketingCompetitor, "id" | "created_at" | "business_id">) => {
      const profile_url = assertSourceUrl(input.profile_url);
      const payload = { ...input, profile_url, business_id: businessId! };
      const { data, error } = await supabase.from("kuy_competitors").insert(payload).select().single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const row = { id: newLocalId(), ...payload, created_at: new Date().toISOString() };
          store.competitors.unshift(row);
          writeLocalMarketingStore(store);
          return mapCompetitor(row);
        }
        throw error;
      }
      return mapCompetitor(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingCompetitorsKey(businessId) }),
  });

  return { ...query, competitors: query.data ?? [], createCompetitor: createMutation.mutateAsync };
}
