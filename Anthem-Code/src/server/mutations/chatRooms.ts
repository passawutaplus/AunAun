/**
 * Chat of the new design (step 12): writes that are not "send a message" (that one reuses `useSendMessage`).
 * `conversation_prefs` comes with the step-12 SQL; before it runs, `setRoomPref` reports `false` and the caller
 * keeps the change on this device only.
 */
import { supabase } from "@/integrations/supabase/client";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";
import { normalizeImageForUpload } from "@/lib/normalizeImageUpload";
import { isBenignQueryError } from "@/lib/supabaseErrors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

export type RoomPrefPatch = { muted?: boolean; accepted_at?: string | null; seen_at?: string | null };

/** Saves my mute / accept / seen for a room. `false` = the table is not there yet (SQL not run). */
export async function setRoomPref(me: string, roomId: string, patch: RoomPrefPatch): Promise<boolean> {
  const { error } = await supabase
    .from("conversation_prefs" as never)
    .upsert({ conversation_id: roomId, user_id: me, ...patch, updated_at: new Date().toISOString() } as never, {
      onConflict: "conversation_id,user_id",
    });
  if (!error) return true;
  if (isBenignQueryError(error)) return false;
  throw error;
}

/** Ignore / Report / Block take the room off my list (it comes back if the other person writes again). */
export async function hideRoom(me: string, roomId: string): Promise<void> {
  const { error } = await supabase
    .from("conversation_hides")
    .upsert({ user_id: me, conversation_id: roomId, hidden_at: new Date().toISOString() } as never);
  if (error) throw error;
}

/** Greeting someone again brings back a room I hid earlier (Ignore / Report / Block of a request). */
export async function unhideRoom(me: string, roomId: string): Promise<void> {
  const { error } = await supabase.from("conversation_hides").delete().eq("user_id", me).eq("conversation_id", roomId);
  if (error) throw error;
}

export async function markRoomRead(roomId: string): Promise<void> {
  const { error } = await rpc("mark_conversation_read", { p_conversation_id: roomId });
  if (error) throw error;
}

export async function blockPerson(me: string, otherId: string): Promise<void> {
  const { error } = await supabase.from("user_blocks" as never).insert({ blocker_id: me, blocked_id: otherId } as never);
  if (error && String(error.code) !== "23505" && !String(error.message).includes("duplicate")) throw error;
}

/** Reasons a chat report can give (the `create_report` allow-list; same codes as the old ReportDialog). */
export const CHAT_REPORT_REASONS = ["spam", "harassment", "scam", "nsfw", "impersonation", "other"] as const;
export type ChatReportReason = (typeof CHAT_REPORT_REASONS)[number];

/** "Report" in a chat or on a chat request: the person, with the room in the details for the team. */
export async function reportPerson(otherId: string, roomId: string, reason: ChatReportReason = "other"): Promise<void> {
  const { error } = await rpc("create_report", {
    _target_type: "user",
    _target_id: otherId,
    _target_owner_id: otherId,
    _reason: CHAT_REPORT_REASONS.includes(reason) ? reason : "other",
    _details: `รายงานจากแชท (ห้อง ${roomId})`,
  });
  if (error && !String(error.message).startsWith("DUPLICATE:")) throw error;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const HEIC_NAME = /\.(heic|heif)$/i;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

/** Same path and size rules as the old chat: HEIC → JPEG, big photos down to 2560 px webp. Returns the storage path. */
export async function uploadChatImage(roomId: string, file: File): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type) && !HEIC_NAME.test(file.name)) throw new Error("ส่งได้เฉพาะรูป JPG, PNG, WebP หรือ HEIC");
  if (file.size > MAX_INPUT_BYTES) throw new Error("รูปใหญ่เกิน 25 MB");
  let ready = await normalizeImageForUpload(file);
  if (ready.size > 1.5 * 1024 * 1024) {
    const { default: imageCompression } = await import("browser-image-compression");
    ready = await imageCompression(ready, { maxSizeMB: 2, maxWidthOrHeight: 2560, useWebWorker: true, fileType: "image/webp", initialQuality: 0.88 });
  }
  const ext = ready.type === "image/png" ? "png" : ready.type === "image/webp" ? "webp" : "jpg";
  const path = `anthem/chat/${roomId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sharedStorage.storage
    .from(SHARED_MEDIA_BUCKET)
    .upload(path, ready, { upsert: false, contentType: ready.type || "image/jpeg" });
  if (error) throw error;
  return path;
}
