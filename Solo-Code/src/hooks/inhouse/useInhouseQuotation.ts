import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useQuotations, quotationsKey, rowToQuotation } from "@/store/quotations";
import type { InhouseOrg } from "@/lib/inhouse/types";
import { buildOrgIssuerSnapshot } from "@/lib/quotationKinds";
import type { InhouseOrgMember } from "@/lib/inhouse/types";

export function useOrgQuotations(orgId: string | undefined) {
  return useQuery({
    queryKey: ["inhouse-quotations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("org_id", orgId!)
        .eq("quotation_kind", "inhouse")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToQuotation(r));
    },
  });
}

export function useCreateInhouseQuotation() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { create } = useQuotations();
  const userId = user?.id ?? null;

  return useMutation({
    mutationFn: async (opts: {
      org: InhouseOrg;
      members: InhouseOrgMember[];
      workspaceId?: string;
      projectName?: string;
      clientName?: string;
    }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบก่อน");

      const snapshot = buildOrgIssuerSnapshot(opts.org);
      const q = await create({
        quotationKind: "inhouse",
        orgId: opts.org.id,
        orgSnapshot: snapshot,
        inhouseWorkspaceId: opts.workspaceId,
        projectName: opts.projectName ?? "",
        clientName: opts.clientName ?? "",
      });

      const activeMembers = opts.members.filter((m) => m.status === "active");
      const collabRows = activeMembers.map((m, i) => ({
        quotation_id: q.id,
        user_id: m.user_id,
        display_name: m.profile?.display_name ?? null,
        role: m.user_id === user.id ? "lead" : "member",
        revenue_percent: null,
        sort_order: i,
      }));

      if (collabRows.length > 0) {
        const { error: collabErr } = await supabase
          .from("quotation_collaborators")
          .insert(collabRows);
        if (collabErr) throw collabErr;
      }

      if (opts.workspaceId) {
        const { error: wsErr } = await supabase
          .from("inhouse_workspaces")
          .update({ linked_quotation_id: q.id, updated_at: new Date().toISOString() })
          .eq("id", opts.workspaceId);
        if (wsErr) throw wsErr;
      }

      return q;
    },
    onSuccess: (q, vars) => {
      if (userId) qc.invalidateQueries({ queryKey: quotationsKey(userId) });
      qc.invalidateQueries({ queryKey: ["inhouse-quotations", vars.org.id] });
      if (vars.workspaceId) {
        qc.invalidateQueries({ queryKey: ["inhouse-workspaces", vars.org.id] });
      }
    },
  });
}
