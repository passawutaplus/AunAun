import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Ban,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import HireWorkSubmitDialog from "@/components/hire/HireWorkSubmitDialog";
import {
  isHireOrderActive,
  labelHireOrderStatus,
  useHireDeliveries,
  useHireOrderById,
  useHireOrderByRequest,
  useHireOrderDocuments,
  useHireOrdersByRequest,
  useHireQuoteById,
  type HireDocumentRow,
  type HireOrderRow,
} from "@/hooks/useHireOrderFlow";
import type { Conversation } from "@/hooks/useChat";
import type { HireOrderStatus } from "@/lib/payments/types";
import { docKindLabelTh } from "@/lib/documents/numbering";
import { buildHireAccountingMockup } from "@/lib/documents/hireAccountingMockup";
import { formatOfferAmount, parseChatOffer, type ChatOfferPayload } from "@/lib/chatOffer";
import { parseHirePaidMessage, parseLegacyHirePaidText } from "@/lib/hirePaymentChat";
import { satangToThb } from "@/lib/payments/fees";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Partner = {
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  projectTitle?: string | null;
  deadline?: string | null;
  partner?: Partner | null;
  /** When set, show this order (from a card). Otherwise latest for the request. */
  orderId?: string | null;
  /** Open the cancel-request dialog for this order (wired by ChatThreadView). */
  onCancelOrder?: (orderId: string | null) => void;
};

type ContentProps = {
  conversation: Conversation;
  deadline?: string | null;
  partner?: Partner | null;
  orderId?: string | null;
  showDeadline?: boolean;
  showPartner?: boolean;
  /** Compact mode for side panel — hide action buttons if false. */
  showActions?: boolean;
  onCancelOrder?: (orderId: string | null) => void;
};

const PAID_STATUSES: HireOrderStatus[] = [
  "deposit_paid",
  "paid_pending",
  "in_progress",
  "awaiting_approval",
  "available",
];

const DOC_ORDER: HireDocumentRow["kind"][] = [
  "quotation",
  "invoice",
  "receipt",
  "platform_fee_receipt",
];

function orderCodeFromId(id: string | null | undefined): string {
  if (!id) return "—";
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function paymentStatusLabel(order: HireOrderRow | null | undefined): {
  text: string;
  className: string;
} {
  if (!order) return { text: "—", className: "text-muted-foreground" };
  switch (order.status) {
    case "deposit_paid":
      return {
        text: `ชำระมัดจำแล้ว${order.deposit_percent != null ? ` (${order.deposit_percent}%)` : ""}`,
        className: "text-emerald-600 dark:text-emerald-400",
      };
    case "paid_pending":
    case "in_progress":
    case "awaiting_approval":
    case "available":
      return {
        text: "ชำระเงินแล้ว",
        className: "text-emerald-600 dark:text-emerald-400",
      };
    case "awaiting_payment":
    case "draft":
      return { text: "รอชำระเงิน", className: "text-amber-600 dark:text-amber-400" };
    case "refunded":
      return { text: "คืนเงินแล้ว", className: "text-muted-foreground" };
    case "partially_refunded":
      return { text: "คืนเงินบางส่วน", className: "text-amber-600 dark:text-amber-400" };
    case "cancelled":
      return { text: "ยกเลิกแล้ว", className: "text-destructive" };
    case "disputed":
      return { text: "ข้อพิพาท", className: "text-amber-600 dark:text-amber-400" };
    case "failed":
      return { text: "ชำระไม่สำเร็จ", className: "text-destructive" };
    default:
      return { text: labelHireOrderStatus(order.status), className: "text-muted-foreground" };
  }
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right min-w-0">{children}</span>
    </div>
  );
}

/** Order tracking sections — reused by the dialog and the chat meta panel. */
export function HireOrderDetailContent({
  conversation,
  deadline,
  partner,
  orderId: orderIdProp,
  showDeadline = true,
  showPartner = true,
  showActions = true,
  onCancelOrder,
}: ContentProps) {
  const { user } = useAuth();
  const { data: latestByRequest } = useHireOrderByRequest(
    orderIdProp ? undefined : conversation.request_id ?? undefined,
  );
  const { data: byId } = useHireOrderById(orderIdProp ?? undefined);
  const order = orderIdProp ? byId ?? null : latestByRequest ?? null;

  const { data: orders = [] } = useHireOrdersByRequest(conversation.request_id ?? undefined);
  const { data: deliveries = [] } = useHireDeliveries(order?.id);
  const { data: documents = [] } = useHireOrderDocuments(order?.id);
  const { data: quote } = useHireQuoteById(order?.quote_id);
  const [copied, setCopied] = useState(false);
  const [viewDoc, setViewDoc] = useState<HireDocumentRow | null>(null);
  const [showWork, setShowWork] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const viewingOrder =
    selectedHistoryId && orders.find((o) => o.id === selectedHistoryId)
      ? orders.find((o) => o.id === selectedHistoryId)!
      : order;

  const { data: viewingDocs = [] } = useHireOrderDocuments(
    selectedHistoryId && selectedHistoryId !== order?.id ? selectedHistoryId : order?.id,
  );
  const { data: viewingQuote } = useHireQuoteById(
    selectedHistoryId && selectedHistoryId !== order?.id
      ? viewingOrder?.quote_id
      : order?.quote_id,
  );

  const activeOrder = selectedHistoryId ? viewingOrder : order;
  const activeDocs = selectedHistoryId && selectedHistoryId !== order?.id ? viewingDocs : documents;
  const activeQuote = selectedHistoryId && selectedHistoryId !== order?.id ? viewingQuote : quote;

  /** When DB order/docs missing, rebuild a full Thai accounting mock from chat offer + paid. */
  const { data: chatAccountingHint } = useQuery({
    queryKey: ["hire-accounting-chat-hint", conversation.id],
    enabled: !!conversation.id && (!order || documents.length === 0),
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      let offer: ChatOfferPayload | null = null;
      let paidThb = 0;
      let paidAt: string | null = null;
      for (const row of data ?? []) {
        const content = (row as { content?: string | null }).content;
        const createdAt = (row as { created_at?: string }).created_at ?? null;
        if (!offer) {
          const parsed = parseChatOffer(content);
          if (parsed) offer = parsed;
        }
        if (!paidThb) {
          const paid = parseHirePaidMessage(content) || parseLegacyHirePaidText(content);
          if (paid) {
            paidThb = paid.paidAmountThb || 0;
            paidAt = createdAt;
          }
        }
        if (offer && paidThb) break;
      }
      return { offer, paidThb, paidAt };
    },
  });

  const accountingMock = useMemo(() => {
    if (activeOrder && activeDocs.length > 0) return null;
    const offer = chatAccountingHint?.offer;
    if (!offer) return null;
    return buildHireAccountingMockup({
      offer,
      paidAmountThb: chatAccountingHint?.paidThb || 0,
      orderCodeSeed: conversation.request_id,
      partnerName: partner?.name,
      paymentMethod: "promptpay",
      paidAt: chatAccountingHint?.paidAt,
    });
  }, [
    activeOrder,
    activeDocs.length,
    chatAccountingHint,
    conversation.request_id,
    partner?.name,
  ]);

  const { data: sourceProject } = useQuery({
    queryKey: ["hire-source-project", conversation.request_id],
    enabled: !!conversation.request_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("hiring_requests")
        .select("project_id, project_title")
        .eq("id", conversation.request_id!)
        .maybeSingle();
      if (!data?.project_id) {
        return {
          id: null as string | null,
          title: (data?.project_title as string | null) ?? null,
        };
      }
      const { data: proj } = await supabase
        .from("projects")
        .select("id, title, cover_url")
        .eq("id", data.project_id as string)
        .maybeSingle();
      return {
        id: (proj?.id as string) ?? (data.project_id as string),
        title: (proj?.title as string) ?? (data.project_title as string) ?? null,
        cover: (proj as { cover_url?: string | null } | null)?.cover_url ?? null,
      };
    },
  });

  const orderCode =
    accountingMock?.payment.orderCode ||
    orderCodeFromId(activeOrder?.id || conversation.request_id);
  const livePay = paymentStatusLabel(activeOrder);
  const pay = accountingMock
    ? {
        text: accountingMock.payment.statusLabel,
        className: accountingMock.payment.statusClassName,
      }
    : livePay;
  const deadlineLabel = useMemo(() => {
    if (!deadline) return "—";
    try {
      return format(new Date(deadline), "dd/MM/yyyy", { locale: th });
    } catch {
      return deadline;
    }
  }, [deadline]);

  const displayDocs = activeDocs.length > 0 ? activeDocs : accountingMock?.documents ?? [];
  const sortedDocs = useMemo(
    () =>
      [...displayDocs].sort((a, b) => DOC_ORDER.indexOf(a.kind) - DOC_ORDER.indexOf(b.kind)),
    [displayDocs],
  );

  const quoteNumber =
    activeQuote?.doc_number ||
    (activeQuote?.payload as { number?: string } | null)?.number ||
    accountingMock?.payment.quoteNumber ||
    null;

  const timelineOffer = useMemo(() => {
    const p = activeQuote?.payload;
    if (!p) return null;
    return {
      startDate: p.startDate ?? null,
      endDate: p.endDate ?? null,
      dueDate: p.dueDate ?? null,
      milestones: p.milestones ?? [],
      showFullTimeline: p.showFullTimeline,
      depositPercent: p.depositPercent ?? activeQuote?.deposit_percent ?? undefined,
      depositDueDate: p.depositDueDate ?? null,
    };
  }, [activeQuote]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(orderCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  const downloadDoc = (doc: HireDocumentRow) => {
    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
    } else {
      setViewDoc(doc);
      toast.info(
        doc.id.startsWith("mock-")
          ? "เอกสารตัวอย่าง (mock) — กด Ctrl/⌘+P เพื่อบันทึกเป็น PDF"
          : "กด Ctrl/⌘+P เพื่อบันทึกเป็น PDF",
      );
    }
  };

  const deliveryLinks = deliveries.flatMap((d) => d.links ?? []);
  const isBuyer = !!user?.id && activeOrder?.buyer_id === user.id;
  const isSeller = !!user?.id && activeOrder?.seller_id === user.id;
  const canSubmit =
    showActions &&
    isSeller &&
    !!activeOrder &&
    ["paid_pending", "deposit_paid", "in_progress"].includes(activeOrder.status);
  const canCancel =
    showActions &&
    !!onCancelOrder &&
    !!activeOrder &&
    isHireOrderActive(activeOrder.status) &&
    (isBuyer || isSeller);

  return (
    <>
      <div className="space-y-4">
        <section className="space-y-0.5">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold">รายละเอียดออเดอร์</h3>
            {accountingMock ? (
              <Badge variant="outline" className="text-[10px] font-normal text-amber-700 dark:text-amber-400 border-amber-500/40">
                เอกสารตัวอย่าง
              </Badge>
            ) : null}
          </div>
          <div className="divide-y divide-border/60">
            <DetailRow label="สถานะ">
              <Badge variant="secondary" className="text-[10px] font-normal">
                {activeOrder
                  ? labelHireOrderStatus(activeOrder.status)
                  : accountingMock?.payment.orderStatusLabel || "ยังไม่มีออเดอร์"}
              </Badge>
            </DetailRow>
            <DetailRow label="เลขคำสั่งซื้อ">
              <button
                type="button"
                onClick={() => void copyCode()}
                className="inline-flex items-center gap-1.5 tabular-nums hover:text-primary"
              >
                {orderCode}
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 opacity-70" />
                )}
              </button>
            </DetailRow>
            {quoteNumber ? (
              <DetailRow label="เลขใบเสนอราคา">
                <span className="tabular-nums">{quoteNumber}</span>
              </DetailRow>
            ) : null}
            {activeOrder ? (
              <>
                <DetailRow label="ราคารวมสุทธิ">
                  <span className="text-[hsl(var(--chat-hire))]">
                    {formatOfferAmount(satangToThb(activeOrder.job_price_satang))}
                  </span>
                </DetailRow>
                <DetailRow label="ยอดชำระสุทธิ">
                  <span className="text-[hsl(var(--chat-hire))]">
                    {formatOfferAmount(satangToThb(activeOrder.buyer_pays_satang))}
                  </span>
                </DetailRow>
                {(activeOrder.balance_due_satang ?? 0) > 0 ? (
                  <DetailRow label="ยอดคงเหลือ">
                    {formatOfferAmount(satangToThb(activeOrder.balance_due_satang ?? 0))}
                  </DetailRow>
                ) : null}
              </>
            ) : accountingMock ? (
              <>
                <DetailRow label="มูลค่างานทั้งสัญญา">
                  <span className="text-[hsl(var(--chat-hire))]">
                    {formatOfferAmount(accountingMock.payment.jobPriceThb)}
                  </span>
                </DetailRow>
                <DetailRow label={accountingMock.payment.isDeposit ? "มัดจำที่ชำระแล้ว" : "ยอดที่ชำระแล้ว"}>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {formatOfferAmount(accountingMock.payment.paidThb)}
                    {accountingMock.payment.isDeposit
                      ? ` (${accountingMock.payment.depositPercent}%)`
                      : ""}
                  </span>
                </DetailRow>
                {accountingMock.payment.balanceThb > 0 ? (
                  <DetailRow label="ยอดคงเหลือ">
                    {formatOfferAmount(accountingMock.payment.balanceThb)}
                  </DetailRow>
                ) : null}
                <DetailRow label="วิธีชำระ">{accountingMock.payment.methodLabel}</DetailRow>
                <DetailRow label="วันที่ชำระ">{accountingMock.payment.paidAtLabel}</DetailRow>
              </>
            ) : null}
            {showDeadline ? (
              <DetailRow label="กำหนดส่งงาน">{deadlineLabel}</DetailRow>
            ) : null}
            <DetailRow label="สถานะการชำระเงิน">
              <span className={cn("font-semibold", pay.className)}>{pay.text}</span>
            </DetailRow>
            {activeOrder && (activeOrder.wht_satang ?? 0) > 0 ? (
              <DetailRow label="หัก ณ ที่จ่าย">
                {formatOfferAmount(satangToThb(activeOrder.wht_satang ?? 0))}
                {activeOrder.wht_status === "complete"
                  ? " · 50 ทวิ ครบ"
                  : activeOrder.wht_status === "awaiting_cert"
                    ? " · รอ 50 ทวิ"
                    : ""}
              </DetailRow>
            ) : null}
          </div>
        </section>

        {sourceProject?.title || sourceProject?.id ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold mb-1">มาจากผลงาน</h3>
            {sourceProject.id ? (
              <Link
                to={`/project/${sourceProject.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-2.5 hover:bg-muted/50 transition-colors"
              >
                {sourceProject.cover ? (
                  <img
                    src={sourceProject.cover}
                    alt=""
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{sourceProject.title || "ผลงาน"}</p>
                  <p className="text-[11px] text-muted-foreground">กดจ้างจากผลงานนี้</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{sourceProject.title}</p>
            )}
          </section>
        ) : null}

        {timelineOffer &&
        (timelineOffer.showFullTimeline !== false ||
          timelineOffer.endDate ||
          timelineOffer.dueDate) ? (
          <section className="space-y-1">
            <ChatOfferTimeline
              offer={timelineOffer}
              compact
              title={
                timelineOffer.showFullTimeline === false ? "วันส่งมอบ" : "ไทม์ไลน์งาน"
              }
            />
          </section>
        ) : null}

        {deliveryLinks.length > 0 ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setShowWork((v) => !v)}
            >
              <Package className="w-4 h-4 mr-1.5" />
              {showWork ? "ซ่อนงานที่ส่ง" : "ดูงานที่ส่ง"}
            </Button>
            {showWork ? (
              <ul className="space-y-1 rounded-xl border border-border bg-muted/30 p-2.5">
                {deliveryLinks.map((link, i) => (
                  <li key={`${link}-${i}`}>
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {link}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <section className="space-y-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold">เอกสาร</h3>
            {accountingMock && activeDocs.length === 0 ? (
              <span className="text-[10px] text-amber-700 dark:text-amber-400">
                ชุดบัญชีตัวอย่าง
              </span>
            ) : null}
          </div>
          {sortedDocs.length > 0 ? (
            <ul>
              {sortedDocs.map((doc) => {
                const receiptLabel =
                  doc.kind === "receipt" &&
                  (accountingMock?.payment.isDeposit ||
                    (activeOrder?.status === "deposit_paid" &&
                      (activeOrder.deposit_percent ?? 100) < 100))
                    ? "ใบเสร็จรับเงินมัดจำ"
                    : docKindLabelTh(doc.kind);
                return (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0"
                  >
                    <div className="min-w-0">
                      <span className="text-sm block truncate">{receiptLabel}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {doc.doc_number}
                        {doc.id.startsWith("mock-") ? " · mock" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label={`ดู${receiptLabel}`}
                        onClick={() => setViewDoc(doc as HireDocumentRow)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label={`ดาวน์โหลด${receiptLabel}`}
                        onClick={() => downloadDoc(doc as HireDocumentRow)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">ยังไม่มีเอกสารสำหรับออเดอร์นี้</p>
          )}
        </section>

        {orders.length > 1 ? (
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold mb-1">ประวัติออเดอร์ในแชทนี้</h3>
            <ul className="space-y-1">
              {orders.map((o) => {
                const code = orderCodeFromId(o.id);
                const active = (selectedHistoryId || order?.id) === o.id;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryId(o.id === order?.id ? null : o.id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                        active
                          ? "border-[hsl(var(--chat-hire)/0.5)] bg-[hsl(var(--chat-hire-soft))]"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <span className="font-medium tabular-nums">#{code}</span>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {labelHireOrderStatus(o.status)}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {showPartner && partner?.name ? (
          <section className="space-y-1">
            <h3 className="text-sm font-semibold mb-1">กำลังทำงานกับ</h3>
            <div className="flex items-center gap-3">
              <UserAvatar
                src={partner.avatarUrl}
                name={partner.name}
                className="w-10 h-10 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{partner.name}</p>
                {partner.role ? (
                  <p className="text-xs text-muted-foreground truncate">{partner.role}</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {(canSubmit || canCancel) && activeOrder ? (
          <div className="flex flex-col gap-2 pt-1">
            {canSubmit ? (
              <Button
                type="button"
                className="w-full rounded-full bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                onClick={() => setSubmitOpen(true)}
              >
                <Package className="w-4 h-4 mr-1.5" />
                ส่งผลงาน
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => onCancelOrder?.(activeOrder.id)}
              >
                <Ban className="w-4 h-4 mr-1.5" />
                ขอยกเลิกงาน
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {user?.id && activeOrder ? (
        <HireWorkSubmitDialog
          open={submitOpen}
          onOpenChange={setSubmitOpen}
          orderId={activeOrder.id}
          conversationId={conversation.id}
          userId={user.id}
        />
      ) : null}

      <Dialog open={!!viewDoc} onOpenChange={(v) => !v && setViewDoc(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-base">
              {viewDoc?.kind === "receipt" &&
              (viewDoc.snapshot.notes?.includes("มัดจำ") ||
                viewDoc.snapshot.title?.includes("มัดจำ"))
                ? "ใบเสร็จรับเงินมัดจำ"
                : viewDoc
                  ? docKindLabelTh(viewDoc.kind)
                  : "เอกสาร"}
            </DialogTitle>
            <DialogDescription>
              {viewDoc?.doc_number}
              {viewDoc?.id.startsWith("mock-") ? " · เอกสารตัวอย่าง (mock)" : ""}
            </DialogDescription>
          </DialogHeader>
          {viewDoc ? (
            <div className="p-4">
              <DocumentPaper doc={viewDoc.snapshot} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function HireOrderDetailDialog({
  open,
  onOpenChange,
  conversation,
  projectTitle,
  deadline,
  partner,
  orderId,
  onCancelOrder,
}: Props) {
  const { data: order } = useHireOrderById(orderId ?? undefined);
  const code = orderCodeFromId(order?.id || orderId || conversation.request_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {partner?.avatarUrl !== undefined ? (
              <UserAvatar
                src={partner?.avatarUrl}
                name={partner?.name || "งาน"}
                className="w-11 h-11 shrink-0"
              />
            ) : null}
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">#{code}</DialogTitle>
              <DialogDescription className="truncate">
                {projectTitle || conversation.project_title || "งานจ้าง"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <HireOrderDetailContent
          conversation={conversation}
          deadline={deadline}
          partner={partner}
          orderId={orderId}
          onCancelOrder={onCancelOrder}
        />
      </DialogContent>
    </Dialog>
  );
}
