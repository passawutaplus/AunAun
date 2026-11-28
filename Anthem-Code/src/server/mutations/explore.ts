import { supabase } from "@/integrations/supabase/client";
import { exploreFollowValue } from "@/server/queries/explore";

/** Follow / unfollow a tag or a tool (anthem.explore_follows, own rows only). */
export async function setExploreFollow(userId: string, kind: "tag" | "tool", value: string, follow: boolean): Promise<void> {
  const v = exploreFollowValue(value);
  if (!v) return;
  if (follow) {
    const { error } = await supabase.from("explore_follows" as never).insert({ user_id: userId, kind, value: v } as never);
    if (error && (error as { code?: string }).code !== "23505") throw error;
    return;
  }
  const { error } = await supabase
    .from("explore_follows" as never)
    .delete()
    .eq("user_id" as never, userId as never)
    .eq("kind" as never, kind as never)
    .eq("value" as never, v as never);
  if (error) throw error;
}
