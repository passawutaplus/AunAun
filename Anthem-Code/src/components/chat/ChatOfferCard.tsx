import { useState } from "react";
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
  offerAcceptMessage,
  offerDeclineWithReasonMessage,
  offerDepositAmount,
  QUOTE_DECLINE_REASONS,
  type ChatOfferPayload,
  type QuoteDeclineReasonId,
} from "@/lib/chatOffer";
import { HIRE_POLICY_VERSION, PAYMENT_POLICY_VERSION } from "@/lib/legalConfig";
import { sharedDb } from "@/integrations/supabase/client";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import { ChatOfferPreview } from "@/components/chat/ChatOfferPreview";
import HireCheckoutDialog from "@/components/payments/HireCheckoutDialog";
import { cn } from "@/lib/utils";
import { useMarkHireOfferAccepted } from "@/hooks/useHireCancelRequest";

type Props = {
  offer: ChatOfferPayload;
  conversationId: string;
  mine: boolean;
  /** Recipient can accept/decline. */
  canRespond: boolean;
  /** When set, accepting the offer marks hiring_requests.offer_accepted_at */
  hiringRequestId?: string | null;
};

export function ChatOfferCard({
  offer,
  conversationId,
  mine,
  canRespond,
  hiringRequestId,
}: Props) {
  const { user } = useAuth();
  const send = useSendMessage();
  const markOfferAccepted = useMarkHireOfferAccepted();
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [agreedService, setAgreedService] = useState(false);
  const [agreedPayment, setAgreedPayment] = useState(false);
  const [declineReason, setDeclineReason] = useState<QuoteDeclineReasonId>("revise_details");
  const [declineNote, setDeclineNote] = useState("");

  const hasTimeline = !!(
    offer.startDate ||
    offer.endDate ||
    offer.dueDate ||
    (offer.milestones && offer.milestones.length > 0)
  );
  const depositPct = offer.depositPercent ?? 50;
  const deposit =
    depositPct < 100 ? offerDepositAmount(offer.amount, depositPct) : null;

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
      await recordPolicyAcceptance();
      if (hiringRequestId) {
        try {
          await markOfferAccepted.mutateAsync(hiringRequestId);
        } catch {
          /* chat accept message still useful */
        }
      }
      await send.mutateAsync({
        conversationId,
        content: offerAcceptMessage(offer),
        messageType: "text",
      });
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
      <div
        className={cn(
          "rounded-2xl border overflow-hidden shadow-sm min-w-[16rem] max-w-[22rem]",
          mine ? "border-white/25 bg-black/15" : "border-border bg-card",
        )}
      >
        <div
          className={cn(
            "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide flex items-center justify-between gap-2",
            mine ? "bg-black/20 text-white/90" : "bg-primary/10 text-primary",
          )}
        >
          <span>ข้อเสนอราคา</span>
          {offer.number ? (
            <span className={cn("font-normal tabular-nums normal-case", mine ? "text-white/70" : "text-primary/80")}>
              {offer.number}
            </span>
          ) : null}
        </div>
        <div className={cn("px-3 py-3 space-y-2", mine ? "text-white" : "text-foreground")}>
          <p className="text-sm font-semibold leading-snug">{offer.title}</p>
          <p className={cn("text-xl font-semibold tabular-nums", mine ? "text-white" : "text-primary")}>
            {formatOfferAmount(offer.amount)}
          </p>
          {deposit != null ? (
            <p className={cn("text-[11px]", mine ? "text-white/75" : "text-muted-foreground")}>
              มัดจำ {depositPct}% · {formatOfferAmount(deposit)}
              {offer.depositDueDate
                ? ` · ครบกำหนด ${formatOfferDateShort(offer.depositDueDate)}`
                : ""}
            </p>
          ) : (
            <p className={cn("text-[11px]", mine ? "text-white/75" : "text-muted-foreground")}>
              จ่ายเต็มจำนวน
            </p>
          )}
          {offer.items && offer.items.length > 0 ? (
            <ul className={cn("text-xs space-y-1", mine ? "text-white/85" : "text-muted-foreground")}>
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
            <p
              className={cn(
                "text-xs leading-relaxed whitespace-pre-wrap",
                mine ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {offer.deliverables}
            </p>
          ) : null}
          {offer.clientNotes?.trim() ? (
            <p className={cn("text-[11px] whitespace-pre-wrap", mine ? "text-white/75" : "text-muted-foreground")}>
              <span className="font-medium">หมายเหตุ: </span>
              {offer.clientNotes.trim()}
            </p>
          ) : null}
          {mine && offer.internalNotes?.trim() ? (
            <div className="rounded-xl border border-dashed border-white/30 bg-black/20 p-2 space-y-0.5">
              <p className="text-[10px] font-semibold text-white/80">หมายเหตุภายใน (เห็นเฉพาะคุณ)</p>
              <p className="text-[11px] text-white/75 whitespace-pre-wrap">{offer.internalNotes.trim()}</p>
            </div>
          ) : null}
          {hasTimeline ? (
            mine ? (
              <div className="rounded-xl border border-dashed border-white/30 bg-black/20 p-2 space-y-1">
                <p className="text-[10px] font-semibold text-white/90">ไทม์ไลน์งาน</p>
                {(offer.milestones && offer.milestones.length > 0
                  ? offer.milestones
                  : [
                      ...(offer.startDate
                        ? [{ id: "s", label: "เริ่มงาน", date: offer.startDate }]
                        : []),
                      ...((offer.endDate || offer.dueDate)
                        ? [
                            {
                              id: "e",
                              label: "ส่งมอบ / จบงาน",
                              date: offer.endDate || offer.dueDate,
                            },
                          ]
                        : []),
                    ]
                ).map((m) => (
                  <p key={m.id} className="flex justify-between text-[11px] text-white/80 gap-2">
                    <span className="truncate">{m.label}</span>
                    <span className="tabular-nums shrink-0">
                      {m.date ? formatOfferDateShort(m.date) : "—"}
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <ChatOfferTimeline offer={offer} compact title="ไทม์ไลน์งาน" />
            )
          ) : null}
        </div>
        {canRespond ? (
          <div className="px-3 pb-3">
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full"
              disabled={send.isPending}
              onClick={() => setQuoteOpen(true)}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              ดูใบเสนอราคา
            </Button>
          </div>
        ) : mine ? (
          <p className={cn("px-3 pb-3 text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>
            รออีกฝ่ายตอบรับ
          </p>
        ) : null}
      </div>

      <Dialog open={quoteOpen} onOpenChange={handleQuoteOpenChange}>
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
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        offer={offer}
        conversationId={conversationId}
        hiringRequestId={hiringRequestId}
      />
    </>
  );
}
