import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { isKuyTableMissing, readLocalKuyStore, writeLocalKuyStore } from "@/lib/kuy-radar/local-store";
import type { KuyLanguage, KuySettings } from "@/lib/kuy-radar/types";
import { kuySettingsKey } from "./useKuyRadarBusinesses";

function mapSettings(row: Record<string, unknown>): KuySettings {
  return row as unknown as KuySettings;
}

export function useKuyRadarSettings(businessId: string | null) {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [...kuySettingsKey(user?.id ?? null), businessId],
    enabled: isAdmin === true && !!user,
    queryFn: async () => {
      let q = supabase.from("kuy_settings").select("*").eq("owner_id", user!.id);
      if (businessId) q = q.eq("business_id", businessId);
      const { data, error } = await q.maybeSingle();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
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
    mutationFn: async (patch: Partial<KuySettings> & { default_language?: KuyLanguage }) => {
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
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const row = { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() };
          store.settings = store.settings.filter(
            (s) => !(s.owner_id === user!.id && s.business_id === businessId),
          );
          store.settings.push(row);
          writeLocalKuyStore(store);
          return mapSettings(row);
        }
        throw error;
      }
      return mapSettings(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuySettingsKey(user?.id ?? null) }),
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
      if (error && !isKuyTableMissing(error)) throw error;
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
