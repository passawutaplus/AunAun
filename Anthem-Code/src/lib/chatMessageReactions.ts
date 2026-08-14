import { supabase } from "@/integrations/supabase/client";

export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

export type ReactionTally = {
  emoji: string;
  count: number;
  mine: boolean;
};

const localKey = (messageId: string) => `aplus1:msg-reactions:${messageId}`;

type LocalMap = Record<string, string[]>;

function readLocal(messageId: string, userId: string): ReactionTally[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(localKey(messageId)) ?? "{}") as LocalMap;
    const byEmoji = new Map<string, { count: number; mine: boolean }>();
    for (const [uid, emojis] of Object.entries(parsed)) {
      for (const emoji of emojis) {
        const cur = byEmoji.get(emoji) ?? { count: 0, mine: false };
        cur.count += 1;
        if (uid === userId) cur.mine = true;
        byEmoji.set(emoji, cur);
      }
    }
    return Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, ...v }));
  } catch {
    return [];
  }
}

function writeLocal(messageId: string, userId: string, emoji: string, on: boolean): void {
  if (typeof window === "undefined") return;
  let parsed: LocalMap = {};
  try {
    parsed = JSON.parse(window.localStorage.getItem(localKey(messageId)) ?? "{}") as LocalMap;
  } catch {
    parsed = {};
  }
  const mine = new Set(parsed[userId] ?? []);
  if (on) mine.add(emoji);
  else mine.delete(emoji);
  if (mine.size) parsed[userId] = Array.from(mine);
  else delete parsed[userId];
  window.localStorage.setItem(localKey(messageId), JSON.stringify(parsed));
}

export async function fetchMessageReactions(
  messageId: string,
  userId: string,
): Promise<ReactionTally[]> {
  const { data, error } = await supabase
    .from("message_reactions" as never)
    .select("emoji, user_id")
    .eq("message_id", messageId);
  if (error) return readLocal(messageId, userId);
  const rows = (data ?? []) as { emoji: string; user_id: string }[];
  const byEmoji = new Map<string, { count: number; mine: boolean }>();
  for (const row of rows) {
    const cur = byEmoji.get(row.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (row.user_id === userId) cur.mine = true;
    byEmoji.set(row.emoji, cur);
  }
  return Array.from(byEmoji.entries()).map(([emoji, v]) => ({ emoji, ...v }));
}

export async function toggleMessageReaction(input: {
  messageId: string;
  userId: string;
  emoji: string;
  currentlyMine: boolean;
}): Promise<void> {
  const nextOn = !input.currentlyMine;
  writeLocal(input.messageId, input.userId, input.emoji, nextOn);
  if (nextOn) {
    const { error } = await supabase.from("message_reactions" as never).insert({
      message_id: input.messageId,
      user_id: input.userId,
      emoji: input.emoji,
    } as never);
    if (error && !String(error.message ?? "").toLowerCase().includes("duplicate")) {
      /* local fallback already written */
    }
    return;
  }
  await supabase
    .from("message_reactions" as never)
    .delete()
    .eq("message_id", input.messageId)
    .eq("user_id", input.userId)
    .eq("emoji", input.emoji);
}
