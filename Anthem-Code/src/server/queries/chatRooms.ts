/**
 * Chat of the new design (step 12): pure async reads. Hooks live in src/redesign/chat.
 * Only 1:1 chats show (connect + the old hire / collab rooms as plain chats); group rooms stay out (6 rooms, unused).
 * `conversation_prefs`, `chat_room_meta` and `chat_unread_rooms` come with the step-12 SQL: until the owner runs it,
 * every read here falls back to what the old tables can tell (no mute, no accepted requests).
 */
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { isBenignQueryError } from "@/lib/supabaseErrors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

const ROOM_LIMIT = 100;
const MESSAGE_LIMIT = 150;

export type RoomRow = {
  id: string;
  kind: string | null;
  request_id?: string | null;
  client_id: string | null;
  freelancer_id: string | null;
  created_by: string | null;
  last_message_at: string | null;
  created_at: string;
};

export type RoomMeta = {
  muted: boolean;
  acceptedAt: string | null;
  seenAt: string | null;
  /** I wrote in this room at least once (a reply counts as accepting a request). */
  iSent: boolean;
  /** Messages from the other side not read yet (and newer than `seenAt`). */
  unread: number;
};

export type LastMessageRow = {
  conversation_id: string;
  content: string | null;
  attachment_url: string | null;
  sender_id: string;
  created_at: string;
  message_type: string | null;
  deleted_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  message_type: string | null;
  project_id: string | null;
  created_at: string;
  deleted_at: string | null;
  read_at: string | null;
};

export type ChatPersonRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  sc_categories: string[] | null;
};

export const otherOf = (room: Pick<RoomRow, "client_id" | "freelancer_id">, me: string) =>
  room.client_id === me ? room.freelancer_id : room.client_id;

/** My 1:1 rooms, newest first, without the ones I hid (Ignore / Report / Block hide a room). */
export async function getMyRooms(me: string): Promise<RoomRow[]> {
  const [rooms, hides] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, kind, request_id, client_id, freelancer_id, created_by, last_message_at, created_at, conversation_type")
      .or(`client_id.eq.${me},freelancer_id.eq.${me}`)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(ROOM_LIMIT),
    supabase.from("conversation_hides").select("conversation_id").eq("user_id", me),
  ]);
  if (rooms.error) throw rooms.error;
  const hidden = new Set(((hides.data ?? []) as Array<{ conversation_id: string }>).map((h) => h.conversation_id));
  return ((rooms.data ?? []) as Array<RoomRow & { conversation_type: string | null }>)
    .filter((r) => (r.conversation_type ?? "direct") === "direct" && r.kind !== "group" && r.kind !== "studio")
    .filter((r) => !hidden.has(r.id) && !!otherOf(r, me));
}

/** An old hire room whose request was declined with "lock the chat" refuses new messages (HIRE_CHAT_LOCKED). */
export async function isHireRoomLocked(requestId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("hiring_requests")
    .select("id")
    .eq("id", requestId)
    .eq("post_reject_chat", "locked")
    .maybeSingle();
  if (error) return true;
  return !!data;
}

/** Mute / accepted / seen / unread per room (one RPC); before the step-12 SQL: unread + "I wrote here" from messages. */
export async function getRoomMeta(me: string, ids: string[]): Promise<Record<string, RoomMeta>> {
  const out: Record<string, RoomMeta> = {};
  if (!ids.length) return out;
  const { data, error } = await rpc("chat_room_meta", { conv_ids: ids });
  if (!error) {
    for (const r of (data ?? []) as Array<{ conversation_id: string; muted: boolean | null; accepted_at: string | null; seen_at: string | null; i_sent: boolean | null; unread: number | null }>) {
      out[r.conversation_id] = { muted: !!r.muted, acceptedAt: r.accepted_at, seenAt: r.seen_at, iSent: !!r.i_sent, unread: r.unread ?? 0 };
    }
    return out;
  }
  if (!isBenignQueryError(error)) throw error;
  const [unread, mine] = await Promise.all([
    supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", ids)
      .neq("sender_id", me)
      .is("read_at", null)
      .is("deleted_at", null)
      .neq("message_type", "system")
      .limit(2000),
    supabase.from("messages").select("conversation_id").in("conversation_id", ids).eq("sender_id", me).limit(2000),
  ]);
  if (unread.error) throw unread.error;
  if (mine.error) throw mine.error;
  for (const id of ids) out[id] = { muted: false, acceptedAt: null, seenAt: null, iSent: false, unread: 0 };
  for (const r of (unread.data ?? []) as Array<{ conversation_id: string }>) out[r.conversation_id].unread++;
  for (const r of (mine.data ?? []) as Array<{ conversation_id: string }>) out[r.conversation_id].iSent = true;
  return out;
}

export async function getLastMessages(ids: string[]): Promise<Record<string, LastMessageRow>> {
  if (!ids.length) return {};
  const { data, error } = await rpc("chat_last_messages", { conv_ids: ids });
  if (error) throw error;
  const out: Record<string, LastMessageRow> = {};
  for (const r of (data ?? []) as LastMessageRow[]) out[r.conversation_id] = r;
  return out;
}

export async function getChatPeople(ids: string[]): Promise<Record<string, ChatPersonRow>> {
  if (!ids.length) return {};
  const { data, error } = await profilesPublicFrom()
    .select("user_id, username, display_name, avatar_url, sc_categories" as "*")
    .in("user_id", ids);
  if (error) throw error;
  const out: Record<string, ChatPersonRow> = {};
  for (const p of (data ?? []) as unknown as ChatPersonRow[]) out[p.user_id] = p;
  return out;
}

/** Red number on the chat buttons: rooms with something unread that are not muted (old count before the SQL). */
export async function getUnreadRooms(): Promise<number> {
  const { data, error } = await rpc("chat_unread_rooms");
  if (!error) return Number(data ?? 0);
  if (!isBenignQueryError(error)) throw error;
  const old = await rpc("chat_unread_count");
  if (old.error) throw old.error;
  return Number(old.data ?? 0);
}

export async function getRoom(id: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, kind, client_id, freelancer_id, created_by, last_message_at, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as RoomRow | null) ?? null;
}

/** Newest 150 messages of a room, oldest first. */
export async function getRoomMessages(id: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, attachment_url, message_type, project_id, created_at, deleted_at, read_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_LIMIT);
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).reverse();
}

let channelSeq = 0;

/** Realtime for a room list: any new message or room change I can see. Each caller gets its own channel. */
export function subscribeRooms(uid: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`sc-chat-rooms-${uid}-${++channelSeq}`)
    .on("postgres_changes", { event: "INSERT", schema: "shared", table: "messages" }, onChange)
    .on("postgres_changes", { event: "*", schema: "shared", table: "conversations" }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(ch);
}

/** Realtime for one open room (new, unsent or read messages). */
export function subscribeRoom(roomId: string, onChange: () => void): () => void {
  const ch = supabase
    .channel(`sc-chat-msgs-${roomId}-${++channelSeq}`)
    .on("postgres_changes", { event: "*", schema: "shared", table: "messages", filter: `conversation_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => void supabase.removeChannel(ch);
}
