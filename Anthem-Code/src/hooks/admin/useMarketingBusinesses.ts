import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { DEMO_BUSINESSES } from "@/lib/marketing/demo-data";
import { isMarketingTableMissing, newLocalId, readLocalMarketingStore, writeLocalMarketingStore } from "@/lib/marketing/local-store";
import type { MarketingBusiness, MarketingLanguage } from "@/lib/marketing/types";
import { useMarketingContext } from "./MarketingContext";

export const marketingBusinessKey = ["marketing-module", "businesses"] as const;
export const marketingLeadsKey = (businessId: string | null) => ["marketing-module", "leads", businessId] as const;
export const marketingCompetitorsKey = (businessId: string | null) => ["marketing-module", "competitors", businessId] as const;
export const marketingContentKey = (businessId: string | null) => ["marketing-module", "content", businessId] as const;
export const marketingInsightsKey = (businessId: string | null) => ["marketing-module", "insights", businessId] as const;
export const marketingSettingsKey = (ownerId: string | null) => ["marketing-module", "settings", ownerId] as const;

function mapBusiness(row: Record<string, unknown>): MarketingBusiness {
  return row as unknown as MarketingBusiness;
}

export function useMarketingBusinesses() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { activeBusinessId, setActiveBusinessId } = useMarketingContext();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: marketingBusinessKey,
    enabled: isAdmin === true && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_businesses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          if (store.businesses.length === 0) {
            store.businesses = DEMO_BUSINESSES.map((b) => ({
              ...b,
              owner_id: user!.id,
            }));
            writeLocalMarketingStore(store);
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
    mutationFn: async (input: Partial<MarketingBusiness> & { business_name: string; category: string }) => {
      const payload = {
        owner_id: user!.id,
        business_name: input.business_name,
        category: input.category,
        product_service: input.product_service ?? null,
        target_customer: input.target_customer ?? null,
        location: input.location ?? null,
        language: (input.language ?? "both") as MarketingLanguage,
        main_keyword: input.main_keyword ?? null,
        pain_points: input.pain_points ?? [],
        goals: input.goals ?? [],
        preferred_platforms: input.preferred_platforms ?? [],
      };
      const { data, error } = await supabase.from("kuy_businesses").insert(payload).select().single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const row = {
            id: newLocalId(),
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          store.businesses.unshift(row);
          writeLocalMarketingStore(store);
          return mapBusiness(row);
        }
        throw error;
      }
      return mapBusiness(data as Record<string, unknown>);
    },
    onSuccess: (biz) => {
      setActiveBusinessId(biz.id);
      void qc.invalidateQueries({ queryKey: marketingBusinessKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<MarketingBusiness> }) => {
      const { data, error } = await supabase
        .from("kuy_businesses")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const idx = store.businesses.findIndex((b) => b.id === id);
          if (idx >= 0) {
            store.businesses[idx] = { ...store.businesses[idx], ...patch, updated_at: new Date().toISOString() };
            writeLocalMarketingStore(store);
            return mapBusiness(store.businesses[idx]);
          }
          throw error;
        }
        throw error;
      }
      return mapBusiness(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingBusinessKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase.rpc("kuy_delete_business_data" as never, {
        _business_id: businessId,
      } as never);
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          store.businesses = store.businesses.filter((b) => b.id !== businessId);
          store.leads = store.leads.filter((l) => l.business_id !== businessId);
          store.competitors = store.competitors.filter((c) => c.business_id !== businessId);
          store.content = store.content.filter((c) => c.business_id !== businessId);
          store.insights = store.insights.filter((i) => i.business_id !== businessId);
          writeLocalMarketingStore(store);
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      setActiveBusinessId(null);
      void qc.invalidateQueries({ queryKey: marketingBusinessKey });
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
  businesses: MarketingBusiness[] | undefined,
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
