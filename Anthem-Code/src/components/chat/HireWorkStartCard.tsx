import { Briefcase, ListChecks, PlayCircle } from "lucide-react";
import { ChatOfferTimeline } from "@/components/chat/ChatOfferTimeline";
import {
  ChatCardShell,
  ChatCardOrderMenu,
  chatCardAccent,
} from "@/components/chat/ChatCardShell";
import {
  formatOfferAmount,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import type { HireWorkStartChatPayload } from "@/lib/hireWorkStartChat";
import { useT } from "@/lib/i18n";
import { CHAT_HIRE, formatHireDate } from "@/lib/i18n/chatHire";

type Props = {
  payload: HireWorkStartChatPayload;
  mine?: boolean;
  /** Opens the order-detail popup from the card's document icon (hire flow). */
  onOpenOrderDetail?: (orderId?: string | null) => void;
};

function toTimelineOffer(payload: HireWorkStartChatPayload): Pick<
  ChatOfferPayload,
  "startDate" | "endDate" | "dueDate" | "milestones" | "showFullTimeline" | "depositPercent"
> {
  return {
    startDate: payload.startDate,
    endDate: payload.endDate,
    dueDate: payload.dueDate,
    milestones: payload.milestones,
    showFullTimeline: payload.showFullTimeline,
  };
}

/** Freelancer-facing work-start card after payment (timeline + line items). */
export default function HireWorkStartCard({ payload, onOpenOrderDetail }: Props) {
  const tHire = useT(CHAT_HIRE);
  const end = payload.endDate || payload.dueDate;
  const timelineOffer = toTimelineOffer(payload);
  const hasItems = payload.items.length > 0;

  return (
    <ChatCardShell
      tone="hire"
      icon={PlayCircle}
      title={tHire("workStartTitle")}
      action={
        onOpenOrderDetail ? (
          <ChatCardOrderMenu
            onOpenOrderDetail={() => onOpenOrderDetail(payload.orderId)}
          />
        ) : undefined
      }
    >
      <div className="flex items-start gap-2">
        <Briefcase className={`w-4 h-4 shrink-0 mt-0.5 ${chatCardAccent("hire")}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{payload.offerTitle}</p>
          <p className="text-xs mt-0.5 tabular-nums text-muted-foreground">
            {formatOfferAmount(payload.offerAmountThb)}
            {end ? ` · ${tHire("deliverBy", { date: formatHireDate(end) })}` : ""}
          </p>
        </div>
      </div>

      <ChatOfferTimeline
        offer={timelineOffer}
        compact
        title={payload.showFullTimeline ? tHire("timelineJob") : tHire("deliveryDate")}
      />

      {hasItems ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide inline-flex items-center gap-1 text-muted-foreground">
            <ListChecks className="w-3 h-3" />
            {tHire("todoItems")}
          </p>
          <ul className="space-y-1">
            {payload.items.map((it, i) => (
              <li
                key={`${it.name}-${i}`}
                className="flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 text-xs bg-muted/50"
              >
                <span className="min-w-0">
                  <span className="font-medium">
                    {i + 1}. {it.name}
                  </span>
                  {it.quantity > 0 ? (
                    <span className="block text-[10px] text-muted-foreground">
                      {tHire("qty", { n: it.quantity })}
                      {it.unitPrice > 0 ? ` · ${tHire("amountPerUnit", { amount: formatOfferAmount(it.unitPrice) })}` : ""}
                    </span>
                  ) : null}
                </span>
                {it.quantity > 0 && it.unitPrice > 0 ? (
                  <span className="tabular-nums shrink-0 font-medium">
                    {formatOfferAmount(it.quantity * it.unitPrice)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ChatCardShell>
  );
}
