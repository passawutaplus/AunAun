import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { assertSourceUrl } from "@/lib/marketing/compliance";
import { DEMO_CONTENT } from "@/lib/marketing/demo-data";
import { isMarketingTableMissing, newLocalId, readLocalMarketingStore, writeLocalMarketingStore } from "@/lib/marketing/local-store";
import type { MarketingContentItem } from "@/lib/marketing/types";
import { marketingContentKey } from "./useMarketingBusinesses";

function mapContent(row: Record<string, unknown>): MarketingContentItem {
  return row as unknown as MarketingContentItem;
}

export function useMarketingContent(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: marketingContentKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_content_items")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          let local = store.content.filter((c) => c.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_CONTENT.map((c) => ({ ...c, business_id: businessId }));
            store.content.push(...seeded);
            writeLocalMarketingStore(store);
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
    mutationFn: async (input: Omit<MarketingContentItem, "id" | "created_at" | "business_id">) => {
      const content_url = assertSourceUrl(input.content_url);
      const payload = { ...input, content_url, business_id: businessId! };
      const { data, error } = await supabase.from("kuy_content_items").insert(payload).select().single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const row = { id: newLocalId(), ...payload, created_at: new Date().toISOString() };
          store.content.unshift(row);
          writeLocalMarketingStore(store);
          return mapContent(row);
        }
        throw error;
      }
      return mapContent(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingContentKey(businessId) }),
  });

  return { ...query, contentItems: query.data ?? [], createContent: createMutation.mutateAsync };
}
