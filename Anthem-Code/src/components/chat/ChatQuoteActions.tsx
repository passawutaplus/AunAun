import * as React from "react";
import { Banknote, Check, FileText, Loader2, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import type { Conversation } from "@/hooks/useChat";
import {
  useAcceptRequest,
  useRejectRequest,
  useSendMessage,
} from "@/hooks/useChat";
import { useForwardHireRequest, type HiringRow } from "@/hooks/useHiringRequests";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/core/subscription/useSubscription";
import { useStudioForConversation, useStudioMembers } from "@/hooks/useStudios";
import { supabase } from "@/integrations/supabase/client";
import {
  canOpenStudioCombinedQuote,
  canShowStudioQuoteUpsell,
  openStudioQuotation,
} from "@/lib/studioQuotationHandoff";
import { StudioQuoteUpsellDialog } from "@/components/studio/StudioQuoteUpsellDialog";
import { ChatOfferDialog } from "@/components/chat/ChatOfferDialog";
import HireRejectDialog from "@/components/hiring/HireRejectDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isAplus1ChatOffersEnabled } from "@/lib/aplus1Launch";
import { hireForwardClientNotice, hireRejectReasonLabel } from "@/lib/hireBrief";
import { encodeHireForwardMessage } from "@/lib/hireForwardChat";
import { encodeHireRejectChoiceMessage } from "@/lib/hireRejectChat";

type Props = {
  conversation: Conversation;
};

function isHirePendingStatus(status: string | null | undefined) {
  return (
    !!status &&
    status !== "ตอบรับ" &&
    status !== "ปฏิเสธ" &&
    status !== "ปิดแล้ว" &&
    status !== "ยกเลิก"
  );
}

export function ChatQuoteActions({ conversation }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const chatOffersOn = isAplus1ChatOffersEnabled();
  const [upsellOpen, setUpsellOpen] = React.useState(false);
  const [offerOpen, setOfferOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);

  const acceptHire = useAcceptRequest();
  const rejectHire = useRejectRequest();
  const forwardHire = useForwardHireRequest();
  const sendMessage = useSendMessage();

  const isStudio = !!conversation.studio_id;
  const isHire = conversation.kind === "hire";
  const isFreelancer = !!user?.id && user.id === conversation.freelancer_id;

  const { data: studio } = useStudioForConversation(
    isStudio ? conversation.id : undefined,
    conversation.title || conversation.project_title,
  );
  const { data: members = [] } = useStudioMembers(studio?.id);
  const myRole = members.find((m) => m.user_id === conversation.freelancer_id)?.role;

  const { data: hireRow = null } = useQuery({
    queryKey: ["chat-hire-meta-panel", conversation.request_id],
    enabled: !!conversation.request_id && isHire,
    queryFn: async () => {
      const { data } = await supabase
        .from("hiring_requests")
        .select("*")
        .eq("id", conversation.request_id!)
        .maybeSingle();
      return (data ?? null) as HiringRow | null;
    },
  });

  const hireStatus = hireRow?.status ?? null;
  const hireAccepted = hireStatus === "ตอบรับ";
  const alreadyForwarded = !!(hireRow as { forwarded_to_user_id?: string | null } | null)
    ?.forwarded_to_user_id;
  const hireRejectReason = (hireRow as { reject_reason?: string | null } | null)?.reject_reason;
  const canRespond =
    isHire &&
    isFreelancer &&
    !!hireRow &&
    !alreadyForwarded &&
    !hireRejectReason &&
    isHirePendingStatus(hireStatus);

  const busy =
    acceptHire.isPending || rejectHire.isPending || forwardHire.isPending || sendMessage.isPending;

  const invalidateHire = () => {
    void qc.invalidateQueries({ queryKey: ["chat-hire-meta-panel", conversation.request_id] });
    void qc.invalidateQueries({ queryKey: ["chat-meta", "hire", conversation.request_id] });
    void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conversation.request_id] });
    void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conversation.request_id] });
    void qc.invalidateQueries({ queryKey: ["hiring-requests"] });
  };

  const handleAccept = async () => {
    if (!conversation.request_id || !conversation.client_id || !conversation.freelancer_id || !hireRow) {
      return;
    }
    try {
      await acceptHire.mutateAsync({
        kind: "hire",
        requestId: conversation.request_id,
        clientId: conversation.client_id,
        freelancerId: conversation.freelancer_id,
        projectId: conversation.project_id ?? null,
        projectTitle: conversation.project_title ?? hireRow.project_title,
      });
      try {
        await sendMessage.mutateAsync({
          conversationId: conversation.id,
          content: "ขอบคุณครับ/ค่ะ ยินดีรับงานและคุยรายละเอียดต่อได้เลย",
        });
      } catch {
        /* accept already succeeded */
      }
      invalidateHire();
      toast.success("ตอบรับแล้ว — คุยต่อได้เลย");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
    }
  };

  const openStudioQuote = async () => {
    if (!studio) {
      toast.error("ไม่พบข้อมูล Studio");
      return;
    }
    try {
      await openStudioQuotation({
        tier,
        studio,
        members,
        source: "chat_meta_panel",
        conversationId: conversation.id,
        requestId: conversation.request_id ?? undefined,
        projectTitle: conversation.project_title ?? studio.name,
        clientName: hireRow?.client_name ?? "ลูกค้า",
        clientEmail: hireRow?.email ?? undefined,
        clientPhone: hireRow?.phone ?? undefined,
        message: hireRow?.message ?? undefined,
        deadline: hireRow?.deadline ?? undefined,
        onRequireInHouse: () => setUpsellOpen(true),
      });
    } catch {
      toast.error("เปิด So1o ไม่สำเร็จ");
    }
  };

  if (isStudio && studio) {
    if (!chatOffersOn) return null;
    if (canOpenStudioCombinedQuote(tier, myRole)) {
      return (
        <>
          <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" onClick={() => void openStudioQuote()}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            ใบเสนอราคารวม Studio
          </Button>
          <StudioQuoteUpsellDialog
            open={upsellOpen}
            onOpenChange={setUpsellOpen}
            onUpgrade={() => navigate("/upgrade#tier-details")}
          />
        </>
      );
    }
    if (canShowStudioQuoteUpsell(tier, myRole)) {
      return (
        <>
          <Button type="button" variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setUpsellOpen(true)}>
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            ใบเสนอราคารวม Studio
          </Button>
          <StudioQuoteUpsellDialog
            open={upsellOpen}
            onOpenChange={setUpsellOpen}
            onUpgrade={() => navigate("/upgrade#tier-details")}
          />
        </>
      );
    }
    return null;
  }

  if (!isHire || !isFreelancer) return null;

  return (
    <>
      <div className="space-y-2 pt-1 border-t border-border">
        {canRespond && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">ตอบคำของานจ้าง</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                className="flex-1 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setRejectOpen(true)}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1" />}
                ปฏิเสธ
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                className="flex-1 rounded-xl bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                onClick={() => void handleAccept()}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                ยอมรับ
              </Button>
            </div>
          </div>
        )}

        {hireAccepted && (
          <p className="text-[11px] text-muted-foreground">ตอบรับแล้ว — คุยรายละเอียดต่อได้</p>
        )}
        {hireStatus === "ปฏิเสธ" && (
          <p className="text-[11px] text-muted-foreground">ปฏิเสธคำขอนี้แล้ว</p>
        )}

        {chatOffersOn && (
          <Button
            type="button"
            size="sm"
            className="w-full rounded-xl"
            disabled={!hireAccepted}
            title={
              hireAccepted
                ? "เสนอราคาในแชท"
                : hireStatus === "ปฏิเสธ"
                  ? "ปฏิเสธงานแล้ว — เสนอราคาไม่ได้"
                  : "ตอบรับงานก่อน จึงจะเสนอราคาได้"
            }
            onClick={() => {
              if (!hireAccepted) return;
              setOfferOpen(true);
            }}
          >
            <Banknote className="w-3.5 h-3.5 mr-1.5" />
            เสนอราคา
          </Button>
        )}
      </div>

      <ChatOfferDialog
        open={chatOffersOn && hireAccepted && offerOpen}
        onOpenChange={setOfferOpen}
        conversationId={conversation.id}
        defaultTitle={hireRow?.project_title ?? conversation.project_title ?? ""}
        defaultClientName={hireRow?.client_name ?? ""}
        defaultClientEmail={hireRow?.email ?? ""}
        defaultClientPhone={hireRow?.phone ?? ""}
      />

      <HireRejectDialog
        open={rejectOpen && !!hireRow}
        onOpenChange={setRejectOpen}
        request={hireRow}
        busy={busy}
        onConfirm={async ({ action, reason, note, friendNote, forwardToUserId, forwardToDisplayName }) => {
          if (!hireRow) return;
          try {
            if (action === "forward" && forwardToUserId) {
              const result = await forwardHire.mutateAsync({
                request: hireRow,
                toUserId: forwardToUserId,
                note: friendNote || null,
                rejectReason: reason,
                rejectNote: note || null,
              });
              const friendName = forwardToDisplayName?.trim() || "เพื่อนครีเอเตอร์";
              if (note.trim()) {
                await sendMessage.mutateAsync({ conversationId: conversation.id, content: note.trim() });
              }
              await sendMessage.mutateAsync({
                conversationId: conversation.id,
                content: hireForwardClientNotice(friendName),
              });
              await sendMessage.mutateAsync({
                conversationId: conversation.id,
                content: encodeHireForwardMessage({
                  v: 1,
                  requestId: result.newRequestId,
                  fromRequestId: result.fromRequestId,
                  toUserId: forwardToUserId,
                  toName: friendName,
                  toUsername: null,
                  toAvatarUrl: null,
                }),
              });
              invalidateHire();
              toast.success("ส่งต่องานแล้ว — แจ้งเพื่อนแล้ว");
              setRejectOpen(false);
              return;
            }

            if (action === "busy_chat") {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRow.id,
                reason,
                note: note || null,
                status: "ติดต่อแล้ว",
                postRejectChat: "open",
              });
              if (note.trim()) {
                await sendMessage.mutateAsync({ conversationId: conversation.id, content: note.trim() });
              } else {
                await sendMessage.mutateAsync({
                  conversationId: conversation.id,
                  content:
                    "สวัสดีครับ/ค่ะ — ตอนนี้ยังไม่พร้อมรับงานจากเวลาและงบที่แจ้งมา แต่อยากคุยรายละเอียดก่อนได้ครับ/ค่ะ",
                });
              }
              invalidateHire();
              toast.success("บันทึกแล้ว — คุยต่อในแชทได้");
              setRejectOpen(false);
              return;
            }

            const reasonText = note.trim() || hireRejectReasonLabel(reason);
            await rejectHire.mutateAsync({
              kind: "hire",
              requestId: hireRow.id,
              reason,
              note: note || null,
              status: "ปฏิเสธ",
              postRejectChat: "awaiting_client",
            });
            await sendMessage.mutateAsync({
              conversationId: conversation.id,
              content: encodeHireRejectChoiceMessage({
                v: 1,
                kind: "reject_choice",
                requestId: hireRow.id,
                reasonId: reason,
                reasonLabel: reasonText || hireRejectReasonLabel(reason) || "ปฏิเสธคำขอจ้าง",
                note: null,
              }),
            });
            invalidateHire();
            toast.success("ปฏิเสธแล้ว — รอผู้จ้างเลือกในแชท");
            setRejectOpen(false);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
          }
        }}
      />
    </>
  );
}
