/**
 * Collab writes of the new chat: invite a creator, answer an invite, take one back. Same tables and steps as the
 * old chat (CollabDialog, ChatCollabActions), collab only — nothing here touches hire requests, quotes or money.
 */
import { supabase } from "@/integrations/supabase/client";
import { sharedDb } from "@/integrations/supabase/db";
import { openHireCollabChat } from "@/hooks/useChat";
import { DEFAULT_COLLAB_MESSAGE } from "@/lib/chatContext";
import { buildCollabDeclineChatMessage, collabRejectReasonLabel } from "@/lib/collabBrief";
import { COLLAB_WELCOME_PREFIX } from "@/lib/collabAgreement";
import { emptyCollabPlanState, emptyPlanPayload } from "@/lib/collabPlanDoc";

export type CollabInvite = {
  me: string;
  other: string;
  /** One of the old collab types (joint-project, skill-swap, …). */
  type: string;
  otherNote?: string | null;
  message: string;
  /** A work of mine it is about (optional). */
  work?: { id: string; title: string } | null;
  links?: string[];
};

/**
 * Invite → the collab_requests row, the team's e-mail (best effort), then its own chat with the invite card in it
 * (old openHireCollabChat, collab branch). Returns the room id.
 */
export async function inviteCollab(i: CollabInvite): Promise<string> {
  const { data, error } = await supabase
    .from("collab_requests")
    .insert({
      sender_id: i.me,
      recipient_id: i.other,
      project_id: i.work?.id ?? null,
      collab_types: [i.type],
      other_type_note: i.type === "other" ? i.otherNote?.trim().slice(0, 200) || null : null,
      message: i.message.trim().slice(0, 2000) || DEFAULT_COLLAB_MESSAGE,
      attached_project_ids: i.work ? [i.work.id] : [],
      external_drive_url: (i.links ?? []).map((u) => u.trim()).filter(Boolean).join("\n") || null,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  const requestId = (data as { id: string }).id;
  void supabase.functions.invoke("notify-anthem-collab", { body: { request_id: requestId } }).catch(() => undefined);
  return openHireCollabChat({
    kind: "collab",
    requestId,
    clientId: i.me,
    freelancerId: i.other,
    projectId: i.work?.id ?? null,
    projectTitle: i.work?.title ?? "คอลแลปไอเดียใหม่",
  });
}

/**
 * Invitee says yes: the invite is accepted and an empty plan is ready (old accept). Returns the welcome line, which
 * the caller sends like any message (so the other person is notified).
 */
export async function acceptCollab(requestId: string, roomId: string): Promise<string> {
  const { error } = await supabase.from("collab_requests").update({ status: "accepted" } as never).eq("id", requestId);
  if (error) throw error;
  await sharedDb
    .from("collab_plans" as never)
    .upsert(
      {
        conversation_id: roomId,
        status: "draft",
        current_step: "align",
        payload: emptyPlanPayload(),
        acks: {},
        version: 1,
        stages: emptyCollabPlanState().stages,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "conversation_id", ignoreDuplicates: true },
    )
    .then(
      () => undefined,
      () => undefined,
    );
  return COLLAB_WELCOME_PREFIX;
}

/** Invitee says no; returns the polite note for the chat. The chat itself stays open to talk. */
export async function declineCollab(requestId: string, reason: string, note?: string): Promise<string> {
  const { error } = await supabase
    .from("collab_requests")
    .update({ status: "declined", reject_reason: reason, reject_note: note?.trim() || null, keep_chat: true } as never)
    .eq("id", requestId);
  if (error) throw error;
  return buildCollabDeclineChatMessage({ reasonLabel: collabRejectReasonLabel(reason), keepChat: true });
}

/** The one who invited takes it back before an answer; returns the line for the chat. */
export async function withdrawCollab(requestId: string): Promise<string> {
  const { error } = await supabase.from("collab_requests").update({ status: "cancelled", cancel_reason: "withdrawn", cancel_note: null } as never).eq("id", requestId);
  if (error) throw error;
  return "ขอยกเลิกคำชวนคอลแลปนี้ก่อนนะ";
}
