import { useMemo, useState } from "react";
import { Check, History, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
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

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden shadow-sm min-w-[16rem] max-w-[22rem]",
        mine
          ? "border-white/25 bg-[hsl(var(--chat-hire))] text-white"
          : "border-[hsl(var(--chat-hire)/0.35)] bg-[hsl(var(--chat-hire-soft))] text-foreground",
      )}
    >
      <div className="px-3.5 pt-3 pb-1 flex items-start justify-between gap-2">
        <div>
          <p className={cn("text-[11px] font-medium", mine ? "text-white/80" : "text-muted-foreground")}>
            คำขอยกเลิกงาน · {row.initiated_by === "client" ? "ผู้จ้าง" : "ฟรีแลนซ์"}
          </p>
          <p className="text-xs font-semibold mt-0.5">{hireCancelStatusLabel(row.status)}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1 text-[10px] shrink-0",
            mine ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <History className="w-3 h-3" />
          ประวัติ
        </button>
      </div>

      <div className="px-3.5 pb-2.5 space-y-1.5 text-sm">
        <p className="leading-relaxed whitespace-pre-wrap">
          {hireCancelReasonLabel(row.reason_id, reasonRole)}
          {row.reason_note ? `\n${row.reason_note}` : ""}
        </p>
        <p className={cn("text-[11px]", mine ? "text-white/80" : "text-muted-foreground")}>
          เงื่อนไขเงิน: {hireCancelMoneyLabel(row.money_terms)}
          {row.status === "countered" && row.response_money_terms
            ? ` → ${hireCancelMoneyLabel(row.response_money_terms)}`
            : ""}
        </p>
        <p className={cn("text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>
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

      {showHistory && (
        <HireCancelHistoryList
          events={relatedHistory}
          mine={mine}
        />
      )}

      {isInitiator && canEdit && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className={cn(
              "w-full rounded-full h-8 text-xs",
              mine
                ? "border-white/40 bg-transparent text-white hover:bg-white/10"
                : "",
            )}
            onClick={() => onEdit?.(row)}
          >
            แก้ไขคำขอ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            className={cn(
              "w-full rounded-full h-8 text-xs",
              mine ? "text-white/90 hover:bg-white/10" : "text-muted-foreground",
            )}
            onClick={() => onWithdraw?.(row)}
          >
            {withdrawBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            ถอนคำขอ
          </Button>
        </div>
      )}

      {canRespond && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className={cn(
              "w-full rounded-full h-8 text-xs",
              mine
                ? "bg-white text-[hsl(var(--chat-hire))] hover:bg-white/90"
                : "bg-[hsl(var(--chat-hire))] text-white hover:opacity-90",
            )}
            onClick={() => void runRespond("accept")}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            ยอมรับยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className={cn(
              "w-full rounded-full h-8 text-xs",
              mine ? "border-white/40 bg-transparent text-white hover:bg-white/10" : "",
            )}
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
              className={cn(
                "w-full rounded-full h-8 text-xs",
                mine ? "border-white/40 bg-transparent text-white hover:bg-white/10" : "",
              )}
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
              className={cn(
                "w-full rounded-full h-8 text-xs",
                mine ? "text-white/90 hover:bg-white/10" : "text-muted-foreground",
              )}
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
        </div>
      )}

      {!canRespond && !canEdit && row.status !== "pending" && row.status !== "countered" ? (
        <p
          className={cn(
            "px-3 pb-3 text-[11px]",
            mine ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {hireCancelStatusLabel(row.status)}
        </p>
      ) : null}

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
    </div>
  );
}

function HireCancelHistoryList({
  events,
  mine,
}: {
  events: HireCancelEventRow[];
  mine: boolean;
}) {
  if (!events.length) {
    return (
      <p className={cn("px-3.5 pb-2 text-[11px]", mine ? "text-white/70" : "text-muted-foreground")}>
        ยังไม่มีประวัติ
      </p>
    );
  }
  return (
    <ul
      className={cn(
        "mx-3 mb-2 rounded-xl border px-2.5 py-2 space-y-1.5 max-h-36 overflow-y-auto",
        mine ? "border-white/20 bg-black/10" : "border-border bg-background/60",
      )}
    >
      {events.map((e) => (
        <li key={e.id} className="text-[10px] leading-snug">
          <span className="font-medium">{hireCancelEventLabel(e.event_type)}</span>
          {e.diff_summary ? ` — ${e.diff_summary}` : ""}
          <span className={cn("block opacity-70", mine ? "text-white/70" : "text-muted-foreground")}>
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
