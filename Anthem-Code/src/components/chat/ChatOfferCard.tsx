import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSendMessage } from "@/hooks/useChat";
import {
  formatOfferAmount,
  formatOfferDateShort,
  offerDeclineWithReasonMessage,
  offerDepositAmount,
  offerDisplayMilestones,
  QUOTE_DECLINE_REASONS,
  type ChatOfferPayload,
  type QuoteDeclineReasonId,
} from "@/lib/chatOffer";
import { HIRE_POLICY_VERSION, PAYMENT_POLICY_VERSION } from "@/lib/legalConfig";
import { sharedDb } from "@/integrations/supabase/client";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import { ChatOfferPreview } from "@/components/chat/ChatOfferPreview";
import {
  ChatCardShell,
  ChatCardStatus,
  ChatCardOrderMenu,
  chatCardAccent,
} from "@/components/chat/ChatCardShell";
import HireCheckoutDialog from "@/components/payments/HireCheckoutDialog";
import { cn } from "@/lib/utils";

type Props = {
  offer: ChatOfferPayload;
  conversationId: string;
  mine: boolean;
  /** Recipient can accept/decline. */
  canRespond: boolean;
  /** Paid / offer accepted — hide quote CTA so buyer cannot re-open checkout. */
  settled?: boolean;
  /** When set, accepting the offer marks hiring_requests.offer_accepted_at after payment */
  hiringRequestId?: string | null;
  /** Opens the order-detail popup from the card's document icon (hire flow). */
  onOpenOrderDetail?: (orderId?: string | null) => void;
};

export function ChatOfferCard({
  offer,
  conversationId,
  mine,
  canRespond,
  settled = false,
  hiringRequestId,
  onOpenOrderDetail,
}: Props) {
  const { user } = useAuth();
  const send = useSendMessage();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreedService, setAgreedService] = useState(false);
  const [agreedPayment, setAgreedPayment] = useState(false);
  const [declineReason, setDeclineReason] = useState<QuoteDeclineReasonId>("revise_details");
  const [declineNote, setDeclineNote] = useState("");

  const displayMilestones = offerDisplayMilestones(offer);
  const hasTimeline = displayMilestones.length > 0;
  const depositPct = offer.depositPercent ?? 50;
  const deposit =
    depositPct < 100 ? offerDepositAmount(offer.amount, depositPct) : null;

  useEffect(() => {
    if (!settled) return;
    setQuoteOpen(false);
    setCheckoutOpen(false);
    setDeclineMode(false);
  }, [settled]);

  const resetQuoteDialog = () => {
    setDeclineMode(false);
    setAgreedService(false);
    setAgreedPayment(false);
    setDeclineReason("revise_details");
    setDeclineNote("");
  };

  const handleQuoteOpenChange = (next: boolean) => {
    if (!next) resetQuoteDialog();
    setQuoteOpen(next);
  };

  const recordPolicyAcceptance = async () => {
    if (!user?.id || !offer.quoteId) return;
    const { error } = await sharedDb.from("hire_quote_policy_acceptances").insert({
      quote_id: offer.quoteId,
      buyer_id: user.id,
      terms_version: HIRE_POLICY_VERSION,
      payment_version: PAYMENT_POLICY_VERSION,
      hire_policy_version: HIRE_POLICY_VERSION,
    } as never);
    if (error && !String(error.message).includes("duplicate")) {
      /* RLS or schema — checkout can still proceed */
    }
  };

  const handleAcceptAndPay = async () => {
    if (!agreedService || !agreedPayment) return;
    setBusy(true);
    try {
      // Policy acceptance before checkout; chat accept + paid card post after payment succeeds.
      await recordPolicyAcceptance();
      setQuoteOpen(false);
      resetQuoteDialog();
      setCheckoutOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ยอมรับไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (declineReason === "other" && !declineNote.trim()) return;
    setBusy(true);
    try {
      if (offer.quoteId) {
        const { error } = await sharedDb
          .from("hire_quotes")
          .update({
            status: "declined_by_client",
            decline_reason: declineReason,
            decline_note: declineNote.trim() || null,
          } as never)
          .eq("id", offer.quoteId);
        if (error) {
          /* RLS — chat message still records intent */
        }
      }
      await send.mutateAsync({
        conversationId,
        content: offerDeclineWithReasonMessage(offer, declineReason, declineNote),
        messageType: "text",
      });
      toast.success("ส่งการปฏิเสธแล้ว");
      handleQuoteOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const canDecline = declineReason !== "other" || declineNote.trim().length > 0;
  const canAcceptPay = agreedService && agreedPayment;

  return (
    <>
      <ChatCardShell
        tone="hire"
        icon={FileText}
        title="ข้อเสนอราคา"
        meta={offer.number || undefined}
        action={
          onOpenOrderDetail ? (
            <ChatCardOrderMenu onOpenOrderDetail={() => onOpenOrderDetail()} />
          ) : undefined
        }
        footer={
          settled ? (
            <p className={cn("text-[11px] font-medium", chatCardAccent("success"))}>
              ชำระตามใบเสนอราคาแล้ว
            </p>
          ) : canRespond ? (
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
              disabled={send.isPending}
              onClick={() => setQuoteOpen(true)}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              ดูใบเสนอราคา
            </Button>
          ) : mine ? (
            <ChatCardStatus>รออีกฝ่ายตอบรับ</ChatCardStatus>
          ) : null
        }
      >
        <div>
          <p className="text-sm font-semibold leading-snug">{offer.title}</p>
          <p className={cn("text-xl font-semibold tabular-nums mt-0.5", chatCardAccent("hire"))}>
            {formatOfferAmount(offer.amount)}
          </p>
        </div>
        {deposit != null ? (
          <p className="text-[11px] text-muted-foreground">
            มัดจำ {depositPct}% · {formatOfferAmount(deposit)}
            {offer.depositDueDate
              ? ` · ครบกำหนด ${formatOfferDateShort(offer.depositDueDate)}`
              : ""}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">จ่ายเต็มจำนวน</p>
        )}
        {offer.items && offer.items.length > 0 ? (
          <ul className="text-xs space-y-1 text-muted-foreground">
            {offer.items.slice(0, 4).map((it) => (
              <li key={it.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {it.name}
                  {it.quantity > 1 ? ` ×${it.quantity}` : ""}
                </span>
                <span className="tabular-nums shrink-0">
                  {formatOfferAmount((it.quantity || 0) * (it.unitPrice || 0))}
                </span>
              </li>
            ))}
            {offer.items.length > 4 ? (
              <li className="text-[11px] opacity-70">+ อีก {offer.items.length - 4} รายการ</li>
            ) : null}
          </ul>
        ) : offer.deliverables ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {offer.deliverables}
          </p>
        ) : null}
        {offer.clientNotes?.trim() ? (
          <p className="text-[11px] whitespace-pre-wrap text-muted-foreground">
            <span className="font-medium">หมายเหตุ: </span>
            {offer.clientNotes.trim()}
          </p>
        ) : null}
        {mine && offer.internalNotes?.trim() ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground">
              หมายเหตุภายใน (เห็นเฉพาะคุณ)
            </p>
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
              {offer.internalNotes.trim()}
            </p>
          </div>
        ) : null}
        {hasTimeline ? (
          <ChatOfferTimeline offer={offer} compact title="ไทม์ไลน์งาน" />
        ) : null}
      </ChatCardShell>

      <Dialog open={quoteOpen && !settled} onOpenChange={handleQuoteOpenChange}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{declineMode ? "ปฏิเสธใบเสนอราคา" : "ใบเสนอราคา"}</DialogTitle>
            <DialogDescription>
              {declineMode
                ? "เลือกเหตุผลให้อีกฝ่ายทราบ — สามารถส่งใบใหม่ได้"
                : "ตรวจสอบรายละเอียดและเงื่อนไขก่อนยืนยันชำระเงิน"}
            </DialogDescription>
          </DialogHeader>

          {declineMode ? (
            <div className="space-y-3 py-1">
              <RadioGroup
                value={declineReason}
                onValueChange={(v) => setDeclineReason(v as QuoteDeclineReasonId)}
                className="gap-2"
                disabled={busy}
              >
                {QUOTE_DECLINE_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                  >
                    <RadioGroupItem value={r.id} id={`decline-${r.id}`} />
                    <span>{r.label}</span>
                  </label>
                ))}
              </RadioGroup>
              <div className="space-y-1.5">
                <Label htmlFor="decline-note">
                  รายละเอียด{declineReason === "other" ? " (จำเป็น)" : " (ถ้ามี)"}
                </Label>
                <Textarea
                  id="decline-note"
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  disabled={busy}
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder="บอกอีกฝ่ายสั้น ๆ ได้"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              <ChatOfferPreview offer={offer} className="shadow-none" />

              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <label className="flex gap-2.5 items-start cursor-pointer select-none">
                  <Checkbox
                    checked={agreedService}
                    onCheckedChange={(v) => setAgreedService(v === true)}
                    className="mt-0.5"
                    disabled={busy}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    ยอมรับ{" "}
                    <Link
                      to="/legal/service-agreement"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      ข้อตกลงการให้บริการ/การจ้างงาน
                    </Link>
                  </span>
                </label>
                <label className="flex gap-2.5 items-start cursor-pointer select-none">
                  <Checkbox
                    checked={agreedPayment}
                    onCheckedChange={(v) => setAgreedPayment(v === true)}
                    className="mt-0.5"
                    disabled={busy}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    ยอมรับ{" "}
                    <Link
                      to="/legal/payment-refund"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      นโยบายการชำระเงินและการคืนเงิน
                    </Link>
                  </span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {declineMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => setDeclineMode(false)}
                >
                  กลับ
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-full w-full sm:w-auto"
                  disabled={busy || !canDecline}
                  onClick={() => void handleDecline()}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  ยืนยันปฏิเสธ
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => setDeclineMode(true)}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  ปฏิเสธ
                </Button>
                <Button
                  type="button"
                  className="rounded-full w-full sm:flex-1"
                  disabled={busy || !canAcceptPay || send.isPending}
                  onClick={() => void handleAcceptAndPay()}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  ยืนยันและชำระเงิน
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HireCheckoutDialog
        open={checkoutOpen && !settled}
        onOpenChange={setCheckoutOpen}
        offer={offer}
        conversationId={conversationId}
        hiringRequestId={hiringRequestId}
      />
    </>
  );
}
