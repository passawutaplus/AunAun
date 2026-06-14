import { useMutation, useQueryClient } from "@tanstack/react-query";
import { opsDb, supabase } from "@/integrations/supabase/db";
import type { TrackingSite } from "@/lib/ecosystem-tracking";
import {
  collectTrackingIssueDrafts,
  siteToProjectSlug,
  type TrackingIssueDraft,
} from "@/lib/tracking-issues";

export type CreateTrackingResult = {
  created: number;
  skipped: number;
  total: number;
};

async function resolveProjectId(site: TrackingSite) {
  const slug = siteToProjectSlug(site.id);
  const { data, error } = await opsDb.from("projects").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`ไม่พบ ops.projects slug=${slug}`);
  return data.id as string;
}

async function existingTrackingLabels(projectId: string) {
  const { data, error } = await opsDb
    .from("issues")
    .select("labels")
    .eq("project_id", projectId)
    .eq("source_type", "tracking");
  if (error) throw error;
  return new Set((data ?? []).flatMap((row) => (row.labels as string[] | null) ?? []));
}

async function insertDrafts(projectId: string, userId: string, drafts: TrackingIssueDraft[]) {
  if (drafts.length === 0) return;

  const rows = drafts.map((draft) => ({
    title: draft.title,
    description: draft.description,
    project_id: projectId,
    status: "backlog" as const,
    priority: draft.priority,
    source_type: "tracking",
    source_id: null,
    labels: [draft.label, "from-tracking"],
    created_by: userId,
  }));

  const { error } = await opsDb.from("issues").insert(rows);
  if (error) throw error;
}

export function useCreateTrackingIssues() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      site: TrackingSite;
      filter?: { categoryId: string; featureName: string };
    }): Promise<CreateTrackingResult> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("ไม่ได้ login");

      const drafts = collectTrackingIssueDrafts(input.site, input.filter);
      const projectId = await resolveProjectId(input.site);
      const labels = await existingTrackingLabels(projectId);
      const toCreate = drafts.filter((d) => !labels.has(d.label));

      await insertDrafts(projectId, auth.user.id, toCreate);

      return {
        created: toCreate.length,
        skipped: drafts.length - toCreate.length,
        total: drafts.length,
      };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-issues"] });
      void qc.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}
