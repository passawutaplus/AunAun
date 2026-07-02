import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { DEMO_BUSINESSES } from "@/lib/kuy-radar/demo-data";
import { isKuyTableMissing, newLocalId, readLocalKuyStore, writeLocalKuyStore } from "@/lib/kuy-radar/local-store";
import type { KuyBusiness, KuyLanguage } from "@/lib/kuy-radar/types";
import { useKuyRadarContext } from "./KuyRadarContext";

export const kuyBusinessKey = ["kuy-radar", "businesses"] as const;
export const kuyLeadsKey = (businessId: string | null) => ["kuy-radar", "leads", businessId] as const;
export const kuyCompetitorsKey = (businessId: string | null) => ["kuy-radar", "competitors", businessId] as const;
export const kuyContentKey = (businessId: string | null) => ["kuy-radar", "content", businessId] as const;
export const kuyInsightsKey = (businessId: string | null) => ["kuy-radar", "insights", businessId] as const;
export const kuySettingsKey = (ownerId: string | null) => ["kuy-radar", "settings", ownerId] as const;

function mapBusiness(row: Record<string, unknown>): KuyBusiness {
  return row as unknown as KuyBusiness;
}

export function useKuyRadarBusinesses() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { activeBusinessId, setActiveBusinessId } = useKuyRadarContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: kuyBusinessKey,
    enabled: isAdmin === true && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_businesses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          if (store.businesses.length === 0) {
            store.businesses = DEMO_BUSINESSES.map((b) => ({
              ...b,
              owner_id: user!.id,
            }));
            writeLocalKuyStore(store);
          }
          return store.businesses.map(mapBusiness);
        }
        throw error;
      }
      return (data ?? []).map(mapBusiness);
    },
  });

  useEffectAutoSelectBusiness(query.data, activeBusinessId, setActiveBusinessId);

  const createMutation = useMutation({
    mutationFn: async (input: Partial<KuyBusiness> & { business_name: string; category: string }) => {
      const payload = {
        owner_id: user!.id,
        business_name: input.business_name,
        category: input.category,
        product_service: input.product_service ?? null,
        target_customer: input.target_customer ?? null,
        location: input.location ?? null,
        language: (input.language ?? "both") as KuyLanguage,
        main_keyword: input.main_keyword ?? null,
        pain_points: input.pain_points ?? [],
        goals: input.goals ?? [],
        preferred_platforms: input.preferred_platforms ?? [],
      };
      const { data, error } = await supabase.from("kuy_businesses").insert(payload).select().single();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const row = {
            id: newLocalId(),
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          store.businesses.unshift(row);
          writeLocalKuyStore(store);
          return mapBusiness(row);
        }
        throw error;
      }
      return mapBusiness(data as Record<string, unknown>);
    },
    onSuccess: (biz) => {
      setActiveBusinessId(biz.id);
      void qc.invalidateQueries({ queryKey: kuyBusinessKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<KuyBusiness> }) => {
      const { data, error } = await supabase
        .from("kuy_businesses")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const idx = store.businesses.findIndex((b) => b.id === id);
          if (idx >= 0) {
            store.businesses[idx] = { ...store.businesses[idx], ...patch, updated_at: new Date().toISOString() };
            writeLocalKuyStore(store);
            return mapBusiness(store.businesses[idx]);
          }
          throw error;
        }
        throw error;
      }
      return mapBusiness(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyBusinessKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase.rpc("kuy_delete_business_data" as never, {
        _business_id: businessId,
      } as never);
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          store.businesses = store.businesses.filter((b) => b.id !== businessId);
          store.leads = store.leads.filter((l) => l.business_id !== businessId);
          store.competitors = store.competitors.filter((c) => c.business_id !== businessId);
          store.content = store.content.filter((c) => c.business_id !== businessId);
          store.insights = store.insights.filter((i) => i.business_id !== businessId);
          writeLocalKuyStore(store);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      setActiveBusinessId(null);
      void qc.invalidateQueries({ queryKey: kuyBusinessKey });
    },
  });

  const activeBusiness = query.data?.find((b) => b.id === activeBusinessId) ?? query.data?.[0] ?? null;

  return {
    ...query,
    businesses: query.data ?? [],
    activeBusiness,
    activeBusinessId: activeBusiness?.id ?? null,
    setActiveBusinessId,
    createBusiness: createMutation.mutateAsync,
    updateBusiness: updateMutation.mutateAsync,
    deleteBusinessData: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}

function useEffectAutoSelectBusiness(
  businesses: KuyBusiness[] | undefined,
  activeBusinessId: string | null,
  setActiveBusinessId: (id: string | null) => void,
) {
  useEffect(() => {
    if (!businesses?.length) return;
    if (!activeBusinessId || !businesses.some((b) => b.id === activeBusinessId)) {
      setActiveBusinessId(businesses[0].id);
    }
  }, [businesses, activeBusinessId, setActiveBusinessId]);
}
