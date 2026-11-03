import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sharedDb } from "@/integrations/supabase/client";
import type { Conversation, useAcceptRequest, useRejectRequest, useSendMessage } from "@/hooks/useChat";
import type { HiringRow } from "@/hooks/useHiringRequests";
import { emptyCollabPlanState, emptyPlanPayload } from "@/lib/collabToolkit";
import { COLLAB_WELCOME_PREFIX } from "@/lib/collabAgreement";
import { collabRejectReasonLabel } from "@/lib/collabBrief";
import { isCollabAcceptedStatus, isCollabDeclinedStatus } from "@/lib/collabInbox";
import {
  encodeHireContinueAskMessage,
  HIRE_CLIENT_ACCEPT_REJECT_TEXT,
  HIRE_FREELANCER_ACCEPT_CONTINUE_TEXT,
  HIRE_FREELANCER_DECLINE_CONTINUE_TEXT,
  type HirePostRejectChat,
} from "@/lib/hireRejectChat";
import type { HireInviteActions } from "@/components/chat/HireInviteCard";
import type { CollabInviteActions } from "@/components/chat/CollabInviteCard";
import type { HireRejectChoiceActions } from "@/components/chat/HireRejectChoiceCard";
import type { HireContinueAskActions } from "@/components/chat/HireContinueAskCard";

type CollabRequestRow = {
  id: string;
  status: string;
  reject_reason?: string | null;
  reject_note?: string | null;
  keep_chat?: boolean | null;
};

type OtherProfile = { username?: string | null; display_name?: string | null } | null | undefined;

/**
 * Builds the action/status objects for the hire + collab invite cards in a
 * chat thread (accept / decline / reject-choice / continue-ask).
 */
export function useChatInviteActions({
  conv,
  other,
  hireRequestRow,
  collabRequestRow,
  isHire,
  isCollab,
  isClient,
  isFreelancer,
  hirePendingResponse,
  hirePendingForClient,
  collabPendingResponse,
  collabPendingForClient,
  hireRespondBusy,
  collabRespondBusy,
  alreadyForwarded,
  hireStatus,
  collabStatus,
  hireRejectReason,
  collabRejectReason,
  effectivePostRejectChat,
  acceptHire,
  rejectHire,
  sendMessage,
  qc,
  collabPlanUi,
  setRejectOpen,
  setCollabRejectOpen,
}: {
  conv: Conversation;
  other: OtherProfile;
  hireRequestRow: HiringRow | null;
  collabRequestRow: CollabRequestRow | null;
  isHire: boolean;
  isCollab: boolean;
  isClient: boolean;
  isFreelancer: boolean;
  hirePendingResponse: boolean;
  hirePendingForClient: boolean;
  collabPendingResponse: boolean;
  collabPendingForClient: boolean;
  hireRespondBusy: boolean;
  collabRespondBusy: boolean;
  alreadyForwarded: boolean;
  hireStatus: string | null;
  collabStatus: string | null;
  hireRejectReason: string | null | undefined;
  collabRejectReason: string | null;
  effectivePostRejectChat: HirePostRejectChat | null;
  acceptHire: ReturnType<typeof useAcceptRequest>;
  rejectHire: ReturnType<typeof useRejectRequest>;
  sendMessage: ReturnType<typeof useSendMessage>;
  qc: QueryClient;
  collabPlanUi: { openFor: (conversationId: string) => void };
  setRejectOpen: (open: boolean) => void;
  setCollabRejectOpen: (open: boolean) => void;
}) {
  const hireInviteActions: HireInviteActions | null = useMemo(() => {
    if (!isHire || !hireRequestRow) return null;
    if (hirePendingResponse) {
      return {
        canRespond: true,
        busy: hireRespondBusy,
        onAccept: () => {
          void (async () => {
            if (!conv.request_id || !conv.client_id || !conv.freelancer_id) return;
            try {
              await acceptHire.mutateAsync({
                kind: "hire",
                requestId: conv.request_id,
                clientId: conv.client_id,
                freelancerId: conv.freelancer_id,
                projectId: conv.project_id ?? null,
                projectTitle: conv.project_title ?? hireRequestRow.project_title,
              });
              try {
                await sendMessage.mutateAsync({
                  conversationId: conv.id,
                  content: "ขอบคุณครับ/ค่ะ ยินดีรับงานและคุยรายละเอียดต่อได้เลย",
                });
              } catch {
                /* accept already succeeded */
              }
              void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
              void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
              toast.success("ตอบรับแล้ว — คุยต่อได้เลย");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
            }
          })();
        },
        onDecline: () => setRejectOpen(true),
      };
    }
    if (hirePendingForClient) {
      const waitingName =
        other?.username?.trim() ||
        other?.display_name?.trim() ||
        "ครีเอเตอร์";
      return {
        canRespond: false,
        statusHint: `รอ ${waitingName} ตอบกลับ / สามารถแชทพูดคุยต่อได้`,
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (!isFreelancer) return null;
    if (hireStatus === "ตอบรับ") {
      return { canRespond: false, statusHint: "ตอบรับแล้ว — คุยรายละเอียดต่อได้", onAccept: () => {}, onDecline: () => {} };
    }
    if (hireRejectReason === "busy_but_chat" || effectivePostRejectChat === "open") {
      return {
        canRespond: false,
        statusHint: "ยังไม่พร้อมทำตอนนี้ — คุยรายละเอียดต่อได้",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    // Rejected / forwarded: keep invite card clean (reason lives on reject-choice card).
    return null;
  }, [
    alreadyForwarded,
    acceptHire,
    conv.client_id,
    conv.freelancer_id,
    conv.id,
    conv.project_id,
    conv.project_title,
    conv.request_id,
    hirePendingForClient,
    hirePendingResponse,
    hireRejectReason,
    hireRequestRow,
    hireRespondBusy,
    hireStatus,
    isFreelancer,
    isHire,
    other?.display_name,
    other?.username,
    effectivePostRejectChat,
    qc,
    sendMessage,
  ]);

  const collabInviteActions: CollabInviteActions | null = useMemo(() => {
    if (!isCollab || !collabRequestRow) return null;
    if (collabPendingResponse) {
      return {
        canRespond: true,
        busy: collabRespondBusy,
        onAccept: () => {
          void (async () => {
            if (!conv.request_id || !conv.client_id || !conv.freelancer_id) return;
            try {
              await acceptHire.mutateAsync({
                kind: "collab",
                requestId: conv.request_id,
                clientId: conv.client_id,
                freelancerId: conv.freelancer_id,
                projectId: conv.project_id ?? null,
                projectTitle: conv.project_title ?? "คอลแลปไอเดียใหม่",
              });
              try {
                await sharedDb.from("collab_plans" as never).upsert(
                  {
                    conversation_id: conv.id,
                    status: "draft",
                    current_step: "align",
                    payload: emptyPlanPayload(),
                    acks: {},
                    version: 1,
                    stages: emptyCollabPlanState().stages,
                    updated_at: new Date().toISOString(),
                  } as never,
                  { onConflict: "conversation_id", ignoreDuplicates: true },
                );
              } catch {
                /* plan row optional — sheet can create on first edit */
              }
              try {
                await sendMessage.mutateAsync({
                  conversationId: conv.id,
                  content: COLLAB_WELCOME_PREFIX,
                });
              } catch {
                /* accept already succeeded */
              }
              void qc.invalidateQueries({ queryKey: ["chat-collab-meta", conv.request_id] });
              void qc.invalidateQueries({ queryKey: ["collab-plan", conv.id] });
              collabPlanUi.openFor(conv.id);
              toast.success("ตอบรับแล้ว — เริ่มตกลงแผนกันได้เลย");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
            }
          })();
        },
        onDecline: () => setCollabRejectOpen(true),
      };
    }
    if (collabPendingForClient) {
      const waitingName =
        other?.username?.trim() || other?.display_name?.trim() || "ครีเอเตอร์";
      return {
        canRespond: false,
        statusHint: `รอ ${waitingName} ตอบกลับ / สามารถแชทพูดคุยต่อได้`,
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (!isFreelancer) return null;
    if (isCollabAcceptedStatus(collabStatus)) {
      return {
        canRespond: false,
        statusHint: "ตอบรับแล้ว — กด「วางแผนงาน」เพื่อตกลงแผนร่วมกัน",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (
      collabRejectReason === "busy_but_chat" ||
      collabRequestRow.keep_chat
    ) {
      return {
        canRespond: false,
        statusHint: "ขอบคุณสำหรับคำชวน — คุยไอเดียต่อได้ตามสบาย",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (isCollabDeclinedStatus(collabStatus)) {
      return {
        canRespond: false,
        statusHint:
          collabRequestRow.reject_note?.trim() ||
          collabRejectReasonLabel(collabRejectReason) ||
          "ยังไม่พร้อมร่วมงาน",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    return null;
  }, [
    acceptHire,
    collabPendingForClient,
    collabPendingResponse,
    collabRejectReason,
    collabRequestRow,
    collabRespondBusy,
    collabStatus,
    conv.client_id,
    conv.freelancer_id,
    conv.id,
    conv.project_id,
    conv.project_title,
    conv.request_id,
    isCollab,
    isFreelancer,
    other?.display_name,
    other?.username,
    qc,
    sendMessage,
  ]);

  const hireRejectChoiceActions: HireRejectChoiceActions | null = useMemo(() => {
    if (!isHire || !hireRequestRow) return null;
    if (effectivePostRejectChat === "awaiting_client" && isClient) {
      return {
        canRespond: true,
        busy: hireRespondBusy,
        onAcceptClose: () => {
          void (async () => {
            try {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: HIRE_CLIENT_ACCEPT_REJECT_TEXT,
              });
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: hireRejectReason,
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ปฏิเสธ",
                postRejectChat: "locked",
              });
              toast.success("ปิดแชทแล้ว — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          })();
        },
        onAskContinue: () => {
          void (async () => {
            try {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: hireRejectReason,
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ปฏิเสธ",
                postRejectChat: "awaiting_freelancer",
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: encodeHireContinueAskMessage({
                  v: 1,
                  kind: "continue_ask",
                  requestId: hireRequestRow.id,
                }),
              });
              toast.success("ส่งคำขอคุยต่อแล้ว");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
            }
          })();
        },
      };
    }
    if (effectivePostRejectChat === "awaiting_client") {
      // Freelancer already sent the reject card — no status footer on their bubble.
      return null;
    }
    if (effectivePostRejectChat === "awaiting_freelancer") {
      return { canRespond: false, statusHint: "รอครีเอเตอร์ตอบคำขอคุยต่อ", onAcceptClose: () => {}, onAskContinue: () => {} };
    }
    if (effectivePostRejectChat === "locked") {
      return { canRespond: false, statusHint: "แชทปิดแล้ว", onAcceptClose: () => {}, onAskContinue: () => {} };
    }
    if (effectivePostRejectChat === "open") {
      return { canRespond: false, statusHint: "คุยต่อได้แล้ว", onAcceptClose: () => {}, onAskContinue: () => {} };
    }
    return null;
  }, [
    conv.id,
    effectivePostRejectChat,
    hireRejectReason,
    hireRequestRow,
    hireRespondBusy,
    isClient,
    isHire,
    rejectHire,
    sendMessage,
  ]);

  const hireContinueAskActions: HireContinueAskActions | null = useMemo(() => {
    if (!isHire || !hireRequestRow) return null;
    if (effectivePostRejectChat === "awaiting_freelancer" && isFreelancer) {
      return {
        canRespond: true,
        busy: hireRespondBusy,
        onAccept: () => {
          void (async () => {
            try {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: "busy_but_chat",
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ติดต่อแล้ว",
                postRejectChat: "open",
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: HIRE_FREELANCER_ACCEPT_CONTINUE_TEXT,
              });
              toast.success("เปิดแชทคุยต่อแล้ว — ยังไม่รับงาน");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          })();
        },
        onDecline: () => {
          void (async () => {
            try {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: HIRE_FREELANCER_DECLINE_CONTINUE_TEXT,
              });
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: hireRejectReason,
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ปฏิเสธ",
                postRejectChat: "locked",
              });
              toast.success("ปิดแชทแล้ว — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          })();
        },
      };
    }
    if (effectivePostRejectChat === "awaiting_freelancer") {
      return { canRespond: false, statusHint: "รอครีเอเตอร์ตอบคำขอคุยต่อ", onAccept: () => {}, onDecline: () => {} };
    }
    if (effectivePostRejectChat === "locked") {
      return { canRespond: false, statusHint: "ปฏิเสธการคุยต่อ · แชทปิดแล้ว", onAccept: () => {}, onDecline: () => {} };
    }
    if (effectivePostRejectChat === "open") {
      return { canRespond: false, statusHint: "ยอมรับแล้ว — คุยต่อได้", onAccept: () => {}, onDecline: () => {} };
    }
    return null;
  }, [
    conv.id,
    effectivePostRejectChat,
    hireRejectReason,
    hireRequestRow,
    hireRespondBusy,
    isFreelancer,
    isHire,
    rejectHire,
    sendMessage,
  ]);


  return { hireInviteActions, collabInviteActions, hireRejectChoiceActions, hireContinueAskActions };
}
