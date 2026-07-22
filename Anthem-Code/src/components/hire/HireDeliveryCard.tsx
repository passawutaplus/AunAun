import { useMemo, useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  canOpenSellerDispute,
  labelHireOrderStatus,
  useApproveHireWork,
  useHireOrderById,
  useOpenHireDispute,
} from "@/hooks/useHireOrderFlow";
import type { HireDeliveryChatPayload } from "@/lib/hireDeliveryChat";
import { ChatCardOrderMenu } from "@/components/chat/ChatCardShell";
import { SafeHttpLinks } from "@/components/hire/SafeHttpLinks";
import { cn } from "@/lib/utils";

type Props = {
  payload: HireDeliveryChatPayload;
  hiringRequestId?: string | null;
  projectTitle?: string | null;
  mine: boolean;
  /** Opens the order-detail popup from the card's document icon (hire flow). */
  onOpenOrderDetail?: (orderId?: string | null) => void;
};

export default function HireDeliveryCard({
  payload,
  hiringRequestId,
  projectTitle,
  mine,
  onOpenOrderDetail,
}: Props) {
  const { user } = useAuth();
  const { data: order } = useHireOrderById(payload.orderId);
  const approve = useApproveHireWork();
  const dispute = useOpenHireDispute();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const isBuyer = !!user?.id && order?.buyer_id === user.id;
  const isSeller = !!user?.id && order?.seller_id === user.id;

  const submittedLabel = useMemo(() => {
    try {
      return format(new Date(payload.submittedAt), "d MMM yyyy HH:mm", { locale: th });
    } catch {
      return payload.submittedAt;
    }
  }, [payload.submittedAt]);

  const sellerCanDispute =
    isSeller &&
    order &&
    canOpenSellerDispute({
      status: order.status,
      autoDisputeAt: order.auto_dispute_at,
    });

  const buyerCanApprove = isBuyer && order?.status === "awaiting_approval";

  const handleApprove = async () => {
    if (!user?.id || !hiringRequestId) return;
    try {
      await approve.mutateAsync({
        orderId: payload.orderId,
        hiringRequestId,
        userId: user.id,
        projectTitle: projectTitle ?? undefined,
      });
    } catch {
      /* toast in hook */
    }
  };

  const handleDispute = async () => {
    if (!user?.id) return;
    try {
      await dispute.mutateAsync({
        orderId: payload.orderId,
        reason: disputeReason,
        userId: user.id,
      });
      setDisputeOpen(false);
      setDisputeReason("");
    } catch {
      /* toast in hook */
    }
  };

  const busy = approve.isPending || dispute.isPending;

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border overflow-hidden max-w-md",
          mine ? "border-primary/30 bg-primary/5" : "border-border bg-card",
        )}
      >
        <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">ส่งมอบผลงาน</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              รอบที่ {payload.revision} · {submittedLabel}
            </p>
            {order ? (
              <p className="text-[11px] text-muted-foreground mt-1">
                สถานะ: {labelHireOrderStatus(order.status)}
              </p>
            ) : null}
          </div>
          {onOpenOrderDetail ? (
            <div className="shrink-0 text-muted-foreground">
              <ChatCardOrderMenu
                onOpenOrderDetail={() => onOpenOrderDetail(payload.orderId)}
              />
            </div>
          ) : null}
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">ลิงก์ผลงาน</p>
            <SafeHttpLinks links={payload.links} />
          </div>

          {payload.note?.trim() ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">หมายเหตุ</p>
              <p className="text-sm whitespace-pre-wrap text-foreground">{payload.note.trim()}</p>
            </div>
          ) : null}

          {buyerCanApprove ? (
            <Button
              type="button"
              className="w-full rounded-full"
              disabled={busy}
              onClick={() => void handleApprove()}
            >
              {approve.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              ยืนยันรับผลงาน
            </Button>
          ) : null}

          {sellerCanDispute ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full border-amber-500/50 text-amber-700 hover:bg-amber-500/10"
              disabled={busy}
              onClick={() => setDisputeOpen(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              เปิดข้อพิพาท (ผู้จ้างเงียบ 7 วัน)
            </Button>
          ) : null}

          {order?.status === "available" ? (
            <p className="text-xs text-emerald-700 bg-emerald-500/10 rounded-lg px-3 py-2">
              ผู้จ้างยืนยันรับผลงานแล้ว — เงินพร้อมถอนตามนโยบายแพลตฟอร์ม
            </p>
          ) : null}

          {order?.status === "disputed" ? (
            <p className="text-xs text-amber-800 bg-amber-500/10 rounded-lg px-3 py-2">
              อยู่ระหว่างข้อพิพาท — ทีมงานจะตรวจสอบ
            </p>
          ) : null}
        </div>
      </div>

      <AlertDialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>เปิดข้อพิพาท</AlertDialogTitle>
            <AlertDialogDescription>
              ใช้เมื่อผู้จ้างไม่ตอบสนองภายใน 7 วันหลังส่งงาน — ทีมงานจะพิจารณาตามหลักฐาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="อธิบายเหตุผลและสิ่งที่ส่งมอบแล้ว..."
            className="rounded-xl min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              disabled={dispute.isPending || !disputeReason.trim()}
              onClick={(e) => {
                e.preventDefault();
                void handleDispute();
              }}
            >
              {dispute.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              ส่งข้อพิพาท
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
