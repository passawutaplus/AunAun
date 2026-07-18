import { CheckCircle2, ShieldCheck } from "lucide-react";
import { formatOfferAmount } from "@/lib/chatOffer";
import type { HirePaidChatPayload } from "@/lib/hirePaymentChat";
import {
  ChatCardShell,
  ChatCardOrderMenu,
  chatCardAccent,
} from "@/components/chat/ChatCardShell";
import { cn } from "@/lib/utils";

type Props = {
  payload: HirePaidChatPayload;
  mine?: boolean;
  /** Opens the order-detail popup from the card's document icon (hire flow). */
  onOpenOrderDetail?: (orderId?: string | null) => void;
};

/** Accept + payment escrow confirmation card in hire chat. */
export default function HirePaidCard({ payload, onOpenOrderDetail }: Props) {
  const offerLabel = formatOfferAmount(payload.offerAmountThb);
  const paidLabel = formatOfferAmount(payload.paidAmountThb);
  const isPartial =
    payload.offerAmountThb > 0 &&
    payload.paidAmountThb > 0 &&
    payload.paidAmountThb < payload.offerAmountThb;

  return (
    <ChatCardShell
      tone="success"
      icon={CheckCircle2}
      title="ยอมรับข้อเสนอและชำระแล้ว"
      action={
        onOpenOrderDetail ? (
          <ChatCardOrderMenu
            onOpenOrderDetail={() => onOpenOrderDetail(payload.orderId)}
          />
        ) : undefined
      }
    >
      <div>
        <p className="text-sm font-semibold leading-snug">«{payload.offerTitle}»</p>
        <p className="text-xs mt-0.5 text-muted-foreground">มูลค่างาน {offerLabel}</p>
      </div>
      <div className="rounded-xl px-3 py-2 bg-emerald-500/10">
        <p className="text-[10px] font-medium text-muted-foreground">
          {isPartial ? "ยอดที่ชำระ (มัดจำ)" : "ยอดที่ชำระ"}
        </p>
        <p className={cn("text-lg font-semibold tabular-nums", chatCardAccent("success"))}>
          {paidLabel}
        </p>
      </div>
      <div className="flex gap-2 rounded-xl px-2.5 py-2 text-[11px] leading-relaxed bg-muted/60 text-muted-foreground">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
        <p>
          Aplus1 พักเงินไว้ในฐานะตัวกลาง และจะโอนให้ผู้รับงานหลังอนุมัติงานตามเงื่อนไขแพลตฟอร์ม
        </p>
      </div>
    </ChatCardShell>
  );
}
