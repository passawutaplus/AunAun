import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useModerationState, useRecordProfanityStrike } from "@/hooks/useModeration";
import { useAuth } from "./useAuth";
import type { Database } from "@/integrations/supabase/types";

export type ChatKind = "hire" | "collab" | "group" | "studio";
export type MessageType = "text" | "image" | "project";
export type ConversationType = "direct" | "group";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type Conversation = ConversationRow & {
  conversation_type?: ConversationType | string | null;
  title?: string | null;
  created_by?: string | null;
};

export type Message = MessageRow & {
  reply_to_id?: string | null;
  deleted_at?: string | null;
  message_type?: MessageType | string | null;
  project_id?: string | null;
};

export type ConversationPin = {
  user_id: string;
  conversation_id: string;
  pinned_at: string;
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

      const merged = new Map<string, Conversation>();
      [...(direct ?? []), ...groups].forEach((c) => merged.set(c.id, c as Conversation));
      let list = Array.from(merged.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
      );

      if (kind === "group") list = list.filter((c) => isGroupConversation(c));
      else if (kind) list = list.filter((c) => !isGroupConversation(c) && c.kind === kind);

      return list;
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`conv-rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "shared", table: "conversations" },
        () => {
          qc.invalidateQueries({ queryKey: ["conversations", user.id] });
          qc.invalidateQueries({ queryKey: ["chat-inbox-badge", user.id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "shared", table: "conversation_members", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["conversations", user.id] });
          qc.invalidateQueries({ queryKey: ["chat-inbox-badge", user.id] });
        },
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
  const subscribe = opts?.subscribe !== false;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: false })
        .limit(MESSAGE_WINDOW_LIMIT);
      if (error) throw error;
      return ((data ?? []) as Message[]).reverse();
    },
  });

  useEffect(() => {
    if (!conversationId || !subscribe) return;
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
        () => qc.invalidateQueries({ queryKey: ["messages", conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, subscribe, qc]);

  return query;
};

export type SendMessageArgs = {
  conversationId: string;
  content: string;
  attachmentUrl?: string;
  replyToId?: string;
  messageType?: MessageType;
  projectId?: string;
  hadProfanity?: boolean;
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { refetch: refetchMod } = useModerationState();
  const recordStrike = useRecordProfanityStrike();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      attachmentUrl,
      replyToId,
      messageType = "text",
      projectId,
      hadProfanity,
    }: SendMessageArgs) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");

      const { data: gate } = await refetchMod();
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
      if (messageType === "image" && attachmentUrl) row.message_type = "image";

      const { error } = await supabase.from("messages").insert(row as never);
      if (error) throw error;

      void supabase.functions.invoke("notify-anthem-chat", {
        body: { conversation_id: conversationId },
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["chat-last-msgs"] });
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
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
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
        if (String(error.message).includes("does not exist")) return [] as ConversationPin[];
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

/* ───────────────── Group chat ───────────────── */

export const useCreateGroupConversation = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, memberIds }: { title: string; memberIds: string[] }) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบ");
      const uniqueMembers = Array.from(new Set(memberIds.filter((id) => id !== user.id)));
      const { data, error } = await supabase.rpc("create_group_conversation" as never, {
        p_title: title.trim(),
        p_member_ids: uniqueMembers,
      } as never);
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

/* ───────────────── Accept / Reject ───────────────── */

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
      if (kind === "hire") {
        const { error } = await supabase.from("hiring_requests").update({ status: "ตอบรับ" as never }).eq("id", requestId);
        if (error) throw error;
      } else if (kind === "collab") {
        const { error } = await supabase.from("collab_requests").update({ status: "accepted" as never }).eq("id", requestId);
        if (error) throw error;
      }

      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("kind", kind)
        .eq("request_id", requestId)
        .maybeSingle();

      if (existing?.id) return existing.id as string;

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          kind,
          conversation_type: "direct",
          request_id: requestId,
          client_id: clientId,
          freelancer_id: freelancerId,
          project_id: projectId ?? null,
          project_title: projectTitle ?? "",
          created_by: freelancerId,
        } as never)
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") {
          const { data: raced, error: racedError } = await supabase
            .from("conversations")
            .select("id")
            .eq("kind", kind)
            .eq("request_id", requestId)
            .single();
          if (racedError) throw racedError;
          return raced.id as string;
        }
        throw error;
      }
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
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
    mutationFn: async ({ kind, requestId }: { kind: ChatKind; requestId: string }) => {
      if (kind === "hire") {
        const { error } = await supabase.from("hiring_requests").update({ status: "ปฏิเสธ" as never }).eq("id", requestId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("collab_requests").update({ status: "declined" as never }).eq("id", requestId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      qc.invalidateQueries({ queryKey: ["collab-requests"] });
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

  const query = useQuery({
    queryKey: ["chat-inbox-badge", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
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

      const [{ count: pendingHires }, { count: pendingCollabs }] = await Promise.all([
        supabase
          .from("hiring_requests")
          .select("*", { count: "exact", head: true })
          .eq("freelancer_id", uid)
          .in("status", ["pending", "รอตอบ"]),
        supabase
          .from("collab_requests")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", uid)
          .eq("status", "pending"),
      ]);

      return unreadMessages + (pendingHires ?? 0) + (pendingCollabs ?? 0);
    },
  });

  return query;
};

export const useFindConversationByRequest = () => {
  return async (kind: ChatKind, requestId: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("kind", kind)
      .eq("request_id", requestId)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  };
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
