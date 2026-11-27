import { supabase } from "@/integrations/supabase/client";
import { notifyAnthem } from "@/lib/notifyAnthem";

/** Follow or unfollow a person. Following sends the same notification as the old follow button. */
export async function setFollowing(followerId: string, followingId: string, follow: boolean): Promise<void> {
  if (followerId === followingId) return;
  if (follow) {
    const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    notifyAnthem({ event: "follow", following_id: followingId });
    return;
  }
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
  if (error) throw error;
}
