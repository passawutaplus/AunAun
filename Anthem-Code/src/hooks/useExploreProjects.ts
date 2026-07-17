import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_FEED_CARD_SELECT } from "@/lib/dbSelects";
import { normalizeTag, normalizeToolName } from "@/lib/exploreRoutes";
import type { DBProject } from "@/hooks/useProjects";

const EXPLORE_LIMIT = 200;

function tagScore(tag: string, query: string): number {
  const t = normalizeTag(tag);
  const q = normalizeTag(query);
  if (t === q) return 3;
  if (t.includes(q) || q.includes(t)) return 2;
  return 0;
}

export function filterProjectsByTool(projects: DBProject[], tool: string): DBProject[] {
  return filterProjectsByTools(projects, [tool]);
}

/** Project must list every tool (AND). */
export function filterProjectsByTools(projects: DBProject[], tools: string[]): DBProject[] {
  const needles = tools.map(normalizeToolName).filter(Boolean);
  if (needles.length === 0) return [];
  return projects.filter((p) => {
    const projectTools = new Set((p.tools ?? []).map(normalizeToolName));
    return needles.every((needle) => projectTools.has(needle));
  });
}

export function filterProjectsByTag(projects: DBProject[], tag: string): DBProject[] {
  const q = normalizeTag(tag);
  if (!q) return [];
  const scored = projects
    .map((p) => {
      const tags = p.tags ?? [];
      const best = Math.max(0, ...tags.map((t) => tagScore(t, q)));
      return { p, best };
    })
    .filter(({ best }) => best > 0)
    .sort((a, b) => b.best - a.best || b.p.likes - a.p.likes);
  return scored.map(({ p }) => p);
}

async function fetchPublishedPool(): Promise<DBProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_FEED_CARD_SELECT)
    .eq("status", "Published")
    .order("created_at", { ascending: false })
    .limit(EXPLORE_LIMIT);
  if (error) throw error;
  return (data ?? []) as DBProject[];
}

export const useProjectsByTool = (tool: string) =>
  useQuery({
    queryKey: ["explore-tool", tool],
    enabled: !!tool.trim(),
    queryFn: async () => filterProjectsByTool(await fetchPublishedPool(), tool),
  });

export const useProjectsByTag = (tag: string) =>
  useQuery({
    queryKey: ["explore-tag", tag],
    enabled: !!tag.trim(),
    queryFn: async () => filterProjectsByTag(await fetchPublishedPool(), tag),
  });
