/**
 * Collab between two creators in the new chat (owner 2026-11-28: collab tools are back, hiring is not).
 * The invite is a row in `anthem.collab_requests`; its chat is a `conversations` row with kind "collab" and
 * request_id → that row (old site, same tables). The plan lives in `collab_plans` (hooks/useCollabAgreement).
 */
import { supabase } from "@/integrations/supabase/client";

export type CollabStatus = "pending" | "interested" | "passed" | "archived" | "accepted" | "declined" | "cancelled" | "completed";

export type CollabRequestRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: CollabStatus;
  collab_types: string[] | null;
  other_type_note: string | null;
  message: string | null;
  project_id: string | null;
  reject_reason: string | null;
  created_at: string;
};

/** One collab invite (both people can read it), or null. */
export async function getCollabRequest(id: string): Promise<CollabRequestRow | null> {
  const { data, error } = await supabase
    .from("collab_requests")
    .select("id, sender_id, recipient_id, status, collab_types, other_type_note, message, project_id, reject_reason, created_at" as "*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as CollabRequestRow | null;
}
