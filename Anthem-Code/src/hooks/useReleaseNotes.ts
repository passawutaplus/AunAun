import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReleaseTag = "new" | "improved" | "fixed";

export const RELEASE_TAG_LABEL: Record<ReleaseTag, string> = {
  new: "ใหม่",
  improved: "ปรับปรุง",
  fixed: "แก้แล้ว",
};

export type ReleaseNote = {
  id: string;
  title: string;
  body: string;
  tag: ReleaseTag;
  feedback_ids: string[];
  published_at: string | null;
  created_at: string;
};

/** Published release notes, newest first (RLS hides drafts from non-admins). */
export function useReleaseNotes(limit = 50) {
  return useQuery({
    queryKey: ["release-notes", limit],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_notes" as never)
        .select("id, title, body, tag, feedback_ids, published_at, created_at")
        .not("published_at", "is", null)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as ReleaseNote[];
    },
  });
}
