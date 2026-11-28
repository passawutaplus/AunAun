/**
 * The one chat store of the new design (mock: `ChatStore`, copied in both ChatDock and Chat — here a single module).
 * The Chat page, the big chat popup and ChatDock all read rooms and messages through these hooks, so a change in one
 * shows in the others (same React Query keys + realtime).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSendMessage } from "@/hooks/useChat";
import { useFollowedUserIds } from "@/hooks/useFollow";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { proxiedImageUrl } from "@/lib/imageProxy";
import {
  getChatPeople,
  getLastMessages,
  getMyRooms,
  getRoomMessages,
  getRoomMeta,
  getUnreadRooms,
  otherOf,
  subscribeRoom,
  subscribeRooms,
  type ChatPersonRow,
  type MessageRow,
  type RoomMeta,
} from "@/server/queries/chatRooms";
import { getProfileWorks, getWorksByIds, type ProfileWorkRow } from "@/server/queries/profilePage";
import { blockPerson, hideRoom, markRoomRead, reportPerson, setRoomPref, unhideRoom, uploadChatImage, type RoomPrefPatch } from "@/server/mutations/chatRooms";
import { profileHref } from "../main/useCreators";
import { msgKind, msgLabel, type MsgKind } from "./chatFormat";

export const chatKeys = {
  rooms: (uid?: string) => ["sc-chat-rooms", uid] as const,
  unread: (uid?: string) => ["sc-chat-unread", uid] as const,
  msgs: (uid?: string, roomId?: string | null) => ["sc-chat-msgs", uid, roomId] as const,
};

export type ChatPerson = {
  id: string;
  /** Handle first, like the mock (tum.3d); the display name when there is no handle. */
  name: string;
  avatar: string;
  avatarBig: string;
  /** First CATEGORY of the person (mock: "3D", "Photography"). */
  field: string;
  href: string;
};

export type ChatRoom = {
  id: string;
  other: ChatPerson;
  lastAt: string | null;
  last: string;
  lastMine: boolean;
  unread: number;
  muted: boolean;
  /** Someone I do not follow opened this chat and I have not accepted or replied yet (mock "Requests"). */
  request: boolean;
};

export type ChatWork = { id: string; title: string; cover: string };

export type ChatMsg = {
  id: string;
  me: boolean;
  at: string;
  kind: MsgKind;
  text: string;
  /** Storage path of a picture. */
  path: string | null;
  work: ChatWork | null;
  pending: boolean;
};

/* ───────────── prefs kept on this device until the step-12 SQL is run ───────────── */

type LocalPref = { muted?: boolean; accepted_at?: string | null; seen_at?: string | null };
const localKey = (uid: string) => `sc-chat-prefs:${uid}`;
const readLocal = (uid: string): Record<string, LocalPref> => {
  try {
    return JSON.parse(localStorage.getItem(localKey(uid)) || "{}") as Record<string, LocalPref>;
  } catch {
    return {};
  }
};
const writeLocal = (uid: string, roomId: string, patch: LocalPref | null) => {
  try {
    const all = readLocal(uid);
    if (patch) all[roomId] = { ...all[roomId], ...patch };
    else delete all[roomId];
    localStorage.setItem(localKey(uid), JSON.stringify(all));
  } catch {
    /* private mode: the change lasts until reload */
  }
};

const person = (id: string, p: ChatPersonRow | undefined): ChatPerson => {
  const name = p?.username || p?.display_name?.trim() || "ผู้ใช้ Samecor";
  return {
    id,
    name,
    avatar: proxiedImageUrl(p?.avatar_url, 104),
    avatarBig: proxiedImageUrl(p?.avatar_url, 192),
    field: p?.sc_categories?.[0] ?? "",
    href: profileHref({ user_id: id, username: p?.username ?? null }),
  };
};

/* ───────────── rooms ───────────── */

export function useChatRooms(enabled = true) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { data: follows } = useFollowedUserIds(enabled ? uid : undefined);

  const query = useQuery({
    queryKey: chatKeys.rooms(uid),
    enabled: enabled && !!uid,
    staleTime: 15_000,
    queryFn: async () => {
      const rows = await getMyRooms(uid!);
      const ids = rows.map((r) => r.id);
      const others = [...new Set(rows.map((r) => otherOf(r, uid!)).filter((x): x is string => !!x))];
      const [meta, last, people] = await Promise.all([getRoomMeta(uid!, ids), getLastMessages(ids), getChatPeople(others)]);
      return { rows, meta, last, people };
    },
  });

  useEffect(() => {
    if (!enabled || !uid) return;
    // Each mounted list has its own channel, so ChatDock and the big chat on screen together never share one.
    return subscribeRooms(uid, () => {
      void qc.invalidateQueries({ queryKey: chatKeys.rooms(uid) });
      void qc.invalidateQueries({ queryKey: chatKeys.unread(uid) });
    });
  }, [enabled, uid, qc]);

  const [localTick, setLocalTick] = useState(0);
  useEffect(() => {
    const on = () => setLocalTick((n) => n + 1);
    window.addEventListener("sc-chat-prefs", on);
    return () => window.removeEventListener("sc-chat-prefs", on);
  }, []);

  const rooms = useMemo((): ChatRoom[] => {
    const d = query.data;
    if (!d || !uid) return [];
    void localTick;
    const local = readLocal(uid);
    const now = new Date();
    return d.rows.map((r) => {
      const otherId = otherOf(r, uid)!;
      const m: RoomMeta = { ...(d.meta[r.id] ?? { muted: false, acceptedAt: null, seenAt: null, iSent: false, unread: 0 }) };
      const lp = local[r.id];
      if (lp?.muted !== undefined) m.muted = lp.muted;
      if (lp?.accepted_at) m.acceptedAt = lp.accepted_at;
      if (lp?.seen_at && (!m.seenAt || lp.seen_at > m.seenAt)) m.seenAt = lp.seen_at;
      const last = d.last[r.id];
      const lastAt = last?.created_at ?? r.last_message_at;
      const request = r.kind === "connect" && r.created_by !== uid && !follows?.has(otherId) && !m.iSent && !m.acceptedAt;
      const seenAll = !!m.seenAt && !!lastAt && m.seenAt >= lastAt;
      return {
        id: r.id,
        other: person(otherId, d.people[otherId]),
        lastAt,
        last: last ? msgLabel(last, now) : "",
        lastMine: !!last && last.sender_id === uid,
        unread: seenAll ? 0 : m.unread,
        muted: m.muted,
        request,
      };
    });
  }, [query.data, uid, follows, localTick]);

  return { rooms, loading: query.isLoading, error: query.error, refetch: query.refetch };
}

/** Red number on the chat buttons (header, tab bar, ChatDock): unread rooms that are not muted. */
export function useUnreadRooms() {
  const { user } = useAuth();
  const { data = 0 } = useQuery({
    queryKey: chatKeys.unread(user?.id),
    enabled: !!user?.id,
    queryFn: getUnreadRooms,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data;
}

/* ───────────── messages ───────────── */

type PendingRow = MessageRow & { pending?: boolean };

export function useRoomMessages(roomId: string | null) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const key = chatKeys.msgs(uid, roomId);
  const query = useQuery({
    queryKey: key,
    enabled: !!uid && !!roomId,
    staleTime: 0,
    queryFn: () => getRoomMessages(roomId!) as Promise<PendingRow[]>,
  });

  useEffect(() => {
    if (!uid || !roomId) return;
    return subscribeRoom(roomId, () => void qc.invalidateQueries({ queryKey: chatKeys.msgs(uid, roomId) }));
  }, [uid, roomId, qc]);

  const workIds = useMemo(
    () => [...new Set((query.data ?? []).filter((m) => m.message_type === "project" && m.project_id).map((m) => m.project_id!))].sort(),
    [query.data],
  );
  const { data: works } = useQuery({
    queryKey: ["sc-chat-works", workIds],
    enabled: workIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => getWorksByIds(workIds),
  });

  const items = useMemo((): ChatMsg[] => {
    const now = new Date();
    const byId = new Map((works ?? []).map((w) => [w.id, w]));
    const out: ChatMsg[] = [];
    for (const m of query.data ?? []) {
      const kind = msgKind(m, now);
      if (!kind) continue;
      const w = kind === "work" ? byId.get(m.project_id!) : undefined;
      out.push({
        id: m.id,
        me: m.sender_id === uid,
        at: m.created_at,
        kind,
        text: kind === "work" ? w?.title?.trim() || m.content?.trim() || "ผลงาน" : msgLabel(m, now),
        path: kind === "img" ? m.attachment_url : null,
        work: kind === "work" ? { id: m.project_id!, title: w?.title?.trim() || m.content?.trim() || "ผลงาน", cover: workCover(w) } : null,
        pending: !!m.pending,
      });
    }
    return out;
  }, [query.data, works, uid]);

  return { items, loading: query.isLoading, error: query.error };
}

export const workCover = (w: Pick<ProfileWorkRow, "cover_url" | "gallery_urls"> | undefined, width = 520) =>
  proxiedImageUrl(w?.cover_url || w?.gallery_urls?.[0] || "", width);

/** Published works of a person: "Works" in the chat info (theirs) and "Share your work" (mine). */
export function usePersonWorks(personId: string | null | undefined) {
  return useQuery({
    queryKey: ["sc-chat-person-works", personId],
    enabled: !!personId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ChatWork[]> =>
      (await getProfileWorks(personId!)).map((w) => ({ id: w.id, title: w.title?.trim() || "ผลงาน", cover: workCover(w, 240) })),
  });
}

/* ───────────── actions ───────────── */

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export function useChatActions() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const send = useSendMessage();

  const refresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: chatKeys.rooms(uid) });
    void qc.invalidateQueries({ queryKey: chatKeys.unread(uid) });
  }, [qc, uid]);

  /** Shows the message at once with a clock (mock ChatDock), then the stored one replaces it. */
  const post = useCallback(
    async (roomId: string, row: Partial<MessageRow> & { message_type: string }, run: () => Promise<unknown>) => {
      const key = chatKeys.msgs(uid, roomId);
      const tmp: PendingRow = {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversation_id: roomId,
        sender_id: uid!,
        content: row.content ?? "",
        attachment_url: row.attachment_url ?? null,
        message_type: row.message_type,
        project_id: row.project_id ?? null,
        created_at: new Date().toISOString(),
        deleted_at: null,
        read_at: null,
        pending: true,
      };
      qc.setQueryData<PendingRow[]>(key, (old) => [...(old ?? []), tmp]);
      try {
        await run();
      } catch (e) {
        qc.setQueryData<PendingRow[]>(key, (old) => (old ?? []).filter((m) => m.id !== tmp.id));
        throw new Error(errText(e, "ส่งไม่สำเร็จ ลองอีกครั้ง"));
      } finally {
        void qc.invalidateQueries({ queryKey: key });
        refresh();
      }
    },
    [qc, uid, refresh],
  );

  const setPref = useCallback(
    async (roomId: string, patch: RoomPrefPatch) => {
      if (!uid) return;
      // Shows at once; once the server has it and the list is re-read, the device copy goes (before the SQL it stays).
      writeLocal(uid, roomId, patch);
      window.dispatchEvent(new Event("sc-chat-prefs"));
      const stored = await setRoomPref(uid, roomId, patch).catch(() => false);
      void qc.invalidateQueries({ queryKey: chatKeys.unread(uid) });
      if (!stored) return;
      await qc.invalidateQueries({ queryKey: chatKeys.rooms(uid) });
      writeLocal(uid, roomId, null);
      window.dispatchEvent(new Event("sc-chat-prefs"));
    },
    [uid, qc],
  );

  return {
    sendText: (roomId: string, text: string) =>
      post(roomId, { message_type: "text", content: text }, () => send.mutateAsync({ conversationId: roomId, content: text })),
    sendWork: (roomId: string, work: ChatWork) =>
      post(roomId, { message_type: "project", content: work.title, project_id: work.id }, () =>
        send.mutateAsync({ conversationId: roomId, content: work.title, messageType: "project", projectId: work.id }),
      ),
    sendImage: async (roomId: string, file: File) => {
      const path = await uploadChatImage(roomId, file);
      return post(roomId, { message_type: "image", attachment_url: path }, () =>
        send.mutateAsync({ conversationId: roomId, content: "", attachmentUrl: path, messageType: "image" }),
      );
    },
    /** Opening a room: read it; a request is only marked seen, so the sender does not learn it was read. */
    openRoom: async (room: Pick<ChatRoom, "id" | "request" | "unread">) => {
      if (room.request) {
        await setPref(room.id, { seen_at: new Date().toISOString() });
        return;
      }
      if (room.unread) {
        await markRoomRead(room.id).catch(() => undefined);
        refresh();
      }
    },
    accept: async (roomId: string) => {
      await setPref(roomId, { accepted_at: new Date().toISOString() });
      await markRoomRead(roomId).catch(() => undefined);
      refresh();
    },
    setMuted: (roomId: string, muted: boolean) => setPref(roomId, { muted }),
    ignore: async (roomId: string) => {
      await hideRoom(uid!, roomId);
      refresh();
    },
    report: async (room: Pick<ChatRoom, "id" | "other">) => {
      await reportPerson(room.other.id, room.id);
      await hideRoom(uid!, room.id);
      refresh();
    },
    block: async (room: Pick<ChatRoom, "id" | "other">) => {
      await blockPerson(uid!, room.other.id);
      await hideRoom(uid!, room.id);
      void qc.invalidateQueries({ queryKey: ["blocked-user-ids", uid] });
      refresh();
    },
  };
}

/** "ทักทาย" from a work / profile / creator card: the existing 1:1 chat with that person, or a new one. */
export function useOpenChatWith() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useCallback(
    async (otherId: string): Promise<string> => {
      if (!user) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const id = await openConnectChat(user.id, otherId, "").catch((e: unknown) => {
        const msg = String((e as { message?: string } | null)?.message ?? e);
        if (msg.includes("GREET_FOLLOWING_ONLY") || (e as { hint?: string } | null)?.hint === "GREET_FOLLOWING_ONLY") {
          throw new Error("คนนี้รับแชทเฉพาะคนที่เขาติดตาม");
        }
        throw e;
      });
      await unhideRoom(user.id, id).catch(() => undefined);
      await qc.invalidateQueries({ queryKey: chatKeys.rooms(user.id) });
      return id;
    },
    [user, qc],
  );
}
