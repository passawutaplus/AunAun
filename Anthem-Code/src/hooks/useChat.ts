import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import { supabase } from "@/integrations/supabase/client";
import { useModerationState, useRecordProfanityStrike } from "@/hooks/useModeration";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";
import { isUuid } from "@/lib/uuid";
import {
  formatHireBriefChatText,
  parseAttachmentUrlsFromMessage,
  stripAttachmentBlock,
} from "@/lib/hireBrief";
import { formatCollabBriefChatText } from "@/lib/collabBrief";
import {
  SYSTEM_MESSAGE_PREFIX,
} from "@/lib/chatContext";

const MESSAGE_SELECT =
  "id, conversation_id, sender_id, content, attachment_url, read_at, created_at, reply_to_id, deleted_at, message_type, project_id, profile_user_id";

export type ChatKind = "hire" | "collab" | "group" | "studio";
export type MessageType = "text" | "image" | "file" | "project" | "system" | "profile";
export type ConversationType = "direct" | "group";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type Conversation = ConversationRow & {
  conversation_type?: ConversationType | string | null;
  title?: string | null;
  created_by?: string | null;
  group_tag?: string | null;
};

export type Message = MessageRow & {
  reply_to_id?: string | null;
  deleted_at?: string | null;
  message_type?: MessageType | string | null;
  project_id?: string | null;
  profile_user_id?: string | null;
};

export type ConversationPin = {
  user_id: string;
  conversation_id: string;
  pinned_at: string;
};

export type ConversationHide = {
  user_id: string;
  conversation_id: string;
  hidden_at: string;
};

const UNSEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const CONVERSATION_LIST_LIMIT = 100;
const MESSAGE_WINDOW_LIMIT = 150;

export function isGroupConversation(conv: Conversation): boolean {
  return conv.conversation_type === "group" || conv.kind === "group" || conv.kind === "studio";
}

export function isStudioConversation(conv: Conversation): boolean {
  return conv.kind === "studio";
}

export function conversationParticipantIds(conv: Conversation, userId: string): string[] {
  if (isGroupConversation(conv)) return [];
  return conv.client_id === userId ? [conv.freelancer_id] : [conv.client_id];
}

export function otherParticipantId(conv: Conversation, userId: string): string | null {
  if (isGroupConversation(conv)) return null;
  return conv.client_id === userId ? conv.freelancer_id : conv.client_id;
}

/* ───────────────── Conversations list ───────────────── */

export const useConversations = (kind?: ChatKind) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations", user?.id, kind ?? "all"],
    enabled: !!user?.id,
    queryFn: async () => {
      const directQuery = supabase
        .from("conversations")
        .select("*")
        .or(`client_id.eq.${user!.id},freelancer_id.eq.${user!.id}`)
        .order("last_message_at", { ascending: false })
        .limit(CONVERSATION_LIST_LIMIT);

      const { data: direct, error: directErr } = await directQuery;
      if (directErr) throw directErr;

      const { data: memberships, error: memErr } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);
      if (memErr && !String(memErr.message).includes("does not exist")) throw memErr;

      const { data: hides, error: hideErr } = await supabase
        .from("conversation_hides")
        .select("conversation_id")
        .eq("user_id", user!.id);
      if (hideErr && !isOptionalQueryError(hideErr)) throw hideErr;
      const hiddenIds = new Set((hides ?? []).map((h) => h.conversation_id));

      const groupIds = (memberships ?? []).map((m) => m.conversation_id);
      let groups: Conversation[] = [];
      if (groupIds.length > 0) {
        const { data: groupRows, error: groupErr } = await supabase
          .from("conversations")
          .select("*")
          .in("id", groupIds)
          .order("last_message_at", { ascending: false })
          .limit(CONVERSATION_LIST_LIMIT);
        if (groupErr) throw groupErr;
        groups = (groupRows ?? []) as Conversation[];
      }

      const { data: ownedGroups, error: ownedErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("created_by", user!.id)
        .eq("conversation_type", "group")
        .order("last_message_at", { ascending: false })
        .limit(CONVERSATION_LIST_LIMIT);
      if (ownedErr) throw ownedErr;

      const merged = new Map<string, Conversation>();
      [...(direct ?? []), ...groups, ...(ownedGroups ?? [])].forEach((c) =>
        merged.set(c.id, c as Conversation),
      );
      let list = Array.from(merged.values())
        .filter((c) => !hiddenIds.has(c.id))
        .sort(
          (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
        );

      if (kind === "group") list = list.filter((c) => isGroupConversation(c));
      else if (kind) list = list.filter((c) => !isGroupConversation(c) && c.kind === kind);

      return list;
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const invalidateInbox = () => {
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      qc.invalidateQueries({ queryKey: ["chat-inbox-badge", user.id] });
      qc.invalidateQueries({ queryKey: ["chat-last-msgs"] });
      qc.invalidateQueries({ queryKey: ["chat-unread-counts"] });
    };
    const ch = supabase
      .channel(`conv-rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "shared", table: "conversations" },
        invalidateInbox,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "shared", table: "conversation_members", filter: `user_id=eq.${user.id}` },
        invalidateInbox,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "shared", table: "conversation_hides", filter: `user_id=eq.${user.id}` },
        invalidateInbox,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "shared", table: "messages" },
        invalidateInbox,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  return query;
};

export const useConversation = (id: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversation", user?.id, id],
    enabled: !!id && !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Conversation | null;
    },
  });
};

/* ───────────────── Messages ───────────────── */

export type UseMessagesOptions = {
  /** Subscribe to realtime inserts (default true). Only one subscriber per conversation. */
  subscribe?: boolean;
};

export const useMessages = (conversationId: string | undefined, opts?: UseMessagesOptions) => {
  const { user } = useAuth();
  const subscribe = opts?.subscribe !== false;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", user?.id, conversationId],
    enabled: !!conversationId && !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(MESSAGE_WINDOW_LIMIT);
      if (error) throw error;
      return ((data ?? []) as Message[]).reverse();
    },
  });

  useEffect(() => {
    if (!conversationId || !user?.id || !subscribe) return;
    const ch = supabase
      .channel(`msg-rt-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "shared",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["messages", user.id, conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, user?.id, subscribe, qc]);

  return query;
};

export type SendMessageArgs = {
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  replyToId?: string;
  messageType?: MessageType;
  projectId?: string;
  profileUserId?: string;
  hadProfanity?: boolean;
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: moderation, refetch: refetchMod } = useModerationState();
  const recordStrike = useRecordProfanityStrike();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachmentUrl,
      replyToId,
      messageType = "text",
      projectId,
      profileUserId,
      hadProfanity,
    }: SendMessageArgs) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");

      let gate = moderation;
      if (!gate) {
        try {
          const res = await refetchMod();
          gate = res.data;
        } catch {
          // moderation RPC unavailable — don't block chat send
        }
      }
      if (gate && !gate.allowed) {
        const until = gate.banned_until
          ? new Date(gate.banned_until).toLocaleString("th-TH")
          : "";
        throw new Error(`คุณถูกจำกัดการโพสต์${until ? ` จนถึง ${until}` : ""}`);
      }

      if (hadProfanity) {
        await recordStrike.mutateAsync("chat_message");
      }

      const row: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        attachment_url: attachmentUrl ?? null,
        message_type: messageType,
      };
      if (replyToId) row.reply_to_id = replyToId;
      if (projectId) row.project_id = projectId;
      if (profileUserId) row.profile_user_id = profileUserId;
      if (messageType === "image" && attachmentUrl) row.message_type = "image";
      if (messageType === "file" && attachmentUrl) row.message_type = "file";

      let inserted: { id: string } | null = null;
      let { data, error } = await supabase
        .from("messages")
        .insert(row as never)
        .select("id")
        .maybeSingle();
      inserted = data as { id: string } | null;
      if (
        error &&
        (messageType === "system" || messageType === "profile" || messageType === "file") &&
        String(error.message).includes("message_type")
      ) {
        const fallback: Record<string, unknown> = {
          ...row,
          message_type: "text",
          content:
            messageType === "system"
              ? `${SYSTEM_MESSAGE_PREFIX}${content}`
              : content || (messageType === "file" ? "ไฟล์แนบ" : "โปรไฟล์"),
        };
        delete fallback.profile_user_id;
        ({ data, error } = await supabase
          .from("messages")
          .insert(fallback as never)
          .select("id")
          .maybeSingle());
        inserted = data as { id: string } | null;
      }
      if (error) {
        if (String(error.message).includes("HIRE_CHAT_LOCKED")) {
          throw new Error("แชทนี้ปิดแล้ว — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้");
        }
        throw error;
      }

      if (messageType !== "system") {
        void supabase.functions.invoke("notify-anthem-chat", {
          body: {
            conversation_id: conversationId,
            ...(inserted?.id ? { message_id: inserted.id } : {}),
          },
        });
      }

      return inserted;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", user?.id, vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-last-msgs"] });
      qc.invalidateQueries({ queryKey: ["chat-inbox-badge"] });
      qc.invalidateQueries({ queryKey: ["chat-unread-counts"] });
    },
  });
};

export const useUnsendMessage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, conversationId, createdAt }: { messageId: string; conversationId: string; createdAt: string }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const age = Date.now() - new Date(createdAt).getTime();
      if (age > UNSEND_WINDOW_MS) throw new Error("ยกเลิกได้ภายใน 24 ชั่วโมงเท่านั้น");
      const { error } = await supabase.rpc("unsend_message" as never, {
        p_message_id: messageId,
      } as never);
      if (error) throw error;
      return conversationId;
    },
    onSuccess: (conversationId) => {
      qc.invalidateQueries({ queryKey: ["messages", user?.id, conversationId] });
      qc.invalidateQueries({ queryKey: ["chat-last-msgs"] });
    },
  });
};

/* ───────────────── Pins ───────────────── */

export const useConversationPins = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["conversation-pins", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_pins")
        .select("*")
        .eq("user_id", user!.id)
        .order("pinned_at", { ascending: false });
      if (error) {
        if (isOptionalQueryError(error)) return [] as ConversationPin[];
        throw error;
      }
      return (data ?? []) as ConversationPin[];
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ conversationId, pinned }: { conversationId: string; pinned: boolean }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      if (pinned) {
        const { error } = await supabase.from("conversation_pins").delete().eq("user_id", user.id).eq("conversation_id", conversationId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("conversation_pins").upsert({
          user_id: user.id,
          conversation_id: conversationId,
          pinned_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-pins", user?.id] });
    },
  });

  return { ...query, togglePin };
};

/* ───────────────── Hide / delete from sidebar ───────────────── */

export const useHideConversation = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await supabase.from("conversation_hides").upsert({
        user_id: user.id,
        conversation_id: conversationId,
        hidden_at: new Date().toISOString(),
      });
      if (error) throw error;
      // drop pin if any — hidden chats shouldn't stay pinned
      await supabase.from("conversation_pins").delete().eq("user_id", user.id).eq("conversation_id", conversationId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      qc.invalidateQueries({ queryKey: ["conversation-pins", user?.id] });
      qc.invalidateQueries({ queryKey: ["chat-inbox-badge", user?.id] });
    },
  });
};

/* ───────────────── Group chat ───────────────── */

function mapGroupChatRpcError(error: { message?: string }, fallback = "สร้างกลุ่มไม่สำเร็จ"): string {
  const msg = error.message ?? "";
  if (msg.includes("UNAUTHORIZED")) return "ต้องเข้าสู่ระบบ";
  if (msg.includes("INVALID_TITLE")) return "ชื่อกลุ่มต้องมี 1–100 ตัวอักษร";
  if (msg.includes("NEED_OTHER_MEMBERS")) return "เลือกสมาชิกอย่างน้อย 1 คน";
  if (msg.includes("TOO_MANY_MEMBERS")) return "สมาชิกเกินจำกัด (สูงสุด 50 คน)";
  if (msg.includes("NOT_A_MEMBER")) return "คุณไม่ได้อยู่ในกลุ่มนี้";
  if (msg.includes("NOT_A_GROUP")) return "เพิ่มสมาชิกได้เฉพาะแชทกลุ่ม";
  if (msg.includes("NEED_NEW_MEMBERS")) return "เลือกเพื่อนอย่างน้อย 1 คน";
  if (msg.includes("INVALID_GROUP_TAG")) return "แท็กกลุ่มไม่ถูกต้อง";
  if (msg.includes("NOT_MUTUAL_FOLLOW") || msg.includes("NOT_FOLLOWING")) {
    return "เพิ่มได้เฉพาะคนที่คุณติดตาม";
  }
  if (
    msg.includes("MEMBERSHIP_INSERT_FAILED") ||
    msg.includes("CREATOR_NOT_MEMBER") ||
    msg.includes("CONVERSATION_NOT_ACCESSIBLE")
  ) {
    return "สร้างกลุ่มไม่สมบูรณ์ — ยังเปิดห้องแชทไม่ได้ ลองใหม่อีกครั้ง";
  }
  return fallback;
}

async function verifyConversationReadable(conversationId: string): Promise<void> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("CONVERSATION_NOT_ACCESSIBLE");
}

export const useCreateGroupConversation = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      memberIds,
      groupTag,
    }: {
      title: string;
      memberIds: string[];
      groupTag?: "hire" | "collab" | null;
    }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const uniqueMembers = Array.from(new Set(memberIds.filter((id) => id !== user.id)));
      const { data, error } = await supabase.rpc("create_group_conversation" as never, {
        p_title: title.trim(),
        p_member_ids: uniqueMembers,
        p_group_tag: groupTag ?? null,
      } as never);
      if (error) throw new Error(mapGroupChatRpcError(error));
      const convId = data as string;
      await verifyConversationReadable(convId);
      return convId;
    },
    onSuccess: async (convId) => {
      await qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      await qc.prefetchQuery({
        queryKey: ["conversation", user?.id, convId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", convId)
            .maybeSingle();
          if (error) throw error;
          return data as Conversation | null;
        },
      });
    },
  });
};

/** Update group title / purpose tag. */
export const useUpdateGroupSettings = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      title,
      groupTag,
      clearGroupTag,
    }: {
      conversationId: string;
      title?: string;
      groupTag?: "hire" | "collab" | null;
      clearGroupTag?: boolean;
    }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await supabase.rpc("update_group_conversation_settings" as never, {
        p_conversation_id: conversationId,
        p_title: title?.trim() || null,
        p_group_tag: clearGroupTag ? null : groupTag ?? null,
        p_clear_group_tag: !!clearGroupTag || groupTag === null,
      } as never);
      if (error) throw new Error(mapGroupChatRpcError(error, "บันทึกตั้งค่ากลุ่มไม่สำเร็จ"));
      return conversationId;
    },
    onSuccess: (conversationId) => {
      void qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      void qc.invalidateQueries({ queryKey: ["conversation", user?.id, conversationId] });
    },
  });
};

/** Any group member can add people they follow. */
export const useAddGroupMembers = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      memberIds,
    }: {
      conversationId: string;
      memberIds: string[];
    }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const unique = Array.from(new Set(memberIds.filter((id) => id !== user.id)));
      if (unique.length === 0) throw new Error("เลือกเพื่อนอย่างน้อย 1 คน");
      const { error } = await supabase.rpc("add_group_conversation_members" as never, {
        p_conversation_id: conversationId,
        p_member_ids: unique,
      } as never);
      if (error) throw new Error(mapGroupChatRpcError(error, "เพิ่มสมาชิกไม่สำเร็จ"));
      return conversationId;
    },
    onSuccess: (conversationId) => {
      void qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
      void qc.invalidateQueries({ queryKey: ["group-member-ids", conversationId] });
      void qc.invalidateQueries({ queryKey: ["group-panel-members", conversationId] });
      void qc.invalidateQueries({ queryKey: ["conversation", user?.id, conversationId] });
    },
  });
};

/* ───────────────── Open hire/collab chat (instant, no accept gate) ───────────────── */

export type OpenHireCollabChatArgs = {
  kind: "hire" | "collab";
  requestId: string;
  clientId: string;
  freelancerId: string;
  projectId?: string | null;
  projectTitle?: string;
  contextMessage: string;
  /** Legacy inbox: mark hire as ตอบรับ instead of ติดต่อแล้ว */
  legacyAccept?: boolean;
  /** Open chat without changing request status (forwarded hire awaiting friend accept/reject). */
  skipStatusUpdate?: boolean;
};

async function findConversationByRequest(kind: ChatKind, requestId: string): Promise<string | null> {
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("kind", kind)
    .eq("request_id", requestId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

async function ensureConversation(args: OpenHireCollabChatArgs): Promise<string> {
  const { kind, requestId, clientId, freelancerId, projectId, projectTitle } = args;

  const existing = await findConversationByRequest(kind, requestId);
  if (existing) return existing;

  const safeProjectId = projectId && isUuid(projectId) ? projectId : null;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      kind,
      conversation_type: "direct",
      request_id: requestId,
      client_id: clientId,
      freelancer_id: freelancerId,
      project_id: safeProjectId,
      project_title: projectTitle ?? "",
      created_by: clientId,
    } as never)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const raced = await findConversationByRequest(kind, requestId);
      if (raced) return raced;
    }
    throw error;
  }
  return data.id as string;
}

async function insertContextMessage(
  conversationId: string,
  senderId: string,
  content: string,
): Promise<void> {
  const row = {
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    message_type: "system",
  };
  let { error } = await supabase.from("messages").insert(row as never);
  if (error && String(error.message).includes("message_type")) {
    ({ error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: `${SYSTEM_MESSAGE_PREFIX}${content}`,
      message_type: "text",
    } as never));
  }
  if (error) throw error;
}

async function seedHireBriefIfPresent(conversationId: string, requestId: string): Promise<void> {
  const { data: hire } = await supabase
    .from("hiring_requests")
    .select(
      "client_id, project_title, client_name, email, phone, message, deadline, budget_amount, attachment_urls",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!hire?.client_id || !hire.message?.trim()) return;

  const row = hire as {
    client_id: string;
    message?: string | null;
    attachment_urls?: string[] | null;
    project_title?: string | null;
    client_name?: string | null;
    email?: string | null;
    phone?: string | null;
    deadline?: string | null;
    budget_amount?: number | null;
  };

  const attachmentUrls =
    row.attachment_urls?.length ? row.attachment_urls : parseAttachmentUrlsFromMessage(row.message);

  const text = formatHireBriefChatText({
    ...row,
    message: stripAttachmentBlock(row.message),
  });

  if (!text.trim()) return;

  const { error: textErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: row.client_id,
    content: text,
    message_type: "text",
  } as never);
  if (textErr) throw textErr;

  for (const url of attachmentUrls) {
    const { error: imgErr } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: row.client_id,
      content: "",
      attachment_url: url,
      message_type: "image",
    } as never);
    if (imgErr) throw imgErr;
  }
}

async function seedCollabMessages(conversationId: string, requestId: string): Promise<void> {
  const { data: collab } = await supabase
    .from("collab_requests")
    .select("sender_id, message, timeline, collab_types, attached_project_ids")
    .eq("id", requestId)
    .maybeSingle();

  if (!collab?.sender_id) return;

  const senderId = collab.sender_id as string;
  const projectIds = (collab.attached_project_ids as string[] | null) ?? [];

  let projectTitle: string | null = null;
  if (projectIds.length > 0) {
    const { data: first } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectIds[0])
      .maybeSingle();
    projectTitle = first?.title ?? null;
  }

  const brief = formatCollabBriefChatText({
    project_title: projectTitle,
    message: collab.message as string | null,
    timeline: collab.timeline as string | null,
    collab_types: collab.collab_types as string[] | null,
  });

  if (brief.trim()) {
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: brief,
      message_type: "text",
    } as never);
    if (error) throw error;
  }

  if (projectIds.length === 0) return;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .in("id", projectIds);

  for (const p of projects ?? []) {
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: p.title,
      message_type: "project",
      project_id: p.id,
    } as never);
    if (error) throw error;
  }
}

async function seedInstantChatMessages(
  conversationId: string,
  args: OpenHireCollabChatArgs,
): Promise<void> {
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if ((count ?? 0) > 0) return;

  await insertContextMessage(conversationId, args.clientId, args.contextMessage);

  if (args.kind === "hire") {
    await seedHireBriefIfPresent(conversationId, args.requestId);
  } else {
    await seedCollabMessages(conversationId, args.requestId);
  }
}

export async function openHireCollabChat(args: OpenHireCollabChatArgs): Promise<string> {
  const { kind, requestId, legacyAccept, skipStatusUpdate } = args;

  if (!skipStatusUpdate) {
    if (kind === "hire") {
      const status = legacyAccept ? "ตอบรับ" : "ติดต่อแล้ว";
      const { error } = await supabase
        .from("hiring_requests")
        .update({ status: status as never })
        .eq("id", requestId);
      if (error) throw error;
    } else if (legacyAccept) {
      // Instant open keeps `pending` (= ติดต่อใหม่). Explicit accept → accepted.
      const { error } = await supabase
        .from("collab_requests")
        .update({ status: "accepted" as never })
        .eq("id", requestId);
      if (error) throw error;
    }
  }

  const convId = await ensureConversation(args);
  await seedInstantChatMessages(convId, args);
  try {
    await supabase.rpc("maybe_send_chat_auto_reply" as never, {
      p_conversation_id: convId,
    } as never);
  } catch {
    /* auto-reply is best-effort — don't block opening chat */
  }
  return convId;
}

export const useOpenHireCollabChat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: openHireCollabChat,
    onSuccess: (_convId, vars) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["chat-inbox-badge"] });
      qc.invalidateQueries({ queryKey: ["notif-hire"] });
      qc.invalidateQueries({ queryKey: ["notif-collab"] });
      if (vars.kind === "hire") {
        qc.invalidateQueries({ queryKey: ["chat-hire-meta", vars.requestId] });
      }
    },
  });
};

/* ───────────────── Accept / Reject (legacy + studio) ───────────────── */

/** @deprecated Use openHireCollabChat — kept for legacy pending requests without a conversation */
async function seedHireChatBrief(conversationId: string, requestId: string) {
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId);
  if ((count ?? 0) > 0) return;
  await seedHireBriefIfPresent(conversationId, requestId);
}

type AcceptArgs = {
  kind: ChatKind;
  requestId: string;
  clientId: string;
  freelancerId: string;
  projectId?: string | null;
  projectTitle?: string;
};

export const useAcceptRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kind, requestId, clientId, freelancerId, projectId, projectTitle }: AcceptArgs) => {
      if (kind !== "hire" && kind !== "collab") {
        throw new Error("Unsupported kind");
      }

      const existing = await findConversationByRequest(kind, requestId);
      if (existing) {
        if (kind === "hire") {
          await supabase
            .from("hiring_requests")
            .update({ status: "ตอบรับ" as never })
            .eq("id", requestId);
        } else {
          await supabase
            .from("collab_requests")
            .update({ status: "accepted" as never })
            .eq("id", requestId);
        }
        try {
          await supabase.rpc("maybe_send_chat_auto_reply" as never, {
            p_conversation_id: existing,
          } as never);
        } catch {
          /* best-effort */
        }
        return existing;
      }

      const title =
        projectTitle ??
        (kind === "collab" ? "คอลแลปไอเดียใหม่" : "งานจ้าง");

      return openHireCollabChat({
        kind,
        requestId,
        clientId,
        freelancerId,
        projectId,
        projectTitle: title,
        contextMessage:
          kind === "hire"
            ? "เริ่มสนทนางานจ้าง — คุยรายละเอียดได้เลย"
            : "เริ่มสนทนาคอลแลป — คุยไอเดียได้เลย",
        legacyAccept: true,
      });
    },
    onSuccess: (_convId, vars) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
      if (vars.kind === "hire") {
        qc.invalidateQueries({ queryKey: ["messages"] });
      }
    },
  });
};

/** Accept a client → studio hire request (creates hire conversation with studio_id). */
export const useAcceptStudioHireRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("accept_studio_hire_request", {
        p_request_id: requestId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["studio_hiring_requests"] });
    },
  });
};

export const useRejectRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      requestId,
      reason,
      note,
      status,
      postRejectChat,
      keepChat,
    }: {
      kind: ChatKind;
      requestId: string;
      reason?: string | null;
      note?: string | null;
      /** Hire only — default ปฏิเสธ; soft-decline can use ติดต่อแล้ว */
      status?: string;
      /** Hire only — post-reject chat gate */
      postRejectChat?: "awaiting_client" | "awaiting_freelancer" | "open" | "locked" | null;
      /** Collab only — decline but keep ideation chat open */
      keepChat?: boolean;
    }) => {
      if (kind === "hire") {
        const patch: Record<string, unknown> = {
          status: status ?? "ปฏิเสธ",
          reject_reason: reason ?? null,
          reject_note: note ?? null,
        };
        if (postRejectChat !== undefined) {
          patch.post_reject_chat = postRejectChat;
        }
        const { error } = await supabase
          .from("hiring_requests")
          .update(patch as never)
          .eq("id", requestId);
        if (error) throw error;
      } else if (kind === "collab") {
        const { error } = await supabase
          .from("collab_requests")
          .update({
            status: "declined",
            reject_reason: reason ?? null,
            reject_note: note ?? null,
            keep_chat: !!keepChat || reason === "busy_but_chat",
          } as never)
          .eq("id", requestId);
        if (error) throw error;
      } else {
        throw new Error("Unsupported kind");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
      qc.invalidateQueries({ queryKey: ["chat-hire-forward-src"] });
      qc.invalidateQueries({ queryKey: ["chat-hire-meta"] });
      qc.invalidateQueries({ queryKey: ["chat-collab-meta"] });
      qc.invalidateQueries({ queryKey: ["chat-collab-meta-panel"] });
      qc.invalidateQueries({ queryKey: ["chat-list-hire-locked"] });
    },
  });
};

/* ───────────────── Unread counts (sidebar badges) ───────────────── */

export const useConversationUnreadCounts = (conversationIds: string[]) => {
  const { user } = useAuth();
  const sortedIds = [...conversationIds].sort().join(",");

  return useQuery({
    queryKey: ["chat-unread-counts", user?.id, sortedIds],
    enabled: !!user?.id && conversationIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user!.id)
        .is("read_at", null)
        .is("deleted_at", null);
      if (error) {
        if (String(error.message).includes("deleted_at")) {
          const { data: fallback, error: fbErr } = await supabase
            .from("messages")
            .select("conversation_id")
            .in("conversation_id", conversationIds)
            .neq("sender_id", user!.id)
            .is("read_at", null);
          if (fbErr) throw fbErr;
          const map: Record<string, number> = {};
          (fallback ?? []).forEach((m) => {
            map[m.conversation_id] = (map[m.conversation_id] ?? 0) + 1;
          });
          return map;
        }
        throw error;
      }
      const map: Record<string, number> = {};
      (data ?? []).forEach((m) => {
        map[m.conversation_id] = (map[m.conversation_id] ?? 0) + 1;
      });
      return map;
    },
  });
};

/** Unread messages + pending hire/collab requests for header chat badge */
export const useChatInboxBadgeCount = () => {
  const { user } = useAuth();

  // Do NOT attach Realtime here: this hook mounts in multiple nav components
  // with the same channel topic, which throws after subscribe() and crashes the app.
  // Badge refresh: refetchInterval + useConversations realtime invalidation.

  const query = useQuery({
    queryKey: ["chat-inbox-badge", user?.id],
    enabled: !!user?.id,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<number> => {
      const uid = user!.id;

      const [{ data: direct }, { data: memberships }] = await Promise.all([
        supabase.from("conversations").select("id").or(`client_id.eq.${uid},freelancer_id.eq.${uid}`),
        supabase.from("conversation_members").select("conversation_id").eq("user_id", uid),
      ]);

      const convIds = Array.from(
        new Set([
          ...(direct ?? []).map((c) => c.id),
          ...(memberships ?? []).map((m) => m.conversation_id),
        ]),
      );

      let unreadMessages = 0;
      if (convIds.length > 0) {
        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", uid)
          .is("read_at", null)
          .is("deleted_at", null);
        if (error && String(error.message).includes("deleted_at")) {
          const { count: fbCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .in("conversation_id", convIds)
            .neq("sender_id", uid)
            .is("read_at", null);
          unreadMessages = fbCount ?? 0;
        } else if (error) {
          throw error;
        } else {
          unreadMessages = count ?? 0;
        }
      }

      return unreadMessages;
    },
  });

  return query;
};

export const useFindConversationByRequest = () => {
  return async (kind: ChatKind, requestId: string) => findConversationByRequest(kind, requestId);
};

export const useStudioConversation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studioId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("find_or_create_studio_chat", {
        p_studio_id: studioId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export { UNSEND_WINDOW_MS };
