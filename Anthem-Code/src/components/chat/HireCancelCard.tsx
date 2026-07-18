import { useMemo, useState } from "react";
import { Ban, Check, History, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  HIRE_CANCEL_REJECT_REASONS,
  canEditHireCancelRequest,
  canRespondToHireCancelRequest,
  formatRemaining,
  hireCancelEventLabel,
  hireCancelMoneyLabel,
  hireCancelReasonLabel,
  hireCancelStatusLabel,
  type HireCancelCardPayload,
  type HireCancelEventRow,
  type HireCancelMoneyTerms,
  type HireCancelRequestRow,
} from "@/lib/hireCancelRequest";
import {
  useHireCancelById,
  useHireCancelHistory,
  useRespondHireCancelRequest,
} from "@/hooks/useHireCancelRequest";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Props = {
  payload: HireCancelCardPayload;
  mine: boolean;
  userId?: string | null;
  onEdit?: (row: HireCancelRequestRow) => void;
  onWithdraw?: (row: HireCancelRequestRow) => void;
  withdrawBusy?: boolean;
};

export function HireCancelCard({
  payload,
  mine,
  userId,
  onEdit,
  onWithdraw,
  withdrawBusy,
}: Props) {
  const { user } = useAuth();
  const uid = userId ?? user?.id ?? null;
  const { data: row, isLoading } = useHireCancelById(payload.cancelRequestId);
  const { data: history = [] } = useHireCancelHistory(payload.hiringRequestId);
  const respond = useRespondHireCancelRequest();
  const [showHistory, setShowHistory] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(HIRE_CANCEL_REJECT_REASONS[0].id);
  const [rejectNote, setRejectNote] = useState("");
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterTerms, setCounterTerms] = useState<HireCancelMoneyTerms>("full_refund");
  const [compOpen, setCompOpen] = useState(false);
  const [compNote, setCompNote] = useState("");

  const relatedHistory = useMemo(
    () => history.filter((e) => e.cancel_request_id === payload.cancelRequestId),
    [history, payload.cancelRequestId],
  );

  if (isLoading || !row) {
    return (
      <div className="rounded-2xl border border-border bg-card px-3 py-3 text-xs text-muted-foreground min-w-[16rem]">
        {isLoading ? "โหลดคำขอยกเลิก…" : "ไม่พบคำขอยกเลิก"}
      </div>
    );
  }

  const isInitiator = !!uid && row.initiator_id === uid;
  const canEdit = canEditHireCancelRequest(row, uid);
  const canRespond = canRespondToHireCancelRequest(row, uid);
  const reasonRole = row.initiated_by === "freelancer" ? "freelancer" : "client";
  const busy = respond.isPending || !!withdrawBusy;

  const runRespond = async (
    action: "accept" | "reject" | "counter" | "compensation_50",
    extra?: {
      responseReasonId?: string;
      responseNote?: string;
      responseMoneyTerms?: HireCancelMoneyTerms;
    },
  ) => {
    try {
      const notifyId =
        row.status === "countered"
          ? row.responder_id || row.initiator_id
          : row.initiator_id;
      await respond.mutateAsync({
        row,
        userId: uid!,
        otherUserId: notifyId,
        conversationId: row.conversation_id || "",
        action,
        ...extra,
      });
      toast.success(
        action === "accept"
          ? "อนุมัติการยกเลิกแล้ว"
          : action === "reject"
            ? "ปฏิเสธการยกเลิกแล้ว"
            : action === "compensation_50"
              ? "ส่งคำขอค่าชดเชย 50% แล้ว"
              : "เสนอเงื่อนไขเงินแล้ว",
      );
      setRejectOpen(false);
      setCounterOpen(false);
      setCompOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const footer = (
    <div className="flex flex-col gap-2">
      {isInitiator && canEdit && (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="w-full rounded-full h-8 text-xs"
            onClick={() => onEdit?.(row)}
          >
            แก้ไขคำขอ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            className="w-full rounded-full h-8 text-xs text-muted-foreground"
            onClick={() => onWithdraw?.(row)}
          >
            {withdrawBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            ถอนคำขอ
          </Button>
        </>
      )}

      {canRespond && (
        <>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="w-full rounded-full h-8 text-xs bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
            onClick={() => void runRespond("accept")}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            ยอมรับยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="w-full rounded-full h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => setRejectOpen(true)}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            ปฏิเสธการยกเลิก
          </Button>
          {row.initiated_by === "client" && row.status === "pending" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              className="w-full rounded-full h-8 text-xs"
              onClick={() => setCompOpen(true)}
            >
              ขอค่าชดเชย 50%
            </Button>
          )}
          {row.status === "pending" &&
            (row.money_terms === "half_refund" || row.money_terms === "full_refund") && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                className="w-full rounded-full h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setCounterTerms(
                    row.money_terms === "full_refund" ? "half_refund" : "full_refund",
                  );
                  setCounterOpen(true);
                }}
              >
                เสนอเงื่อนไขเงินอื่น
              </Button>
            )}
        </>
      )}

      {!canRespond && !canEdit && row.status !== "pending" && row.status !== "countered" ? (
        <ChatCardStatus>{hireCancelStatusLabel(row.status)}</ChatCardStatus>
      ) : null}
    </div>
  );

  return (
    <>
      <ChatCardShell
        tone="hire"
        icon={Ban}
        title={`คำขอยกเลิกงาน · ${row.initiated_by === "client" ? "ผู้จ้าง" : "ฟรีแลนซ์"}`}
        meta={
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="inline-flex items-center gap-1 text-[10px] hover:opacity-80"
          >
            <History className="w-3 h-3" />
            ประวัติ
          </button>
        }
        footer={footer}
      >
        <p className="text-xs font-semibold">{hireCancelStatusLabel(row.status)}</p>
        <div className="space-y-1.5 text-sm">
          <p className="leading-relaxed whitespace-pre-wrap">
            {hireCancelReasonLabel(row.reason_id, reasonRole)}
            {row.reason_note ? `\n${row.reason_note}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            เงื่อนไขเงิน: {hireCancelMoneyLabel(row.money_terms)}
            {row.status === "countered" && row.response_money_terms
              ? ` → ${hireCancelMoneyLabel(row.response_money_terms)}`
              : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            พิจารณาถึง {formatRemaining(row.respond_deadline_at)}
            {canEdit ? ` · แก้/ถอนได้ ${formatRemaining(row.edit_until_at)}` : ""}
          </p>
          {row.evidence_urls && row.evidence_urls.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {row.evidence_urls.slice(0, 5).map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-md overflow-hidden border border-border/50 bg-muted"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        {showHistory && <HireCancelHistoryList events={relatedHistory} />}
      </ChatCardShell>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ปฏิเสธการยกเลิก?</AlertDialogTitle>
            <AlertDialogDescription>งานจะดำเนินต่อ — แจ้งเหตุผลให้อีกฝ่ายทราบ</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>เหตุผล</Label>
            <Select value={rejectReason} onValueChange={setRejectReason}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HIRE_CANCEL_REJECT_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
              className="rounded-xl resize-none"
              placeholder="รายละเอียด (ถ้ามี)"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">กลับ</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void runRespond("reject", {
                  responseReasonId: rejectReason,
                  responseNote: rejectNote.trim(),
                });
              }}
            >
              ยืนยันปฏิเสธ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={compOpen} onOpenChange={setCompOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ขอค่าชดเชย 50%?</AlertDialogTitle>
            <AlertDialogDescription>
              บันทึกข้อตกลงในระบบ (ยังไม่โอนเงินอัตโนมัติ) — ผู้จ้างต้องยอมรับก่อนจึงยกเลิก
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={compNote}
            onChange={(e) => setCompNote(e.target.value)}
            rows={3}
            className="rounded-xl resize-none"
            placeholder="อธิบายงานที่ทำไปแล้วสั้น ๆ"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">กลับ</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void runRespond("compensation_50", { responseNote: compNote.trim() });
              }}
            >
              ส่งคำขอ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={counterOpen} onOpenChange={setCounterOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>เสนอเงื่อนไขเงิน</AlertDialogTitle>
            <AlertDialogDescription>สลับระหว่างคืนเต็มกับคืน 50% (บันทึกในระบบ)</AlertDialogDescription>
          </AlertDialogHeader>
          <Select
            value={counterTerms}
            onValueChange={(v) => setCounterTerms(v as HireCancelMoneyTerms)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_refund">คืนเต็มจำนวน</SelectItem>
              <SelectItem value="half_refund">คืน 50%</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">กลับ</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void runRespond("counter", { responseMoneyTerms: counterTerms });
              }}
            >
              ส่งข้อเสนอ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function HireCancelHistoryList({ events }: { events: HireCancelEventRow[] }) {
  if (!events.length) {
    return <p className="text-[11px] text-muted-foreground">ยังไม่มีประวัติ</p>;
  }
  return (
    <ul className="rounded-xl border border-border bg-background/60 px-2.5 py-2 space-y-1.5 max-h-36 overflow-y-auto">
      {events.map((e) => (
        <li key={e.id} className="text-[10px] leading-snug">
          <span className="font-medium">{hireCancelEventLabel(e.event_type)}</span>
          {e.diff_summary ? ` — ${e.diff_summary}` : ""}
          <span className="block opacity-70 text-muted-foreground">
            {new Date(e.created_at).toLocaleString("th-TH", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default HireCancelCard;
