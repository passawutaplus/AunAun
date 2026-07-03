import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { assertSourceUrl } from "@/lib/marketing/compliance";
import { DEMO_LEADS } from "@/lib/marketing/demo-data";
import { isMarketingTableMissing, newLocalId, readLocalMarketingStore, writeLocalMarketingStore } from "@/lib/marketing/local-store";
import { scoreLeadFromFields } from "@/lib/marketing/scoring";
import type { MarketingLead, MarketingLeadStatus } from "@/lib/marketing/types";
import { marketingLeadsKey } from "./useMarketingBusinesses";

function mapLead(row: Record<string, unknown>): MarketingLead {
  return row as unknown as MarketingLead;
}

export function useMarketingLeads(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: marketingLeadsKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_leads")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const local = store.leads.filter((l) => l.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_LEADS.filter((l) => l.business_id === businessId || businessId);
            store.leads.push(...seeded.map((l) => ({ ...l, business_id: businessId })));
            writeLocalMarketingStore(store);
            return store.leads.filter((l) => l.business_id === businessId).map(mapLead);
          }
          return local.map(mapLead);
        }
        throw error;
      }
      return (data ?? []).map(mapLead);
    },
  });

  const upsertLocal = (row: Record<string, unknown>) => {
    const store = readLocalMarketingStore();
    const idx = store.leads.findIndex((l) => l.id === row.id);
    if (idx >= 0) store.leads[idx] = row;
    else store.leads.unshift(row);
    writeLocalMarketingStore(store);
    return mapLead(row);
  };

  const createMutation = useMutation({
    mutationFn: async (input: Omit<MarketingLead, "id" | "created_at" | "business_id">) => {
      const internal = input.lead_origin === "internal" || (input.tags ?? []).includes("internal");
      const source_url = assertSourceUrl(input.source_url, { internal });
      const lead_score =
        input.lead_score ??
        scoreLeadFromFields({
          hasKeywordMatch: !!input.matched_keyword,
          hasPainMatch: !!input.pain_point,
          engagement: input.engagement,
          hasBuyingSignal: !!input.buying_signal,
        });
      const payload = { ...input, source_url, lead_score, business_id: businessId! };
      const { data, error } = await supabase.from("kuy_leads").insert(payload).select().single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          return upsertLocal({
            id: newLocalId(),
            ...payload,
            created_at: new Date().toISOString(),
          });
        }
        throw error;
      }
      return mapLead(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingLeadsKey(businessId) }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MarketingLead> }) => {
      const { data, error } = await supabase.from("kuy_leads").update(patch).eq("id", id).select().single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const row = store.leads.find((l) => l.id === id);
          if (!row) throw error;
          return upsertLocal({ ...row, ...patch });
        }
        throw error;
      }
      return mapLead(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingLeadsKey(businessId) }),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: MarketingLeadStatus }) => {
      const { error } = await supabase.from("kuy_leads").update({ status }).in("id", ids);
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          store.leads = store.leads.map((l) => (ids.includes(String(l.id)) ? { ...l, status } : l));
          writeLocalMarketingStore(store);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingLeadsKey(businessId) }),
  });

  return {
    ...query,
    leads: query.data ?? [],
    createLead: createMutation.mutateAsync,
    updateLead: updateMutation.mutateAsync,
    bulkUpdateStatus: bulkStatusMutation.mutateAsync,
  };
}

export function parseLeadsCsv(text: string): Array<Partial<MarketingLead>> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const get = (name: string) => cols[headers.indexOf(name)] ?? "";
    return {
      lead_name: get("lead_name") || get("lead") || "Imported lead",
      platform: get("platform") || "Website",
      source_url: get("source_url") || get("url"),
      intent: get("intent") || null,
      pain_point: get("pain_point") || get("pain") || null,
      status: (get("status") as MarketingLeadStatus) || "new",
      engagement: Number(get("engagement")) || 0,
    };
  });
}
