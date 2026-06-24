import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QuotationCollaborator } from "@/lib/quotationKinds";

interface CollaboratorRow {
  id: string;
  quotation_id: string;
  user_id: string | null;
  display_name: string | null;
  role: string;
  revenue_percent: number | null;
  sort_order: number;
}

function rowToCollaborator(r: CollaboratorRow): QuotationCollaborator {
  return {
    id: r.id,
    quotationId: r.quotation_id,
    userId: r.user_id,
    displayName: r.display_name,
    role: r.role === "lead" ? "lead" : "member",
    revenuePercent: r.revenue_percent != null ? Number(r.revenue_percent) : null,
    sortOrder: r.sort_order,
  };
}

export function useQuotationCollaborators(quotationId: string | undefined) {
  return useQuery({
    queryKey: ["quotation-collaborators", quotationId],
    enabled: !!quotationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotation_collaborators")
        .select("*")
        .eq("quotation_id", quotationId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as CollaboratorRow[]).map(rowToCollaborator);
    },
  });
}

export function useSyncQuotationCollaborators() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opts: {
      quotationId: string;
      collaborators: Omit<QuotationCollaborator, "id" | "quotationId">[];
    }) => {
      const { quotationId, collaborators } = opts;
      const { error: delErr } = await supabase
        .from("quotation_collaborators")
        .delete()
        .eq("quotation_id", quotationId);
      if (delErr) throw delErr;

      if (collaborators.length === 0) return;

      const rows = collaborators.map((c, i) => ({
        quotation_id: quotationId,
        user_id: c.userId,
        display_name: c.displayName,
        role: c.role,
        revenue_percent: c.revenuePercent,
        sort_order: c.sortOrder ?? i,
      }));

      const { error } = await supabase.from("quotation_collaborators").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["quotation-collaborators", vars.quotationId] });
    },
  });
}
