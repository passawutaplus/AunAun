/**
 * Send a work into a friend's chat from the share panel: reuses (or opens) the plain chat between the two people,
 * then posts the optional note and the work card (message_type "project", like the chat's own "send a work").
 */
import { supabase } from "@/integrations/supabase/client";
import { openConnectChat } from "@/lib/chat/openConnectChat";

function chatError(e: unknown): Error {
  const msg = String((e as { message?: string } | null)?.message ?? e);
  if (msg.includes("CHAT_BLOCKED")) return new Error("ส่งหาคนนี้ไม่ได้");
  if (msg.includes("HIRE_CHAT_LOCKED")) return new Error("แชทนี้ปิดแล้ว");
  return e instanceof Error ? e : new Error(msg);
}

export async function sendWorkToChat(senderId: string, toId: string, work: { id: string; title: string }, note: string): Promise<void> {
  // No note and no card here: only finds or opens the chat (its own errors are already in Thai).
  const conversationId = await openConnectChat(senderId, toId, "");
  const rows: Record<string, unknown>[] = [];
  const text = note.trim();
  if (text) rows.push({ conversation_id: conversationId, sender_id: senderId, content: text, message_type: "text" });
  rows.push({ conversation_id: conversationId, sender_id: senderId, content: work.title || "ผลงาน", message_type: "project", project_id: work.id });

  let lastId: string | null = null;
  for (const row of rows) {
    const { data, error } = await supabase.from("messages").insert(row as never).select("id").maybeSingle();
    if (error) throw chatError(error);
    lastId = (data as { id: string } | null)?.id ?? lastId;
  }
  void supabase.functions.invoke("notify-anthem-chat", {
    body: { conversation_id: conversationId, ...(lastId ? { message_id: lastId } : {}) },
  });
}
