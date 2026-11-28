/**
 * People to send a work to from the share panel ("ส่งในแชท", owner 2026-11-28):
 * the people you chatted with most recently, then the people you follow.
 */
import { supabase } from "@/integrations/supabase/client";
import { getProfilesByIds } from "./profiles";

export type ChatPerson = { id: string; name: string; username: string | null; avatar: string | null };

type ConvRow = { client_id: string | null; freelancer_id: string | null; conversation_type: string | null; kind: string | null };

export async function getShareChatPeople(userId: string, limit = 16): Promise<ChatPerson[]> {
  const [convs, follows] = await Promise.all([
    supabase
      .from("conversations")
      .select("client_id, freelancer_id, conversation_type, kind")
      .or(`client_id.eq.${userId},freelancer_id.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(40),
    supabase.from("follows").select("following_id").eq("follower_id", userId).order("created_at", { ascending: false }).limit(40),
  ]);

  const ids: string[] = [];
  const add = (id: string | null | undefined) => {
    if (id && id !== userId && !ids.includes(id)) ids.push(id);
  };
  for (const c of (convs.data ?? []) as ConvRow[]) {
    if (c.conversation_type === "group" || c.kind === "group" || c.kind === "studio") continue;
    add(c.client_id === userId ? c.freelancer_id : c.client_id);
  }
  for (const f of (follows.data ?? []) as { following_id: string }[]) add(f.following_id);

  const wanted = ids.slice(0, limit);
  if (!wanted.length) return [];
  const profiles = await getProfilesByIds(wanted);
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return wanted.flatMap((id) => {
    const p = byId.get(id);
    if (!p) return [];
    return [{ id, name: p.display_name || p.username || "SAMECOR", username: p.username, avatar: p.avatar_url }];
  });
}
