import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { isMarketingTableMissing, readLocalMarketingStore, writeLocalMarketingStore } from "@/lib/marketing/local-store";
import type { MarketingLanguage, MarketingSettings } from "@/lib/marketing/types";
import { marketingSettingsKey } from "./useMarketingBusinesses";

function mapSettings(row: Record<string, unknown>): MarketingSettings {
  return row as unknown as MarketingSettings;
}

export function useMarketingSettings(businessId: string | null) {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...marketingSettingsKey(user?.id ?? null), businessId],
    enabled: isAdmin === true && !!user,
    queryFn: async () => {
      let q = supabase.from("kuy_settings").select("*").eq("owner_id", user!.id);
      if (businessId) q = q.eq("business_id", businessId);
      const { data, error } = await q.maybeSingle();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const row = store.settings.find(
            (s) => s.owner_id === user!.id && s.business_id === businessId,
          );
          if (row) return mapSettings(row);
          return null;
        }
        throw error;
      }
      return data ? mapSettings(data as Record<string, unknown>) : null;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (patch: Partial<MarketingSettings> & { default_language?: MarketingLanguage }) => {
      const payload = {
        owner_id: user!.id,
        business_id: businessId,
        default_language: patch.default_language ?? "both",
        timezone: patch.timezone ?? "Asia/Bangkok",
        data_retention_days: patch.data_retention_days ?? 365,
        export_default_format: patch.export_default_format ?? "csv",
        ai_mock_enabled: patch.ai_mock_enabled ?? true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("kuy_settings")
        .upsert(payload, { onConflict: "owner_id,business_id" })
        .select()
        .single();
      if (error) {
        if (isMarketingTableMissing(error)) {
          const store = readLocalMarketingStore();
          const row = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };
          store.settings = store.settings.filter(
            (s) => !(s.owner_id === user!.id && s.business_id === businessId),
          );
          store.settings.push(row);
          writeLocalMarketingStore(store);
          return mapSettings(row);
        }
        throw error;
      }
      return mapSettings(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: marketingSettingsKey(user?.id ?? null) }),
  });

  const logExportMutation = useMutation({
    mutationFn: async (args: {
      export_format: string;
      report_type: string;
      row_count: number;
      compliance_confirmed: boolean;
    }) => {
      if (!businessId) return;
      const { error } = await supabase.rpc("kuy_log_export" as never, {
        _business_id: businessId,
        _export_format: args.export_format,
        _report_type: args.report_type,
        _row_count: args.row_count,
        _compliance_confirmed: args.compliance_confirmed,
      } as never);
      if (error && !isMarketingTableMissing(error)) throw error;
      await supabase.from("kuy_reports").insert({
        business_id: businessId,
        report_type: args.report_type,
        export_format: args.export_format,
        compliance_confirmed: args.compliance_confirmed,
      });
    },
  });

  return {
    ...query,
    settings: query.data,
    saveSettings: saveMutation.mutateAsync,
    logExport: logExportMutation.mutateAsync,
  };
}
