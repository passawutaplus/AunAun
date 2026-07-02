import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { assertSourceUrl } from "@/lib/kuy-radar/compliance";
import { DEMO_LEADS } from "@/lib/kuy-radar/demo-data";
import { isKuyTableMissing, newLocalId, readLocalKuyStore, writeLocalKuyStore } from "@/lib/kuy-radar/local-store";
import { scoreLeadFromFields } from "@/lib/kuy-radar/scoring";
import type { KuyLead, KuyLeadStatus } from "@/lib/kuy-radar/types";
import { kuyLeadsKey } from "./useKuyRadarBusinesses";

function mapLead(row: Record<string, unknown>): KuyLead {
  return row as unknown as KuyLead;
}

export function useKuyRadarLeads(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: kuyLeadsKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_leads")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const local = store.leads.filter((l) => l.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_LEADS.filter((l) => l.business_id === businessId || businessId);
            store.leads.push(...seeded.map((l) => ({ ...l, business_id: businessId })));
            writeLocalKuyStore(store);
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
    const store = readLocalKuyStore();
    const idx = store.leads.findIndex((l) => l.id === row.id);
    if (idx >= 0) store.leads[idx] = row;
    else store.leads.unshift(row);
    writeLocalKuyStore(store);
    return mapLead(row);
  };

  const createMutation = useMutation({
    mutationFn: async (input: Omit<KuyLead, "id" | "created_at" | "business_id">) => {
      const source_url = assertSourceUrl(input.source_url);
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
        if (isKuyTableMissing(error)) {
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
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyLeadsKey(businessId) }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<KuyLead> }) => {
      const { data, error } = await supabase.from("kuy_leads").update(patch).eq("id", id).select().single();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const row = store.leads.find((l) => l.id === id);
          if (!row) throw error;
          return upsertLocal({ ...row, ...patch });
        }
        throw error;
      }
      return mapLead(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyLeadsKey(businessId) }),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: KuyLeadStatus }) => {
      const { error } = await supabase.from("kuy_leads").update({ status }).in("id", ids);
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          store.leads = store.leads.map((l) => (ids.includes(String(l.id)) ? { ...l, status } : l));
          writeLocalKuyStore(store);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyLeadsKey(businessId) }),
  });

  return {
    ...query,
    leads: query.data ?? [],
    createLead: createMutation.mutateAsync,
    updateLead: updateMutation.mutateAsync,
    bulkUpdateStatus: bulkStatusMutation.mutateAsync,
  };
}

export function parseLeadsCsv(text: string): Array<Partial<KuyLead>> {
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
      status: (get("status") as KuyLeadStatus) || "new",
      engagement: Number(get("engagement")) || 0,
    };
  });
}
