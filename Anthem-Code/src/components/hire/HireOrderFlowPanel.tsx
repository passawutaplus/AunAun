import { useState } from "react";
import { FileCheck, Package, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Conversation } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import {
  labelHireOrderStatus,
  useHireOrderByRequest,
  useHireWhtDoc,
} from "@/hooks/useHireOrderFlow";
import HireWorkSubmitDialog from "@/components/hire/HireWorkSubmitDialog";
import HireWhtDialog from "@/components/hire/HireWhtDialog";
import { formatOfferAmount } from "@/lib/chatOffer";
import { satangToThb } from "@/lib/payments/fees";

type Props = {
  conversation: Conversation;
  projectTitle?: string | null;
};

export function HireOrderFlowPanel({ conversation, projectTitle }: Props) {
  const { user } = useAuth();
  const { data: order } = useHireOrderByRequest(conversation.request_id ?? undefined);
  const { data: whtDoc } = useHireWhtDoc(order?.id);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [whtOpen, setWhtOpen] = useState(false);

  if (!order || !user?.id) return null;

  const isBuyer = user.id === order.buyer_id;
  const isSeller = user.id === order.seller_id;
  if (!isBuyer && !isSeller) return null;

  const canSubmit =
    isSeller && ["paid_pending", "deposit_paid", "in_progress"].includes(order.status);
  const hasWht = (order.wht_satang ?? 0) > 0;
  const whtPending =
    hasWht &&
    order.status === "available" &&
    order.wht_status !== "complete";

  return (
    <>
      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">สถานะชำระเงิน</p>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {labelHireOrderStatus(order.status)}
          </Badge>
        </div>

        {hasWht ? (
          <p className="text-[11px] text-muted-foreground">
            หัก ณ ที่จ่าย {formatOfferAmount(satangToThb(order.wht_satang ?? 0))}
            {order.wht_status === "complete"
              ? " · 50 ทวิ ครบแล้ว"
              : order.wht_status === "awaiting_cert"
                ? " · รอ 50 ทวิ"
                : ""}
          </p>
        ) : null}

        {canSubmit ? (
          <Button
            type="button"
            size="sm"
            className="w-full rounded-xl"
            onClick={() => setSubmitOpen(true)}
          >
            <Package className="w-3.5 h-3.5 mr-1.5" />
            ส่งผลงาน
          </Button>
        ) : null}

        {whtPending ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => setWhtOpen(true)}
          >
            <Receipt className="w-3.5 h-3.5 mr-1.5" />
            {isBuyer
              ? whtDoc
                ? "ดู 50 ทวิ ที่ส่งแล้ว"
                : "ส่ง 50 ทวิ"
              : whtDoc
                ? "ยืนยันรับ 50 ทวิ"
                : "รอ 50 ทวิ จากผู้จ้าง"}
          </Button>
        ) : null}

        {order.status === "awaiting_approval" && isBuyer ? (
          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <FileCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ตรวจผลงานในแชทแล้วกด「ยืนยันรับผลงาน」บนการ์ดส่งงาน
          </p>
        ) : null}
      </div>

      <HireWorkSubmitDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        orderId={order.id}
        conversationId={conversation.id}
        userId={user.id}
      />

      <HireWhtDialog
        open={whtOpen}
        onOpenChange={setWhtOpen}
        order={order}
        userId={user.id}
        role={isBuyer ? "buyer" : "seller"}
      />
    </>
  );
}

export default HireOrderFlowPanel;
