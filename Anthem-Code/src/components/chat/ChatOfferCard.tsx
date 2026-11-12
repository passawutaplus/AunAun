import { useEffect, useRef, useState } from "react";
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
  offerDeclineWithReasonMessage,
  offerPaymentPlan,
  offerDepositAmount,
  offerDisplayMilestones,
  QUOTE_DECLINE_REASONS,
  type ChatOfferPayload,
  type QuoteDeclineReasonId,
} from "@/lib/chatOffer";
import { HIRE_POLICY_VERSION, PAYMENT_POLICY_VERSION } from "@/lib/legalConfig";
import { sharedDb } from "@/integrations/supabase/client";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import { PrintButton } from "@/components/documents/PrintButton";
import { ChatOfferPreview } from "@/components/chat/ChatOfferPreview";
import {
  ChatCardShell,
  ChatCardStatus,
  ChatCardOrderMenu,
  chatCardAccent,
} from "@/components/chat/ChatCardShell";
import HireCheckoutDialog from "@/components/payments/HireCheckoutDialog";
import { useMarkHireOfferAccepted } from "@/hooks/useHireCancelRequest";
import { useClientRespondDoc } from "@/hooks/useStudioDocuments";
import { isCommerceEnabled } from "@/lib/aplus1Launch";
import { trackProductEvent } from "@/lib/productEvents";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { CHAT_HIRE, formatHireDate } from "@/lib/i18n/chatHire";

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
  const tHire = useT(CHAT_HIRE);
  const send = useSendMessage();
  const markOfferAccepted = useMarkHireOfferAccepted();
  const respondDoc = useClientRespondDoc();
  // Free launch: a proposal is agreed in chat — no checkout, no deposit, payment is settled between the two.
  const paid = isCommerceEnabled();
  const plan = offerPaymentPlan(offer);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [declineMode, setDeclineMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
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
      toast.error(e instanceof Error ? e.message : tHire("agreeFailed"));
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
      if (offer.docId) {
        await respondDoc
          .mutateAsync({ docId: offer.docId, action: "decline", note: declineNote.trim() || undefined })
          .catch(() => undefined);
      }
      await send.mutateAsync({
        conversationId,
        content: offerDeclineWithReasonMessage(offer, declineReason, declineNote),
        messageType: "text",
      });
      toast.success(tHire("declineSent"));
      handleQuoteOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tHire("sendFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptFree = async () => {
    setBusy(true);
    try {
      if (offer.quoteId) {
        await sharedDb
          .from("hire_quotes")
          .update({ status: "accepted" } as never)
          .eq("id", offer.quoteId)
          .then(() => undefined, () => undefined);
      }
      if (offer.docId) {
        await respondDoc.mutateAsync({ docId: offer.docId, action: "accept" }).catch(() => undefined);
      }
      if (hiringRequestId) await markOfferAccepted.mutateAsync(hiringRequestId);
      await send.mutateAsync({
        conversationId,
        content: `ตอบรับข้อเสนอ «${offer.title}» แล้ว (${formatOfferAmount(offer.amount)}) — เริ่มงานได้เลย การชำระเงินตกลงกันเองนอก SAMECOR`,
        messageType: "text",
      });
      toast.success(tHire("offerAccepted"));
      void trackProductEvent("proposal_accept", { conversation_id: conversationId }, { debounceMs: 0 });
      handleQuoteOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tHire("acceptFailed"));
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
        title={paid ? tHire("offerTitlePaid") : tHire("offerTitleFree")}
        meta={offer.number || undefined}
        action={
          onOpenOrderDetail ? (
            <ChatCardOrderMenu onOpenOrderDetail={() => onOpenOrderDetail()} />
          ) : undefined
        }
        footer={
          settled ? (
            <p className={cn("text-[11px] font-medium", chatCardAccent("success"))}>
              {paid ? tHire("paidPerQuote") : tHire("offerAccepted")}
            </p>
          ) : canRespond ? (
            <Button
              type="button"
              size="sm"
              className="w-full rounded-full bg-[hsl(var(--chat-hire))] text-[hsl(var(--chat-hire-foreground))] hover:opacity-90"
              disabled={send.isPending}
              onClick={() => setQuoteOpen(true)}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              {paid ? tHire("viewQuote") : tHire("viewOffer")}
            </Button>
          ) : mine ? (
            <ChatCardStatus>{tHire("waitingOtherAccept")}</ChatCardStatus>
          ) : null
        }
      >
        <div>
          <p className="text-sm font-semibold leading-snug">{offer.title}</p>
          <p className={cn("text-xl font-semibold tabular-nums mt-0.5", chatCardAccent("hire"))}>
            {formatOfferAmount(offer.amount)}
          </p>
        </div>
        {!paid ? (
          plan.length > 1 ? (
            <p className="text-[11px] text-muted-foreground">
              {tHire("splitInstallments", { n: plan.length })} ·{" "}
              {plan
                .map((p) => `${p.percent}%`)
                .join(" / ")}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">{tHire("payOnce")}</p>
          )
        ) : deposit != null ? (
          <p className="text-[11px] text-muted-foreground">
            {tHire("depositPct", { pct: depositPct })} · {formatOfferAmount(deposit)}
            {offer.depositDueDate
              ? ` · ${tHire("due", { date: formatHireDate(offer.depositDueDate) })}`
              : ""}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">{tHire("payFull")}</p>
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
              <li className="text-[11px] opacity-70">{tHire("moreItems", { n: offer.items.length - 4 })}</li>
            ) : null}
          </ul>
        ) : offer.deliverables ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {offer.deliverables}
          </p>
        ) : null}
        {offer.clientNotes?.trim() ? (
          <p className="text-[11px] whitespace-pre-wrap text-muted-foreground">
            <span className="font-medium">{tHire("noteLabel")} </span>
            {offer.clientNotes.trim()}
          </p>
        ) : null}
        {mine && offer.internalNotes?.trim() ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-2 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground">
              {tHire("internalNote")}
            </p>
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
              {offer.internalNotes.trim()}
            </p>
          </div>
        ) : null}
        {hasTimeline ? (
          <ChatOfferTimeline offer={offer} compact title={tHire("timelineJob")} />
        ) : null}
      </ChatCardShell>

      <Dialog open={quoteOpen && !settled} onOpenChange={handleQuoteOpenChange}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{declineMode ? tHire("declineQuoteTitle") : tHire("quotation")}</DialogTitle>
            <DialogDescription>
              {declineMode
                ? tHire("declineQuoteDesc")
                : paid
                  ? tHire("reviewBeforePay")
                  : tHire("reviewBeforeAccept")}
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
                  {declineReason === "other" ? tHire("detailsRequired") : tHire("detailsOptional")}
                </Label>
                <Textarea
                  id="decline-note"
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  disabled={busy}
                  rows={3}
                  className="rounded-xl resize-none"
                  placeholder={tHire("declineNotePlaceholder")}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              <div ref={paperRef} className="space-y-2">
                <div className="flex justify-end">
                  <PrintButton targetRef={paperRef} docNumber={offer.number} title={offer.title} />
                </div>
                <ChatOfferPreview offer={offer} className="shadow-none" />
              </div>

              {paid ? (
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <label className="flex gap-2.5 items-start cursor-pointer select-none">
                  <Checkbox
                    checked={agreedService}
                    onCheckedChange={(v) => setAgreedService(v === true)}
                    className="mt-0.5"
                    disabled={busy}
                  />
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {tHire("agreeTo")}{" "}
                    <Link
                      to="/legal/service-agreement"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      {tHire("serviceAgreementFull")}
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
                    {tHire("agreeTo")}{" "}
                    <Link
                      to="/legal/payment-refund"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      {tHire("paymentPolicyFull")}
                    </Link>
                  </span>
                </label>
              </div>
              ) : null}
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
                  {tHire("back")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-full w-full sm:w-auto"
                  disabled={busy || !canDecline}
                  onClick={() => void handleDecline()}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {tHire("confirmReject")}
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
                  {tHire("decline")}
                </Button>
                {paid ? (
                  <Button
                    type="button"
                    className="rounded-full w-full sm:flex-1"
                    disabled={busy || !canAcceptPay || send.isPending}
                    onClick={() => void handleAcceptAndPay()}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {tHire("confirmAndPay")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="rounded-full w-full sm:flex-1"
                    disabled={busy || send.isPending}
                    onClick={() => void handleAcceptFree()}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    {tHire("acceptOffer")}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HireCheckoutDialog
        open={paid && checkoutOpen && !settled}
        onOpenChange={setCheckoutOpen}
        offer={offer}
        conversationId={conversationId}
        hiringRequestId={hiringRequestId}
      />
    </>
  );
}
