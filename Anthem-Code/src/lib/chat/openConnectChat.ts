import { supabase } from "@/integrations/supabase/client";
import { isBlockedFromOpportunity } from "@/hooks/useCommunityPostInteractions";

/**
 * "Just connect": open (or reuse) a plain chat with another creator — no hire / collab request needed.
 * Reuses an existing connect chat between the two people in either direction.
 */
export async function openConnectChat(
  senderId: string,
  otherId: string,
  note: string,
  /** Chat started from a work: sent right after the text as a work card (message_type "project"). */
  project?: { id: string; title: string },
): Promise<string> {
  if (senderId === otherId) throw new Error("ทักแชทตัวเองไม่ได้");
  if (await isBlockedFromOpportunity(senderId, otherId).catch(() => false)) {
    throw new Error("ส่งข้อความหาผู้ใช้นี้ไม่ได้");
  }

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("kind", "connect")
    .or(
      `and(client_id.eq.${senderId},freelancer_id.eq.${otherId}),and(client_id.eq.${otherId},freelancer_id.eq.${senderId})`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        kind: "connect",
        conversation_type: "direct",
        client_id: senderId,
        freelancer_id: otherId,
        project_title: "ทักทาย",
        created_by: senderId,
      } as never)
      .select("id")
      .single();
    if (error) {
      if (String(error.message).includes("CONNECT_DAILY_LIMIT")) {
        throw new Error("วันนี้ทักแชทใหม่ครบจำนวนแล้ว — ลองใหม่พรุ่งนี้");
      }
      if (String(error.message).includes("CHAT_BLOCKED")) {
        throw new Error("ส่งข้อความหาผู้ใช้นี้ไม่ได้");
      }
      throw error;
    }
    conversationId = data.id as string;
  }

  const text = note.trim();
  if (text) {
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: text,
        message_type: "text",
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    void supabase.functions.invoke("notify-anthem-chat", {
      body: { conversation_id: conversationId, message_id: (inserted as { id: string }).id },
    });
  }
  if (project) {
    // The card is best-effort: the greeting above already went out, so a failure here must not block the chat.
    await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: project.title,
        message_type: "project",
        project_id: project.id,
      } as never);
  }
  return conversationId;
}
