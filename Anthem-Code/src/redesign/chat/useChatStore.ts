/**
 * The one chat store of the new design (mock: `ChatStore`, copied in both ChatDock and Chat — here a single module).
 * The Chat page, the big chat popup and ChatDock all read rooms and messages through these hooks, so a change in one
 * shows in the others (same React Query keys + realtime).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { BLOCKED_USER_IDS_KEY, useBlockedUserIds } from "@/hooks/useBlockedUserIds";
import { useSendMessage } from "@/hooks/useChat";
import { useFollowedUserIds } from "@/hooks/useFollow";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { formatEventDates } from "@/lib/exhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";
import {
  getChatEvents,
  getChatPeople,
  getHireRoomLocked,
  getLastMessages,
  getMessagesByIds,
  getMyBlockedIds,
  getMyRooms,
  getRoom,
  getRoomMessages,
  getRoomMeta,
  getUnreadRooms,
  isHireRoomLocked,
  otherOf,
  subscribeRoom,
  subscribeRooms,
  type ChatPersonRow,
  type LastMessageRow,
  type MessageRow,
  type RoomMeta,
  type RoomRow,
} from "@/server/queries/chatRooms";
import { getProfileWorks, getWorksByIds, type ProfileWorkRow } from "@/server/queries/profilePage";
import {
  blockPerson,
  hideRoom,
  markRoomRead,
  reportPerson,
  setRoomPref,
  unhideRoom,
  UNSEND_HOURS,
  unsendMessage,
  uploadChatImage,
  type ChatReportReason,
  type RoomPrefPatch,
} from "@/server/mutations/chatRooms";
import { profileHref } from "../main/useCreators";
import { docOf, eventOf, msgKind, msgLabel, objectOf, quoteText, textOf, type DocCard, type MsgKind, type ObjectCard } from "./chatFormat";

export const chatKeys = {
  rooms: (uid?: string) => ["sc-chat-rooms", uid] as const,
  /** A room opened by link that is not in the newest 100 (under `rooms`, so the same refreshes reach it). */
  room: (uid?: string, roomId?: string | null) => ["sc-chat-rooms", uid, "one", roomId] as const,
  unread: (uid?: string) => ["sc-chat-unread", uid] as const,
  msgs: (uid?: string, roomId?: string | null) => ["sc-chat-msgs", uid, roomId] as const,
  lock: ["sc-chat-lock"] as const,
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
  /** Room kind (connect, or an old hire / collab room shown as a plain chat) and its hire request. */
  kind: string | null;
  requestId: string | null;
};

export type ChatWork = { id: string; title: string; cover: string };

export type ChatEvent = { id: string; title: string; cover: string; when: string };

export type ChatMsg = {
  id: string;
  me: boolean;
  at: string;
  kind: MsgKind;
  /** Bubble text (a text that links to an event: without the link line; it can be empty then). */
  text: string;
  /** Storage path of a picture. */
  path: string | null;
  work: ChatWork | null;
  /** Shared profile (kind "profile"). */
  profile: ChatPerson | null;
  /** Event card under a text that links to an event page. */
  event: ChatEvent | null;
  doc: DocCard | null;
  object: ObjectCard | null;
  /** Picture still uploading: a preview from this device (null when the browser cannot show it, e.g. HEIC). */
  localUrl: string | null;
  /** The message this one answers: shown as a quote on top of the bubble (tap → that message). */
  replyTo: { id: string; mine: boolean; text: string } | null;
  /** Mine, stored and younger than 24 hours (old chat rule). */
  canUnsend: boolean;
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

type RoomsData = {
  rows: RoomRow[];
  meta: Record<string, RoomMeta>;
  last: Record<string, LastMessageRow>;
  people: Record<string, ChatPersonRow>;
};

async function loadRooms(uid: string, rows: RoomRow[]): Promise<RoomsData> {
  const ids = rows.map((r) => r.id);
  const others = [...new Set(rows.map((r) => otherOf(r, uid)).filter((x): x is string => !!x))];
  const [meta, last, people] = await Promise.all([getRoomMeta(uid, ids), getLastMessages(ids), getChatPeople(others)]);
  return { rows, meta, last, people };
}

function toRooms(d: RoomsData, uid: string, follows: ReadonlySet<string> | undefined): ChatRoom[] {
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
      kind: r.kind,
      requestId: r.request_id ?? null,
    };
  });
}

/** Re-renders when mute / accept / seen kept on this device change (step-12 SQL not run yet). */
function useLocalPrefsTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((n) => n + 1);
    window.addEventListener("sc-chat-prefs", on);
    return () => window.removeEventListener("sc-chat-prefs", on);
  }, []);
  return tick;
}

export function useChatRooms(enabled = true) {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const { data: follows } = useFollowedUserIds(enabled ? uid : undefined);

  const query = useQuery({
    queryKey: chatKeys.rooms(uid),
    enabled: enabled && !!uid,
    staleTime: 15_000,
    queryFn: async () => loadRooms(uid!, await getMyRooms(uid!)),
  });

  useEffect(() => {
    if (!enabled || !uid) return;
    // Each mounted list has its own channel, so ChatDock and the big chat on screen together never share one.
    return subscribeRooms(uid, () => {
      void qc.invalidateQueries({ queryKey: chatKeys.rooms(uid) });
      void qc.invalidateQueries({ queryKey: chatKeys.unread(uid) });
    });
  }, [enabled, uid, qc]);

  const localTick = useLocalPrefsTick();
  const rooms = useMemo((): ChatRoom[] => {
    void localTick;
    return query.data && uid ? toRooms(query.data, uid, follows) : [];
  }, [query.data, uid, follows, localTick]);

  return { rooms, loading: query.isLoading, error: query.error, refetch: query.refetch };
}

/**
 * The open room: from the list, or read by itself when it is not in the newest 100 (old ChatInboxPage did the
 * same, e.g. `/chat/:id` from a notification). `missing` = it really is not there (or not mine, or a group room).
 */
export function useChatRoom(roomId: string | null, list: Pick<ReturnType<typeof useChatRooms>, "rooms" | "loading">) {
  const { user } = useAuth();
  const uid = user?.id;
  const inList = roomId ? list.rooms.find((r) => r.id === roomId) ?? null : null;
  const need = !!uid && !!roomId && !inList && !list.loading;
  const { data: follows } = useFollowedUserIds(need ? uid : undefined);
  const query = useQuery({
    queryKey: chatKeys.room(uid, roomId),
    enabled: need,
    staleTime: 15_000,
    queryFn: async () => {
      const row = await getRoom(roomId!, uid!);
      return row ? loadRooms(uid!, [row]) : null;
    },
  });
  const localTick = useLocalPrefsTick();
  const direct = useMemo(() => {
    void localTick;
    return query.data && uid ? toRooms(query.data, uid, follows)[0] ?? null : null;
  }, [query.data, uid, follows, localTick]);
  const room = inList ?? (need ? direct : null);
  return {
    room,
    loading: !!roomId && !room && (list.loading || (need && query.isLoading)),
    missing: need && query.isSuccess && !query.data,
    error: need && !query.data ? query.error : null,
    refetch: query.refetch,
  };
}

const LOCK_BLOCKED_BY_ME = "คุณบล็อกคนนี้อยู่ เลยส่งข้อความไม่ได้ ปลดบล็อกได้ใน Settings นะ";
const LOCK_BLOCKED = "ตอนนี้ส่งข้อความถึงคนนี้ไม่ได้นะ";
const LOCK_HIRE = "แชทนี้ปิดแล้ว ทั้งสองฝ่ายพิมพ์ต่อไม่ได้นะ";

/** Why I cannot write in this room (a block either way, or an old hire room that was locked), or null. */
export function useRoomLock(room: Pick<ChatRoom, "other" | "kind" | "requestId"> | null): string | null {
  const { user } = useAuth();
  const uid = user?.id;
  const either = useBlockedUserIds();
  const mine = useQuery({
    queryKey: [...chatKeys.lock, "mine", uid],
    enabled: !!uid && !!room,
    staleTime: 60_000,
    queryFn: () => getMyBlockedIds(uid!),
  });
  const requestId = room?.kind === "hire" ? room.requestId : null;
  const hire = useQuery({
    queryKey: [...chatKeys.lock, "hire", requestId],
    enabled: !!requestId,
    staleTime: 60_000,
    queryFn: () => getHireRoomLocked(requestId!),
  });
  if (!room) return null;
  if (mine.data?.has(room.other.id)) return LOCK_BLOCKED_BY_ME;
  if (either.has(room.other.id)) return LOCK_BLOCKED;
  return hire.data ? LOCK_HIRE : null;
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

type PendingRow = MessageRow & { pending?: boolean; local_url?: string | null };

const eventWhen = (e: { starts_on: string | null; ends_on: string | null; location_name: string | null } | undefined) =>
  e?.starts_on ? `${formatEventDates(e.starts_on, e.ends_on)}${e.location_name ? ` · ${e.location_name}` : ""}` : "";

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

  // Shared profiles and linked events: one read each for the whole room.
  const profileIds = useMemo(
    () => [...new Set((query.data ?? []).filter((m) => m.message_type === "profile" && !m.deleted_at).map((m) => m.profile_user_id || m.sender_id))].sort(),
    [query.data],
  );
  const { data: profiles } = useQuery({
    queryKey: ["sc-chat-profiles", profileIds],
    enabled: profileIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => getChatPeople(profileIds),
  });
  const eventIds = useMemo(
    () => [...new Set((query.data ?? []).map((m) => (m.deleted_at ? null : eventOf(m)?.toLowerCase())).filter((x): x is string => !!x))].sort(),
    [query.data],
  );
  const { data: events } = useQuery({
    queryKey: ["sc-chat-events", eventIds],
    enabled: eventIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => getChatEvents(eventIds),
  });

  // Quotes of replies: from the loaded messages, older ones read once.
  const quoteIds = useMemo(() => {
    const have = new Set((query.data ?? []).map((m) => m.id));
    return [...new Set((query.data ?? []).map((m) => m.reply_to_id).filter((x): x is string => !!x && !have.has(x)))].sort();
  }, [query.data]);
  const { data: olderQuoted } = useQuery({
    queryKey: ["sc-chat-quoted", roomId, quoteIds],
    enabled: quoteIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => getMessagesByIds(quoteIds),
  });

  const items = useMemo((): ChatMsg[] => {
    const now = new Date();
    const byId = new Map((works ?? []).map((w) => [w.id, w]));
    const quoted = new Map<string, MessageRow>([...(olderQuoted ?? []), ...(query.data ?? [])].map((m) => [m.id, m]));
    const out: ChatMsg[] = [];
    for (const m of query.data ?? []) {
      const kind = msgKind(m, now);
      if (!kind) continue;
      const w = kind === "work" ? byId.get(m.project_id!) : undefined;
      const profileId = kind === "profile" ? m.profile_user_id || m.sender_id : null;
      const eventId = kind === "text" ? eventOf(m)?.toLowerCase() ?? null : null;
      const ev = eventId ? events?.[eventId] : undefined;
      out.push({
        id: m.id,
        me: m.sender_id === uid,
        at: m.created_at,
        kind,
        text: kind === "work" ? w?.title?.trim() || m.content?.trim() || "ผลงาน" : kind === "text" ? textOf(m) : msgLabel(m, now),
        path: kind === "img" ? m.attachment_url : null,
        work: kind === "work" ? { id: m.project_id!, title: w?.title?.trim() || m.content?.trim() || "ผลงาน", cover: workCover(w) } : null,
        profile: profileId ? { ...person(profileId, profiles?.[profileId]), ...(profiles ? null : { name: "โปรไฟล์" }) } : null,
        event: eventId ? { id: eventId, title: ev?.title?.trim() || "อีเวนต์", cover: proxiedImageUrl(ev?.cover_url, 240), when: eventWhen(ev) } : null,
        doc: kind === "doc" ? docOf(m.content) : null,
        object: kind === "object" ? objectOf(m.content) : null,
        localUrl: m.local_url ?? null,
        replyTo: (() => {
          const q = m.reply_to_id && kind !== "gone" ? quoted.get(m.reply_to_id) : undefined;
          return q ? { id: q.id, mine: q.sender_id === uid, text: quoteText(q, now) } : null;
        })(),
        canUnsend:
          m.sender_id === uid && !m.pending && kind !== "gone" && now.getTime() - new Date(m.created_at).getTime() < UNSEND_HOURS * 3_600_000,
        pending: !!m.pending,
      });
    }
    return out;
  }, [query.data, works, profiles, events, olderQuoted, uid]);

  return { items, loading: query.isLoading, error: query.error, refetch: query.refetch };
}

/** Short words of a message on screen, for the reply bar above the text box (old chat replyPreviewText). */
export function chatMsgQuote(m: ChatMsg): string {
  if (m.kind === "img" || m.kind === "exp") return "รูป";
  if (m.kind === "work") return `ผลงาน ${m.work?.title ?? m.text}`.trim();
  if (m.kind === "profile") return `โปรไฟล์ ${m.profile?.name ?? ""}`.trim();
  if (m.kind === "doc") return `${m.doc?.kind ?? "เอกสาร"} ${m.doc?.number ?? ""}`.trim();
  if (m.kind === "object") return `สินค้า ${m.object?.title ?? ""}`.trim();
  return m.text || (m.event ? `อีเวนต์ ${m.event.title}` : "ข้อความ");
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
    async (roomId: string, row: Partial<PendingRow> & { message_type: string }, run: () => Promise<unknown>) => {
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
        reply_to_id: row.reply_to_id ?? null,
        pending: true,
        local_url: row.local_url ?? null,
      };
      qc.setQueryData<PendingRow[]>(key, (old) => [...(old ?? []), tmp]);
      try {
        await run();
      } catch (e) {
        qc.setQueryData<PendingRow[]>(key, (old) => (old ?? []).filter((m) => m.id !== tmp.id));
        // A block or a locked hire room may have just happened: the composer re-checks and says why.
        void qc.invalidateQueries({ queryKey: chatKeys.lock });
        void qc.invalidateQueries({ queryKey: [BLOCKED_USER_IDS_KEY, uid] });
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

  const sendWork = (roomId: string, work: ChatWork) =>
    post(roomId, { message_type: "project", content: work.title, project_id: work.id }, () =>
      send.mutateAsync({ conversationId: roomId, content: work.title, messageType: "project", projectId: work.id }),
    );

  return {
    /**
     * `replyTo`: the message this text answers (quote). `about`: greeting from a work — its card goes right after
     * the text, so the other person sees what it is about.
     */
    sendText: async (roomId: string, text: string, opts: { about?: ChatWork | null; replyTo?: string | null } = {}) => {
      const { about, replyTo } = opts;
      await post(roomId, { message_type: "text", content: text, reply_to_id: replyTo ?? null }, () =>
        send.mutateAsync({ conversationId: roomId, content: text, ...(replyTo ? { replyToId: replyTo } : {}) }),
      );
      // Best effort, like the old greeting ("From : <work>"): the text already went out.
      if (about) await sendWork(roomId, about).catch(() => undefined);
    },
    sendWork,
    /** The picture shows at once with a clock while it uploads (HEIC has no preview in most browsers: a grey box). */
    sendImage: (roomId: string, file: File) => {
      const local = /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? URL.createObjectURL(file) : null;
      return post(roomId, { message_type: "image", local_url: local }, async () => {
        const path = await uploadChatImage(roomId, file);
        await send.mutateAsync({ conversationId: roomId, content: "", attachmentUrl: path, messageType: "image" });
      }).finally(() => {
        if (local) window.setTimeout(() => URL.revokeObjectURL(local), 30_000);
      });
    },
    /** Unsend (24 hours): goes at once on screen, comes back if the server says no. */
    unsend: async (roomId: string, msg: Pick<ChatMsg, "id" | "at">) => {
      const key = chatKeys.msgs(uid, roomId);
      const before = qc.getQueryData<PendingRow[]>(key);
      qc.setQueryData<PendingRow[]>(key, (old) => (old ?? []).map((m) => (m.id === msg.id ? { ...m, deleted_at: new Date().toISOString() } : m)));
      try {
        await unsendMessage(msg.id, msg.at);
      } catch (e) {
        if (before) qc.setQueryData(key, before);
        throw new Error(errText(e, "ยกเลิกไม่สำเร็จ ลองอีกครั้งนะ"));
      } finally {
        void qc.invalidateQueries({ queryKey: key });
        refresh();
      }
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
    report: async (room: Pick<ChatRoom, "id" | "other">, reason: ChatReportReason) => {
      await reportPerson(room.other.id, room.id, reason);
      await hideRoom(uid!, room.id);
      refresh();
    },
    block: async (room: Pick<ChatRoom, "id" | "other">) => {
      await blockPerson(uid!, room.other.id);
      await hideRoom(uid!, room.id);
      void qc.invalidateQueries({ queryKey: [BLOCKED_USER_IDS_KEY, uid] });
      void qc.invalidateQueries({ queryKey: chatKeys.lock });
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
      // An old collab / hire room with this person is reused, so greeting does not add a second row
      // (not a hire room whose request locked the chat: it refuses new messages).
      const cached = qc.getQueryData<{ rows: RoomRow[] }>(chatKeys.rooms(user.id));
      const plain = cached?.rows.find((r) => r.kind === "connect" && otherOf(r, user.id) === otherId);
      if (plain) return plain.id;
      for (const r of cached?.rows ?? []) {
        if (otherOf(r, user.id) !== otherId || (r.kind !== "collab" && r.kind !== "hire")) continue;
        if (r.kind === "hire" && (!r.request_id || (await isHireRoomLocked(r.request_id)))) continue;
        return r.id;
      }
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
