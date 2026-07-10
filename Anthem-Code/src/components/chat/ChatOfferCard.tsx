import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSendMessage } from "@/hooks/useChat";
import {
  formatOfferAmount,
  formatOfferDateShort,
  offerAcceptMessage,
  offerDeclineMessage,
  offerDepositAmount,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import { cn } from "@/lib/utils";

type Props = {
  offer: ChatOfferPayload;
  conversationId: string;
  mine: boolean;
  /** Recipient can accept/decline. */
  canRespond: boolean;
};

export function ChatOfferCard({ offer, conversationId, mine, canRespond }: Props) {
  const send = useSendMessage();
  const hasTimeline = !!(
    offer.startDate ||
    offer.endDate ||
    offer.dueDate ||
    (offer.milestones && offer.milestones.length > 0)
  );
  const depositPct = offer.depositPercent ?? 50;
  const deposit =
    depositPct < 100 ? offerDepositAmount(offer.amount, depositPct) : null;

  const respond = async (accepted: boolean) => {
    try {
      await send.mutateAsync({
        conversationId,
        content: accepted ? offerAcceptMessage(offer) : offerDeclineMessage(offer),
        messageType: "text",
      });
      toast.success(accepted ? "ยอมรับข้อเสนอแล้ว" : "ส่งการปฏิเสธแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    }
  };

  return (
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
        <div className="flex gap-2 px-3 pb-3">
          <Button
            type="button"
            size="sm"
            className="flex-1 rounded-full"
            disabled={send.isPending}
            onClick={() => void respond(true)}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            ยอมรับ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 rounded-full"
            disabled={send.isPending}
            onClick={() => void respond(false)}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            ยังไม่รับ
          </Button>
        </div>
      ) : mine ? (
        <p className={cn("px-3 pb-3 text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>
          รออีกฝ่ายตอบรับ
        </p>
      ) : null}
    </div>
  );
}
