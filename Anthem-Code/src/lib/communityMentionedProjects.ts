import { supabase } from "@/integrations/supabase/client";

export const MAX_COMMUNITY_PROJECT_MENTIONS = 3;

export type MentionedProjectSummary = {
  id: string;
  title: string;
  cover_url: string | null;
  category?: string | null;
};

export function mentionedProjectIds(projects: MentionedProjectSummary[]): string[] {
  return projects.map((p) => p.id);
}

export async function fetchMentionedProjectSummaries(
  ids: string[],
  ownerId: string,
): Promise<MentionedProjectSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, cover_url, category")
    .in("id", ids)
    .eq("owner_id", ownerId)
    .eq("status", "Published");
  if (error) throw error;
  const byId = new Map((data ?? []).map((p) => [p.id, p as MentionedProjectSummary]));
  return ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}
