/**
 * Collab in the new chat: the invite of a collab room and what each person can do with it (old ChatCollabActions).
 * The plan itself is the old hook (useCollabAgreement), shown by PlanSheet.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getCollabRequest, type CollabRequestRow } from "@/server/queries/collab";
import { acceptCollab, declineCollab, inviteCollab, withdrawCollab, type CollabInvite } from "@/server/mutations/collab";
import { chatKeys, useChatActions, type ChatRoom } from "./useChatStore";

const reqKey = (id: string | null) => ["sc-collab-req", id] as const;

export type CollabState = {
  row: CollabRequestRow | null;
  /** I was invited and have not answered. */
  canAnswer: boolean;
  /** I invited and they have not answered. */
  canWithdraw: boolean;
  /** Accepted (or done): the plan is the next step. */
  started: boolean;
  label: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอตอบ",
  interested: "รอตอบ",
  accepted: "ตกลงคอลแลปแล้ว",
  completed: "คอลแลปเสร็จแล้ว",
  declined: "ยังไม่ร่วมงานครั้งนี้",
  passed: "ยังไม่ร่วมงานครั้งนี้",
  cancelled: "ยกเลิกคำชวนแล้ว",
  archived: "ปิดไปแล้ว",
};

/** The invite behind a collab room (null for any other room). */
export function useCollabRoom(room: Pick<ChatRoom, "kind" | "requestId"> | null) {
  const { user } = useAuth();
  const requestId = room?.kind === "collab" ? room.requestId : null;
  const q = useQuery({ queryKey: reqKey(requestId), enabled: !!requestId && !!user, staleTime: 15_000, queryFn: () => getCollabRequest(requestId!) });
  const row = q.data ?? null;
  const open = row?.status === "pending" || row?.status === "interested";
  const state: CollabState | null = row
    ? {
        row,
        canAnswer: open && row.recipient_id === user?.id,
        canWithdraw: open && row.sender_id === user?.id,
        started: row.status === "accepted" || row.status === "completed",
        label: STATUS_LABEL[row.status] ?? "",
      }
    : null;
  return { requestId, state, loading: q.isLoading };
}

export function useCollabActions() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const chat = useChatActions();
  const done = useCallback(
    (requestId: string, roomId: string) => {
      void qc.invalidateQueries({ queryKey: reqKey(requestId) });
      void qc.invalidateQueries({ queryKey: ["collab-plan-doc", roomId] });
      void qc.invalidateQueries({ queryKey: chatKeys.rooms(user?.id) });
    },
    [qc, user?.id],
  );
  return {
    /** Opens the collab room with the invite in it; returns its id. */
    invite: async (i: Omit<CollabInvite, "me">) => {
      if (!user) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const id = await inviteCollab({ ...i, me: user.id });
      await qc.invalidateQueries({ queryKey: chatKeys.rooms(user.id) });
      return id;
    },
    accept: async (requestId: string, roomId: string) => {
      const line = await acceptCollab(requestId, roomId);
      await chat.sendText(roomId, line).catch(() => undefined);
      done(requestId, roomId);
    },
    decline: async (requestId: string, roomId: string, reason: string, note?: string) => {
      const line = await declineCollab(requestId, reason, note);
      await chat.sendText(roomId, line).catch(() => undefined);
      done(requestId, roomId);
    },
    withdraw: async (requestId: string, roomId: string) => {
      const line = await withdrawCollab(requestId);
      await chat.sendText(roomId, line).catch(() => undefined);
      done(requestId, roomId);
    },
  };
}
