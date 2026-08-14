import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MENTION_PREVIEW_ROWS, MENTION_SEARCH_ROWS } from "@/lib/commentMentions";

export type MentionProject = {
  id: string;
  title: string;
  coverUrl: string | null;
};

function sanitizeIlike(query: string): string {
  return query.replace(/[%_,()\\]/g, "").trim().slice(0, 40);
}

async function fetchMentionProjects(query: string): Promise<MentionProject[]> {
  const q = sanitizeIlike(query);
  let req = supabase.from("projects").select("id, title, cover_url").eq("status", "Published");
  if (q) req = req.ilike("title", `%${q}%`);
  const { data, error } = await req
    .order("created_at", { ascending: false })
    .limit(q ? MENTION_SEARCH_ROWS : MENTION_PREVIEW_ROWS);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    coverUrl: p.cover_url,
  }));
}

/** Published works for the @ mention popup — 3 recent, then title search. */
export function useCommentMentionProjects(query: string | null) {
  return useQuery({
    queryKey: ["comment-mention-projects", query],
    enabled: query != null,
    staleTime: 30_000,
    queryFn: () => fetchMentionProjects(query ?? ""),
  });
}
