import { supabase } from "@/integrations/supabase/client";

/**
 * System lines in chat are written by the server (public.post_chat_system_event): the client names
 * the event and the row it refers to, the server checks it and builds the text. Members cannot
 * insert `message_type = 'system'` rows themselves.
 */
export type ChatSystemEvent =
  | "chat_opened"
  | "hire_paid"
  | "hire_receipt"
  | "hire_work_start"
  | "hire_cancel_withdrawn"
  | "hire_cancel_edited"
  | "collab_end_withdrawn"
  | "collab_end_edited"
  | "collab_end_left"
  | "collab_group_expand_withdrawn"
  | "collab_task_assigned"
  | "collab_plan_edited"
  | "collab_plan_edited_reconfirm"
  | "collab_plan_agreed"
  | "collab_plan_unagreed"
  | "collab_close_requested"
  | "collab_closed";

export type ChatSystemEventArgs = {
  conversationId: string;
  event: ChatSystemEvent;
  /** Row the event is about (hire order, cancel/end request, task …). */
  refId?: string | null;
  /** Collab plan edits only: changed agreement field keys (e.g. "what", "roles"). */
  fields?: string[];
};

/** Returns the new (or existing, for de-duplicated cards) message id; null when nothing was posted. */
export async function postChatSystemEvent({
  conversationId,
  event,
  refId,
  fields,
}: ChatSystemEventArgs): Promise<string | null> {
  const { data, error } = await supabase.rpc("post_chat_system_event" as never, {
    p_conversation_id: conversationId,
    p_event: event,
    p_ref_id: refId ?? null,
    p_fields: fields?.length ? fields : null,
  } as never);
  if (error) {
    if (String(error.message).includes("CHAT_BLOCKED")) {
      throw new Error("ส่งข้อความหาผู้ใช้นี้ไม่ได้");
    }
    if (String(error.message).includes("HIRE_CHAT_LOCKED")) {
      throw new Error("แชทนี้ปิดแล้ว — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้");
    }
    throw error;
  }
  return (data as string | null) ?? null;
}
