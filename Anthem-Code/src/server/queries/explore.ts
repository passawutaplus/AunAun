import { supabase } from "@/integrations/supabase/client";
import type { ShowcaseRow } from "./showcase";

export type ExploreRow = ShowcaseRow & { tags: string[] | null; tools: string[] | null; views: number | null; likes: number | null };

/** explore_follows stores the value lower-case without "#" (hooks/useExploreFollow). */
export const exploreFollowValue = (value: string) => value.trim().replace(/^#+/, "").toLowerCase();

/** Do I follow this tag / tool (new works with it reach my notifications, DB trigger notify_explore_followers)? */
export async function getExploreFollowing(userId: string, kind: "tag" | "tool", value: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("explore_follows" as never)
    .select("value")
    .eq("user_id" as never, userId as never)
    .eq("kind" as never, kind as never)
    .eq("value" as never, exploreFollowValue(value) as never)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * The newest published works with their tags and tools, for the tag / tool pages (the old explore page
 * filtered the newest 200 the same way in the browser).
 */
export async function getExplorePool(): Promise<ExploreRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select("id, title, cover_url, gallery_urls, owner_id, created_at, cover_width, cover_height, sc_category, tags, tools, views, likes")
    .eq("status", "Published")
    .order("created_at", { ascending: false })
    .limit(400);
  if (error) throw error;
  return (data ?? []) as ExploreRow[];
}
