import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { assertSourceUrl } from "@/lib/kuy-radar/compliance";
import { DEMO_CONTENT } from "@/lib/kuy-radar/demo-data";
import { isKuyTableMissing, newLocalId, readLocalKuyStore, writeLocalKuyStore } from "@/lib/kuy-radar/local-store";
import type { KuyContentItem } from "@/lib/kuy-radar/types";
import { kuyContentKey } from "./useKuyRadarBusinesses";

function mapContent(row: Record<string, unknown>): KuyContentItem {
  return row as unknown as KuyContentItem;
}

export function useKuyRadarContent(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: kuyContentKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_content_items")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          let local = store.content.filter((c) => c.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_CONTENT.map((c) => ({ ...c, business_id: businessId }));
            store.content.push(...seeded);
            writeLocalKuyStore(store);
            local = store.content.filter((c) => c.business_id === businessId);
          }
          return local.map(mapContent);
        }
        throw error;
      }
      return (data ?? []).map(mapContent);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Omit<KuyContentItem, "id" | "created_at" | "business_id">) => {
      const content_url = assertSourceUrl(input.content_url);
      const payload = { ...input, content_url, business_id: businessId! };
      const { data, error } = await supabase.from("kuy_content_items").insert(payload).select().single();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const row = { id: newLocalId(), ...payload, created_at: new Date().toISOString() };
          store.content.unshift(row);
          writeLocalKuyStore(store);
          return mapContent(row);
        }
        throw error;
      }
      return mapContent(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyContentKey(businessId) }),
  });

  return { ...query, contentItems: query.data ?? [], createContent: createMutation.mutateAsync };
}
