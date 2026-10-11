import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Mail,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HireOrderDetailContent, HireSectionHeading, HireSectionRule } from "@/components/hire/HireOrderDetailDialog";
import HireCancelRequestDialog from "@/components/hiring/HireCancelRequestDialog";
import { HireInviteFieldList } from "@/components/hiring/HireInviteFieldList";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation } from "@/hooks/useChat";
import { useFindConversationByRequest, useSendMessage } from "@/hooks/useChat";
import {
  hireOrderWorkHasStarted,
  useHireOrderByRequest,
} from "@/hooks/useHireOrderFlow";
import { useSubmitHireCancelRequest } from "@/hooks/useHireCancelRequest";
import type { HiringRow } from "@/hooks/useHiringRequests";
import { parseChatOffer, type ChatOfferPayload } from "@/lib/chatOffer";
import {
  formatHireBudgetLabel,
  formatHireDeadlineLabel,
  hireInviteDisplay,
} from "@/lib/hireBrief";
import { encodeHireCancelCardMessage } from "@/lib/hireCancelRequest";
import { parseHirePaidMessage, parseLegacyHirePaidText } from "@/lib/hirePaymentChat";
import {
  canCompleteHireStatus,
  isContactedNewStatus,
  isHireCompletedStatus,
  isHireTerminalStatus,
  labelHireStatus,
} from "@/lib/hiringStatus";
import { satangToThb } from "@/lib/payments/fees";
import { timeAgoTH } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

type RefInfo = {
  title: string;
  coverUrl: string | null;
  label: string;
  to: string | null;
};

type Props = {
  request: HiringRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refInfo: RefInfo | null;
  extras?: ReactNode;
  busy?: boolean;
  onOpenChat: () => void;
  onDecline?: () => void;
  onComplete: () => void;
  onReview: () => void;
};

export default function HireRequestMasterDialog({
  request,
  open,
  onOpenChange,
  refInfo,
  extras,
  busy = false,
  onOpenChat,
  onComplete,
  onReview,
}: Props) {
  const { user } = useAuth();
  const findConv = useFindConversationByRequest();
  const sendMessage = useSendMessage();
  const submitHireCancel = useSubmitHireCancelRequest();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: convId } = useQuery({
    queryKey: ["hire-master-conv", request?.id],
    enabled: open && !!request?.id,
    queryFn: () => findConv("hire", request!.id),
  });
  const { data: order } = useHireOrderByRequest(open ? request?.id : undefined);

  const { data: chatPaidHint } = useQuery({
    queryKey: ["hire-accounting-chat-hint", convId],
    enabled: open && !!convId && !hireOrderWorkHasStarted(order?.status),
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", convId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      let offer: ChatOfferPayload | null = null;
      let paidThb = 0;
      for (const row of data ?? []) {
        const content = (row as { content?: string | null }).content;
        if (!offer) {
          const parsed = parseChatOffer(content);
          if (parsed) offer = parsed;
        }
        if (!paidThb) {
          const paid = parseHirePaidMessage(content) || parseLegacyHirePaidText(content);
          if (paid) paidThb = paid.paidAmountThb || paid.offerAmountThb || 0;
        }
        if (offer && paidThb) break;
      }
      return { offer, paidThb };
    },
  });

  const workStarted =
    hireOrderWorkHasStarted(order?.status) || (chatPaidHint?.paidThb ?? 0) > 0;

  const cancelAmountThb = useMemo(() => {
    if (order?.job_price_satang) return satangToThb(order.job_price_satang);
    const fromOffer = Number(chatPaidHint?.offer?.amount);
    if (Number.isFinite(fromOffer) && fromOffer > 0) return fromOffer;
    const budget = Number(request?.budget_amount);
    return Number.isFinite(budget) && budget > 0 ? budget : 0;
  }, [order?.job_price_satang, chatPaidHint?.offer?.amount, request?.budget_amount]);

  if (!request) return null;

  const forwarded = !!(request as { forwarded_to_user_id?: string | null }).forwarded_to_user_id;
  const canChat = !isHireTerminalStatus(request.status) || isContactedNewStatus(request.status);
  const canCancelWork = !forwarded && !isHireTerminalStatus(request.status) && workStarted;
  const canComplete = !forwarded && canCompleteHireStatus(request.status) && !workStarted;
  const canReview = !forwarded && isHireCompletedStatus(request.status);
  const budgetLabel = formatHireBudgetLabel({
    budget_min: (request as { budget_min?: number | null }).budget_min,
    budget_max: (request as { budget_max?: number | null }).budget_max,
    budget_amount: request.budget_amount,
    budget: request.budget as string | null,
  });
  const deadlineLabel = formatHireDeadlineLabel(request.deadline);
  const brief = hireInviteDisplay({
    message: request.message,
    job_type: (request as { job_type?: string | null }).job_type,
    attachment_urls: (request as { attachment_urls?: string[] | null }).attachment_urls,
  });
  const conversation = {
    id: convId || "",
    request_id: request.id,
    project_title: request.project_title,
    kind: "hire",
    freelancer_id: request.freelancer_id,
    client_id: request.client_id,
  } as Conversation;

  const submitCancel = async ({
    reasonId,
    reasonNote,
    moneyTerms,
    evidenceUrls,
  }: {
    reasonId: string;
    reasonNote: string;
    moneyTerms: Parameters<typeof submitHireCancel.mutateAsync>[0]["moneyTerms"];
    evidenceUrls: string[];
  }) => {
    if (!user?.id || !convId) {
      toast.error("เปิดแชทก่อน แล้วขอยกเลิกจากรายละเอียดงานได้");
      return;
    }
    const otherUserId = request.client_id;
    if (!otherUserId) {
      toast.error("ไม่พบลูกค้าสำหรับคำขอนี้");
      return;
    }
    try {
      const row = await submitHireCancel.mutateAsync({
        hiringRequestId: request.id,
        conversationId: convId,
        initiatedBy: "freelancer",
        initiatorId: user.id,
        otherUserId,
        reasonId,
        reasonNote,
        moneyTerms,
        evidenceUrls,
      });
      await sendMessage.mutateAsync({
        conversationId: convId,
        content: encodeHireCancelCardMessage({
          v: 1,
          kind: "hire_cancel",
          cancelRequestId: row.id,
          hiringRequestId: request.id,
        }),
      });
      toast.success("ส่งคำขอยกเลิกแล้ว — รออีกฝ่ายตอบภายใน 48 ชม.");
      setCancelOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[hsl(var(--chat-hire))] flex items-center justify-center shrink-0 text-[hsl(var(--chat-hire-foreground))] font-medium text-sm">
                {request.client_name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base truncate">{request.client_name}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {labelHireStatus(request.status)}
                  </Badge>
                  {budgetLabel ? (
                    <Badge variant="outline" className="text-[10px]">
                      งบ {budgetLabel}
                    </Badge>
                  ) : null}
                  {deadlineLabel ? (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {deadlineLabel}
                    </Badge>
                  ) : null}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {refInfo?.title ? (
              <ProjectReferencePreview
                title={refInfo.title}
                coverUrl={refInfo.coverUrl}
                label={refInfo.label}
                to={refInfo.to}
              />
            ) : null}

            <section className="space-y-1.5">
              <HireSectionHeading icon={ClipboardList}>รายละเอียดคำขอ</HireSectionHeading>
              <HireInviteFieldList
                jobTypesLabel={brief.jobTypesLabel}
                details={brief.details}
                links={brief.links}
                attachments={brief.attachments}
                budgetLabel={budgetLabel ?? brief.budgetLabel}
                deadlineLabel={deadlineLabel ?? brief.deadlineLabel}
              />
            </section>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>⏱ {timeAgoTH(request.created_at)}</span>
              {request.email ? (
                <a href={`mailto:${request.email}`} className="flex items-center gap-1 hover:text-[hsl(var(--chat-hire))]">
                  <Mail className="w-3 h-3" />
                  {request.email}
                </a>
              ) : null}
              {request.phone ? (
                <a href={`tel:${request.phone}`} className="flex items-center gap-1 hover:text-[hsl(var(--chat-hire))]">
                  <Phone className="w-3 h-3" />
                  {request.phone}
                </a>
              ) : null}
            </div>

            {extras}

            <HireSectionRule />

            <HireOrderDetailContent
              conversation={conversation}
              deadline={request.deadline}
              partner={{ name: request.client_name }}
              showActions={!!convId}
            />

            <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-border/60">
              {canCancelWork ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || submitHireCancel.isPending}
                  onClick={() => setCancelOpen(true)}
                  className="rounded-full h-8 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Ban className="w-3.5 h-3.5" /> ขอยกเลิกงาน
                </Button>
              ) : null}
              {canComplete ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={onComplete}
                  className="rounded-full h-8 text-xs gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> จบงาน
                </Button>
              ) : null}
              {canReview ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReview}
                  className="rounded-full h-8 text-xs gap-1"
                >
                  <Star className="w-3.5 h-3.5" /> เขียนรีวิว
                </Button>
              ) : null}
              {canChat ? (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={onOpenChat}
                  className="rounded-full h-8 text-xs bg-[hsl(var(--chat-hire))] text-[hsl(var(--chat-hire-foreground))] hover:opacity-90"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> เปิดแชท
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={onOpenChat}
                  className="rounded-full h-8 text-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" /> ดูแชท
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HireCancelRequestDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        mode="create"
        initiatedBy="freelancer"
        busy={submitHireCancel.isPending || sendMessage.isPending}
        orderAmountThb={cancelAmountThb}
        onSubmit={submitCancel}
      />
    </>
  );
}
