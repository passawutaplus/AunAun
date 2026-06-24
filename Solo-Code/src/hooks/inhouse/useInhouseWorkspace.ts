import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type { InhouseWorkspace } from "@/lib/inhouse/types";

export function useInhouseWorkspaces(orgId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["inhouse-workspaces", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inhouse_workspaces")
        .select("*")
        .eq("org_id", orgId!)
        .is("archived_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InhouseWorkspace[];
    },
  });

  useEffect(() => {
    if (!orgId) return;
    const ch = supabase
      .channel(`inhouse-ws-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inhouse_workspaces", filter: `org_id=eq.${orgId}` },
        () => queryClient.invalidateQueries({ queryKey: ["inhouse-workspaces", orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgId, queryClient]);

  return query;
}

export function useInhouseWorkspace(
  orgSlug: string | undefined,
  workspaceSlug: string | undefined,
) {
  return useQuery({
    queryKey: ["inhouse-workspace", orgSlug, workspaceSlug],
    enabled: !!orgSlug && !!workspaceSlug,
    queryFn: async () => {
      const { data: org, error: orgErr } = await supabase
        .from("inhouse_orgs")
        .select("id")
        .eq("slug", orgSlug!)
        .maybeSingle();
      if (orgErr) throw orgErr;
      if (!org) return null;

      const { data, error } = await supabase
        .from("inhouse_workspaces")
        .select("*")
        .eq("org_id", org.id)
        .eq("slug", workspaceSlug!)
        .is("archived_at", null)
        .maybeSingle();
      if (error) throw error;
      return data as InhouseWorkspace | null;
    },
  });
}

export function useCreateInhouseWorkspace() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (opts: { orgId: string; name: string; description?: string }) => {
      const slug =
        opts.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";

      const { data: ws, error } = await supabase
        .from("inhouse_workspaces")
        .insert({
          org_id: opts.orgId,
          name: opts.name.trim(),
          slug,
          description: opts.description ?? null,
          created_by: user!.id,
        })
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("inhouse_channels").insert({
        workspace_id: ws.id,
        name: "general",
        is_default: true,
      });

      const { data: ownerMember } = await supabase
        .from("inhouse_org_members")
        .select("id")
        .eq("org_id", opts.orgId)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();

      if (ownerMember) {
        await supabase.from("inhouse_workspace_members").insert({
          workspace_id: ws.id,
          org_member_id: ownerMember.id,
        });
      }

      await supabase.rpc("log_inhouse_activity", {
        _org_id: opts.orgId,
        _workspace_id: ws.id,
        _event_type: "workspace_created",
        _metadata: { name: opts.name },
      });

      return ws as InhouseWorkspace;
    },
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ["inhouse-workspaces", ws.org_id] });
    },
  });
}

export function useUpdateInhouseWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opts: {
      id: string;
      orgId: string;
      name?: string;
      description?: string | null;
      settings?: InhouseWorkspace["settings"];
    }) => {
      const patch: Partial<Pick<InhouseWorkspace, "name" | "description" | "settings">> & {
        updated_at: string;
      } = { updated_at: new Date().toISOString() };
      if (opts.name !== undefined) patch.name = opts.name;
      if (opts.description !== undefined) patch.description = opts.description;
      if (opts.settings !== undefined) patch.settings = opts.settings;
      const { data, error } = await supabase
        .from("inhouse_workspaces")
        .update(patch)
        .eq("id", opts.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as InhouseWorkspace;
    },
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ["inhouse-workspaces", ws.org_id] });
      qc.invalidateQueries({ queryKey: ["inhouse-workspace"] });
    },
  });
}

export function useArchiveInhouseWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (opts: { id: string; orgId: string }) => {
      const { error } = await supabase
        .from("inhouse_workspaces")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", opts.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["inhouse-workspaces", vars.orgId] });
    },
  });
}

export function useCreateWorkspaceFromQuotation() {
  const createWs = useCreateInhouseWorkspace();

  return useMutation({
    mutationFn: async (opts: { orgId: string; quotationId: string; title: string }) => {
      const ws = await createWs.mutateAsync({
        orgId: opts.orgId,
        name: opts.title,
        description: `Linked to quotation ${opts.quotationId}`,
      });
      await supabase
        .from("inhouse_workspaces")
        .update({ linked_quotation_id: opts.quotationId })
        .eq("id", ws.id);
      return ws;
    },
  });
}
