import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DataHubPackId } from "@/lib/admin/dataExport";
import { downloadDataPackZip } from "@/lib/admin/dataExport";

export type AdminExportPackResult = Record<string, unknown> & {
  generated_at?: string;
  days?: number;
  pack?: string;
  row_limit?: number;
};

export function useAdminExportPack(days: number, pack: DataHubPackId, enabled = true) {
  return useQuery({
    queryKey: ["admin-export-pack", days, pack],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "admin_export_data_pack" as never,
        {
          _days: days,
          _pack: pack,
          _limit: 5000,
        } as never,
      );
      if (error) throw error;
      return (data ?? {}) as AdminExportPackResult;
    },
  });
}

export function useDownloadAdminExportPack() {
  return useMutation({
    mutationFn: async (opts: { days: number; pack: DataHubPackId }) => {
      const { data, error } = await supabase.rpc(
        "admin_export_data_pack" as never,
        {
          _days: opts.days,
          _pack: opts.pack,
          _limit: 5000,
        } as never,
      );
      if (error) throw error;
      const pack = (data ?? {}) as AdminExportPackResult;
      const stamp = new Date().toISOString().slice(0, 10);
      downloadDataPackZip(pack, `aplus1-data-${opts.pack}-${opts.days}d-${stamp}.zip`);
      return pack;
    },
  });
}

export function summarizePack(pack: AdminExportPackResult | undefined) {
  if (!pack) return [] as { key: string; count: number }[];
  return Object.entries(pack)
    .filter(([k, v]) => !["generated_at", "days", "pack", "row_limit"].includes(k) && Array.isArray(v))
    .map(([key, value]) => ({ key, count: (value as unknown[]).length }))
    .sort((a, b) => b.count - a.count);
}
