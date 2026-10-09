import { supabase } from "@/integrations/supabase/client";
import { formatObjectChatCard, type ObjectChatCard } from "@/lib/objects/chatCard";

export async function openObjectChat(buyerId: string, sellerId: string, card: ObjectChatCard, note: string): Promise<string> {
  if (buyerId === sellerId) throw new Error("ทักสินค้าของตัวเองไม่ได้");

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("kind", "object")
    .eq("client_id", buyerId)
    .eq("freelancer_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        kind: "object",
        conversation_type: "direct",
        client_id: buyerId,
        freelancer_id: sellerId,
        project_title: card.title,
        created_by: buyerId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    conversationId = data.id as string;
  }

  const cardRow = {
    conversation_id: conversationId,
    sender_id: buyerId,
    content: formatObjectChatCard(card),
    message_type: "object",
  };
  let { error: cardError } = await supabase.from("messages").insert(cardRow as never);
  if (cardError && String(cardError.message).includes("message_type")) {
    ({ error: cardError } = await supabase.from("messages").insert({
      ...cardRow,
      message_type: "text",
    } as never));
  }
  if (cardError) throw cardError;

  const text = note.trim();
  if (text) {
    const { error: noteError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: buyerId,
      content: text,
      message_type: "text",
    } as never);
    if (noteError) throw noteError;
  }

  return conversationId;
}
