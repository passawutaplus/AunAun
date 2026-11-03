import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChatOfferDialog } from "@/components/chat/ChatOfferDialog";
import HireForwardInChatDialog from "@/components/chat/HireForwardInChatDialog";
import HireOrderDetailDialog from "@/components/hire/HireOrderDetailDialog";
import HireRejectDialog from "@/components/hiring/HireRejectDialog";
import HireCancelRequestDialog from "@/components/hiring/HireCancelRequestDialog";
import type {
  Conversation,
  usePostChatSystemEvent,
  useRejectRequest,
  useSendMessage,
} from "@/hooks/useChat";
import type { useForwardHireRequest, HiringRow } from "@/hooks/useHiringRequests";
import type { useEditHireCancelRequest, useSubmitHireCancelRequest } from "@/hooks/useHireCancelRequest";
import {
  encodeHireCancelCardMessage,
  type HireCancelInitiatedBy,
  type HireCancelRequestRow,
} from "@/lib/hireCancelRequest";
import { encodeHireForwardMessage } from "@/lib/hireForwardChat";
import { hireForwardClientNotice, hireRejectReasonLabel } from "@/lib/hireBrief";
import { encodeHireRejectChoiceMessage } from "@/lib/hireRejectChat";
import type { OfferPartyInfo } from "@/lib/chatOffer";

type HireMeta = {
  client_name?: string | null;
  email?: string | null;
  phone?: string | null;
  deadline?: string | null;
  project_title?: string | null;
} | null | undefined;

type OtherProfile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
} | null | undefined;

type Props = {
  conv: Conversation;
  userId: string | undefined;
  isClient: boolean;
  other: OtherProfile;
  hireRequestRow: HiringRow | null;
  hireMeta: HireMeta;
  defaultClientParty: OfferPartyInfo | null;
  hireRespondBusy: boolean;
  hireCancelInitiatedBy: HireCancelInitiatedBy;
  hireCancelOrderAmountThb: number | null;
  chatOffersOn: boolean;
  offerOpen: boolean;
  setOfferOpen: (open: boolean) => void;
  orderDetailOpen: boolean;
  setOrderDetailOpen: (open: boolean) => void;
  orderDetailOrderId: string | null;
  setOrderDetailOrderId: (id: string | null) => void;
  forwardOpen: boolean;
  setForwardOpen: (open: boolean) => void;
  rejectOpen: boolean;
  setRejectOpen: (open: boolean) => void;
  hireCancelDialogOpen: boolean;
  setHireCancelDialogOpen: (open: boolean) => void;
  hireCancelEditRow: HireCancelRequestRow | null;
  setHireCancelEditRow: (row: HireCancelRequestRow | null) => void;
  forwardHire: ReturnType<typeof useForwardHireRequest>;
  rejectHire: ReturnType<typeof useRejectRequest>;
  sendMessage: ReturnType<typeof useSendMessage>;
  submitHireCancel: ReturnType<typeof useSubmitHireCancelRequest>;
  editHireCancel: ReturnType<typeof useEditHireCancelRequest>;
  postSystemEvent: ReturnType<typeof usePostChatSystemEvent>;
  qc: QueryClient;
};

/** Hire-request lifecycle dialogs of a chat thread: offer, order detail, forward, reject, cancel. */
export function ChatHireDialogs({
  conv,
  userId,
  isClient,
  other,
  hireRequestRow,
  hireMeta,
  defaultClientParty,
  hireRespondBusy,
  hireCancelInitiatedBy,
  hireCancelOrderAmountThb,
  chatOffersOn,
  offerOpen,
  setOfferOpen,
  orderDetailOpen,
  setOrderDetailOpen,
  orderDetailOrderId,
  setOrderDetailOrderId,
  forwardOpen,
  setForwardOpen,
  rejectOpen,
  setRejectOpen,
  hireCancelDialogOpen,
  setHireCancelDialogOpen,
  hireCancelEditRow,
  setHireCancelEditRow,
  forwardHire,
  rejectHire,
  sendMessage,
  submitHireCancel,
  editHireCancel,
  postSystemEvent,
  qc,
}: Props) {
  /** Forward the request to another creator and post the client notice + forward card. */
  const forwardHireTo = async (pick: {
    toUserId: string;
    toName: string;
    toUsername: string | null;
    toAvatarUrl: string | null;
    friendNote: string | null;
    rejectReason: string;
    clientMessage: string;
  }) => {
    if (!hireRequestRow) return;
    const result = await forwardHire.mutateAsync({
      request: hireRequestRow,
      toUserId: pick.toUserId,
      note: pick.friendNote,
      rejectReason: pick.rejectReason,
      rejectNote: pick.clientMessage || null,
    });
    if (pick.clientMessage.trim()) {
      await sendMessage.mutateAsync({ conversationId: conv.id, content: pick.clientMessage.trim() });
    }
    await sendMessage.mutateAsync({
      conversationId: conv.id,
      content: hireForwardClientNotice(pick.toName),
    });
    await sendMessage.mutateAsync({
      conversationId: conv.id,
      content: encodeHireForwardMessage({
        v: 1,
        requestId: result.newRequestId,
        fromRequestId: result.fromRequestId,
        toUserId: pick.toUserId,
        toName: pick.toName,
        toUsername: pick.toUsername,
        toAvatarUrl: pick.toAvatarUrl,
      }),
    });
    void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
    void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
  };

  return (
    <>
      <ChatOfferDialog
        open={chatOffersOn && offerOpen}
        onOpenChange={(v) => {
          setOfferOpen(v);
          if (!v) {
            void qc.invalidateQueries({ queryKey: ["chat-hire-latest-quote", conv.request_id] });
            void qc.invalidateQueries({ queryKey: ["hire-accounting-chat-hint", conv.id] });
          }
        }}
        conversationId={conv.id}
        hiringRequestId={conv.request_id ?? null}
        defaultTitle={hireMeta?.project_title ?? conv.project_title ?? ""}
        defaultClientName={hireMeta?.client_name ?? ""}
        defaultClientEmail={hireMeta?.email ?? ""}
        defaultClientPhone={hireMeta?.phone ?? ""}
        defaultClientParty={defaultClientParty}
      />
      <HireOrderDetailDialog
        open={orderDetailOpen}
        onOpenChange={(v) => {
          setOrderDetailOpen(v);
          if (!v) setOrderDetailOrderId(null);
        }}
        conversation={conv}
        projectTitle={conv.project_title ?? hireRequestRow?.project_title ?? null}
        deadline={hireMeta?.deadline ?? null}
        orderId={orderDetailOrderId}
        onCancelOrder={() => {
          setOrderDetailOpen(false);
          setHireCancelEditRow(null);
          setHireCancelDialogOpen(true);
        }}
        partner={
          other
            ? {
                name: other.display_name || other.username || "ผู้ใช้",
                avatarUrl: other.avatar_url,
                role: other.role ?? null,
              }
            : null
        }
      />
      <HireForwardInChatDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        busy={forwardHire.isPending || sendMessage.isPending}
        projectTitle={conv.project_title ?? hireRequestRow?.project_title}
        onConfirm={async (pick) => {
          if (!hireRequestRow || !userId) return;
          try {
            await forwardHireTo({
              toUserId: pick.userId,
              toName: pick.displayName,
              toUsername: pick.username,
              toAvatarUrl: pick.avatarUrl,
              friendNote: pick.note || null,
              rejectReason: pick.reason,
              clientMessage: pick.clientMessage,
            });
            toast.success("ส่งต่องานแล้ว — แจ้งเพื่อนแล้ว (ส่งต่อคนอื่นได้จากปุ่มส่งต่อ)");
            setForwardOpen(false);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ส่งต่องานไม่สำเร็จ");
          }
        }}
      />
      <HireRejectDialog
        open={rejectOpen && !!hireRequestRow}
        onOpenChange={setRejectOpen}
        request={hireRequestRow}
        busy={hireRespondBusy}
        onConfirm={async ({ action, reason, note, friendNote, forwardToUserId, forwardToDisplayName }) => {
          if (!hireRequestRow) return;
          try {
            if (action === "forward" && forwardToUserId) {
              await forwardHireTo({
                toUserId: forwardToUserId,
                toName: forwardToDisplayName?.trim() || "เพื่อนครีเอเตอร์",
                toUsername: null,
                toAvatarUrl: null,
                friendNote: friendNote || null,
                rejectReason: reason,
                clientMessage: note,
              });
              toast.success("ส่งต่องานแล้ว — แจ้งเพื่อนแล้ว");
              setRejectOpen(false);
              return;
            }

            if (action === "busy_chat") {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason,
                note: note || null,
                status: "ติดต่อแล้ว",
                postRejectChat: "open",
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content:
                  note ||
                  "สวัสดีครับ/ค่ะ — ตอนนี้ยังไม่พร้อมรับงานจากเวลาและงบที่แจ้งมา แต่อยากคุยรายละเอียดก่อนได้ครับ/ค่ะ",
              });
              void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
              toast.success("บันทึกแล้ว — คุยต่อได้เลย");
              setRejectOpen(false);
              return;
            }

            const reasonText = note.trim() || hireRejectReasonLabel(reason);
            await rejectHire.mutateAsync({
              kind: "hire",
              requestId: hireRequestRow.id,
              reason,
              note: note || null,
              status: "ปฏิเสธ",
              postRejectChat: "awaiting_client",
            });
            await sendMessage.mutateAsync({
              conversationId: conv.id,
              content: encodeHireRejectChoiceMessage({
                v: 1,
                kind: "reject_choice",
                requestId: hireRequestRow.id,
                reasonId: reason,
                reasonLabel: reasonText || hireRejectReasonLabel(reason) || "ปฏิเสธคำขอจ้าง",
                note: null,
              }),
            });
            void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
            void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
            toast.success("ปฏิเสธคำขอแล้ว — รอผู้จ้างเลือก");
            setRejectOpen(false);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
          }
        }}
      />
      <HireCancelRequestDialog
        open={hireCancelDialogOpen}
        onOpenChange={(open) => {
          setHireCancelDialogOpen(open);
          if (!open) setHireCancelEditRow(null);
        }}
        mode={hireCancelEditRow ? "edit" : "create"}
        initiatedBy={hireCancelEditRow?.initiated_by ?? hireCancelInitiatedBy}
        existing={hireCancelEditRow}
        busy={submitHireCancel.isPending || editHireCancel.isPending}
        orderAmountThb={hireCancelOrderAmountThb}
        defaultContactPhone={
          hireCancelInitiatedBy === "client"
            ? defaultClientParty?.phone || hireMeta?.phone || null
            : null
        }
        defaultContactEmail={
          hireCancelInitiatedBy === "client"
            ? defaultClientParty?.email || hireMeta?.email || null
            : null
        }
        onSubmit={async ({ reasonId, reasonNote, moneyTerms, evidenceUrls }) => {
          if (!conv.request_id || !userId) return;
          const otherUserId = isClient ? conv.freelancer_id : conv.client_id;
          try {
            if (hireCancelEditRow) {
              const updated = await editHireCancel.mutateAsync({
                row: hireCancelEditRow,
                userId,
                reasonId,
                reasonNote,
                moneyTerms,
                evidenceUrls,
                otherUserId: otherUserId || "",
                conversationId: conv.id,
              });
              await postSystemEvent.mutateAsync({
                conversationId: conv.id,
                event: "hire_cancel_edited",
                refId: hireCancelEditRow.id,
              });
              void updated;
              toast.success("บันทึกการแก้ไขแล้ว");
            } else {
              const row = await submitHireCancel.mutateAsync({
                hiringRequestId: conv.request_id,
                conversationId: conv.id,
                initiatedBy: hireCancelInitiatedBy,
                initiatorId: userId,
                otherUserId: otherUserId || "",
                reasonId,
                reasonNote,
                moneyTerms,
                evidenceUrls,
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: encodeHireCancelCardMessage({
                  v: 1,
                  kind: "hire_cancel",
                  cancelRequestId: row.id,
                  hiringRequestId: conv.request_id,
                }),
              });
              toast.success("ส่งคำขอยกเลิกแล้ว — รออีกฝ่ายตอบภายใน 48 ชม.");
            }
            setHireCancelDialogOpen(false);
            setHireCancelEditRow(null);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ");
          }
        }}
      />
    </>
  );
}
