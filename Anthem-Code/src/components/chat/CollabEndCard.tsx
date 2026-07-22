import { useMemo, useState } from "react";
import { Ban, Check, Gift, History, Loader2, X } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  COLLAB_END_CREDIT_OUTCOMES,
  COLLAB_END_REJECT_REASONS,
  COLLAB_END_VOLUNTARY_CREDIT_OUTCOMES,
  canEditCollabEndRequest,
  canGrantVoluntaryCollabEndCredit,
  canRespondToCollabEndRequest,
  collabEndCreditOutcomeLabel,
  collabEndPlanStepLabel,
  collabEndReasonLabel,
  collabEndSettlementSummary,
  collabEndStatusLabel,
  creditRequestedSummary,
  formatCollabEndRemaining,
  isCollabEndApprovedStatus,
  isCollabEndInstantExit,
  type CollabEndCardPayload,
  type CollabEndCreditOutcome,
  type CollabEndRequestRow,
} from "@/lib/collabEndRequest";
import {
  useCollabEndById,
  useCollabEndHistory,
  useGrantVoluntaryCollabEndCredit,
  useRespondCollabEndRequest,
} from "@/hooks/useCollabEndRequest";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Props = {
  payload: CollabEndCardPayload;
  mine: boolean;
  userId?: string | null;
  onEdit?: (row: CollabEndRequestRow) => void;
  onWithdraw?: (row: CollabEndRequestRow) => void;
  withdrawBusy?: boolean;
};

export function CollabEndCard({
  payload,
  mine,
  userId,
  onEdit,
  onWithdraw,
  withdrawBusy,
}: Props) {
  const { user } = useAuth();
  const uid = userId ?? user?.id ?? null;
  const { data: row, isLoading } = useCollabEndById(payload.endRequestId);
  const { data: history = [] } = useCollabEndHistory(payload.collabRequestId);
  const respond = useRespondCollabEndRequest();
  const grantCredit = useGrantVoluntaryCollabEndCredit();
  const [showHistory, setShowHistory] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(COLLAB_END_REJECT_REASONS[0].id);
  const [rejectNote, setRejectNote] = useState("");
  const [creditOutcome, setCreditOutcome] = useState<CollabEndCreditOutcome>("per_plan");
  const [creditNote, setCreditNote] = useState("");
  const [voluntaryOutcome, setVoluntaryOutcome] = useState<CollabEndCreditOutcome>("per_plan");
  const [voluntaryNote, setVoluntaryNote] = useState("");

  const relatedHistory = useMemo(
    () => history.filter((e) => e.end_request_id === payload.endRequestId),
    [history, payload.endRequestId],
  );

  if (isLoading || !row) {
    return (
      <div className="rounded-2xl border border-border bg-card px-3 py-3 text-xs text-muted-foreground min-w-[16rem]">
        {isLoading ? "โหลดการถอนตัว…" : "ไม่พบรายการถอนตัว"}
      </div>
    );
  }

  const isInitiator = !!uid && row.initiator_id === uid;
  const canEdit = canEditCollabEndRequest(row, uid);
  const canRespond = canRespondToCollabEndRequest(row, uid);
  const canGrantCredit = canGrantVoluntaryCollabEndCredit(row, uid);
  const busy = respond.isPending || grantCredit.isPending || !!withdrawBusy;
  const stepLabel = collabEndPlanStepLabel(row.plan_step);

  const creditSummary = creditRequestedSummary(row);
  const needsCreditDecision = row.credit_mode === "credit_requested" && row.status === "pending";
  const instantExit = isCollabEndInstantExit(row);
  const cardTitle = instantExit || isCollabEndApprovedStatus(row.status) ? "ถอนตัวจากคอลแลป" : "คำขอยุติคอลแลป";

  const runRespond = async (
    action: "accept" | "reject",
    credit?: { outcome?: CollabEndCreditOutcome; note?: string },
  ) => {
    try {
      await respond.mutateAsync({
        row,
        userId: uid!,
        otherUserId: row.initiator_id,
        action,
        responseReasonId: action === "reject" ? rejectReason : undefined,
        responseNote: action === "reject" ? rejectNote : undefined,
        responseCreditOutcome:
          action === "accept" && needsCreditDecision ? credit?.outcome : undefined,
        responseCreditNote:
          action === "accept" && needsCreditDecision ? credit?.note : undefined,
      });
      toast.success(
        action === "accept"
          ? needsCreditDecision
            ? `ยุติแล้ว — ${collabEndCreditOutcomeLabel(credit?.outcome)}`
            : "ยุติคอลแลปแล้ว — ไม่นับเป็นจบงาน"
          : "ปฏิเสธการยุติแล้ว — ทำต่อได้",
      );
      setRejectOpen(false);
      setAcceptOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const runGrantCredit = async () => {
    try {
      await grantCredit.mutateAsync({
        row,
        userId: uid!,
        otherUserId: row.initiator_id,
        outcome: voluntaryOutcome,
        note: voluntaryNote,
      });
      toast.success(`บันทึกเครดิตแล้ว — ${collabEndCreditOutcomeLabel(voluntaryOutcome)}`);
      setGrantOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ให้เครดิตไม่สำเร็จ");
    }
  };

  const openAccept = () => {
    if (needsCreditDecision) {
      setCreditOutcome(row.plan_rights_snapshot?.trim() ? "per_plan" : "deny_credit");
      setCreditNote("");
      setAcceptOpen(true);
      return;
    }
    void runRespond("accept");
  };

  const footer = (
    <div className="flex flex-col gap-2">
      {canGrantCredit && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className="w-full rounded-full h-8 text-xs border-[hsl(var(--chat-collab)/0.4)]"
          onClick={() => {
            setVoluntaryOutcome(row.plan_rights_snapshot?.trim() ? "per_plan" : "grant_partial");
            setVoluntaryNote("");
            setGrantOpen(true);
          }}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Gift className="w-3.5 h-3.5 mr-1" />
          )}
          ให้เครดิต (ไม่บังคับ)
        </Button>
      )}

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
            แก้ไขเหตุผล
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
            className="w-full rounded-full h-8 text-xs bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
            onClick={openAccept}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            ยืนยันยุติคอลแลป
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
            ยังทำต่อ
          </Button>
        </>
      )}

      {!canRespond && !canEdit && !canGrantCredit && row.status !== "pending" ? (
        <ChatCardStatus>{collabEndStatusLabel(row.status)}</ChatCardStatus>
      ) : null}
    </div>
  );

  return (
    <>
      <ChatCardShell
        tone="collab"
        icon={Ban}
        title={cardTitle}
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
        className={mine ? "ring-1 ring-[hsl(var(--chat-collab)/0.2)]" : undefined}
      >
        <p className="text-xs font-semibold">{collabEndStatusLabel(row.status)}</p>
        {instantExit ? (
          <p className="text-[11px] text-muted-foreground">
            สละสิทธิ์และเครดิตทั้งหมด · อีกฝ่ายทำต่อได้
          </p>
        ) : null}
        {row.status === "pending" && needsCreditDecision ? (
          <p className="text-[11px] text-muted-foreground">
            ตอบภายใน {formatCollabEndRemaining(row.respond_deadline_at)}
          </p>
        ) : null}
        <div className="space-y-1.5 text-sm">
          <p className="leading-relaxed whitespace-pre-wrap">
            {collabEndReasonLabel(row.reason_id)}
            {row.reason_note?.trim() ? ` — ${row.reason_note.trim()}` : ""}
          </p>
          {stepLabel ? (
            <p className="text-xs text-muted-foreground">ขั้นแผนตอนถอนตัว: 「{stepLabel}」</p>
          ) : null}
          <p className="text-xs">
            <span className="text-muted-foreground">ผลหลังถอน: </span>
            {collabEndSettlementSummary(row.handoff_terms, row.credit_mode)}
          </p>
          {needsCreditDecision && creditSummary ? (
            <p className="text-xs text-[hsl(var(--chat-collab))]">
              <span className="text-muted-foreground">เครดิตที่ขอ (legacy): </span>
              {creditSummary}
            </p>
          ) : instantExit && !row.response_credit_outcome ? (
            <p className="text-xs text-muted-foreground">ไม่ claim สิทธิ์/เครดิต — อีกฝ่ายให้ได้ตามต้องการ</p>
          ) : null}
          {row.plan_rights_snapshot?.trim() ? (
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">
              สิทธิ์ในแผน: {row.plan_rights_snapshot.trim()}
            </p>
          ) : null}
          {isCollabEndApprovedStatus(row.status) && row.response_credit_outcome ? (
            <p className="text-xs font-medium">
              <span className="text-muted-foreground">เครดิตที่ให้: </span>
              {collabEndCreditOutcomeLabel(row.response_credit_outcome)}
              {row.response_credit_note?.trim() ? ` — ${row.response_credit_note.trim()}` : ""}
            </p>
          ) : null}
          <p className="text-[11px] text-destructive/90 font-medium">
            ยุติก่อนจบ = ไม่นับเป็นจบงาน
          </p>
        </div>

        {showHistory && relatedHistory.length > 0 ? (
          <ul className="mt-2 pt-2 border-t border-border/60 space-y-1 text-[11px] text-muted-foreground">
            {relatedHistory.map((ev) => (
              <li key={ev.id}>
                {new Date(ev.created_at).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}{" "}
                · {ev.diff_summary || ev.event_type}
              </li>
            ))}
          </ul>
        ) : null}
      </ChatCardShell>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ปฏิเสธการยุติคอลแลป</AlertDialogTitle>
            <AlertDialogDescription>
              บอกอีกฝ่ายว่าทำไมยังอยากทำต่อ — แชทยังเปิดได้ตามปกติ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>เหตุผล</Label>
              <Select value={rejectReason} onValueChange={setRejectReason}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLLAB_END_REJECT_REASONS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุ (ถ้ามี)</Label>
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">ทำต่อ</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void runRespond("reject");
              }}
            >
              ส่งการปฏิเสธ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันยุติ + ตัดสินเครดิต</AlertDialogTitle>
            <AlertDialogDescription>
              อีกฝ่ายขอเครดิต/สิทธิ์ — เลือกผลลัพธ์เพื่อบันทึกเป็นหลักฐาน (ยุติก่อนจบ = ไม่นับเป็นจบงาน)
            </AlertDialogDescription>
          </AlertDialogHeader>
          {creditSummary ? (
            <p className="text-sm rounded-xl bg-muted/50 p-2.5">{creditSummary}</p>
          ) : null}
          <div className="space-y-3 py-1">
            <RadioGroup
              value={creditOutcome}
              onValueChange={(v) => setCreditOutcome(v as CollabEndCreditOutcome)}
              className="space-y-2"
            >
              {COLLAB_END_CREDIT_OUTCOMES.map((opt) => (
                <label
                  key={opt.id}
                  htmlFor={`credit-out-${opt.id}`}
                  className="flex items-start gap-2 rounded-xl border border-border p-2.5 cursor-pointer"
                >
                  <RadioGroupItem value={opt.id} id={`credit-out-${opt.id}`} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{opt.label}</span>
                    {opt.hint ? (
                      <span className="block text-[11px] text-muted-foreground">{opt.hint}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </RadioGroup>
            {(creditOutcome === "grant_partial" || creditOutcome === "grant_full") && (
              <div className="space-y-1.5">
                <Label>
                  หมายเหตุ{creditOutcome === "grant_partial" ? " (จำเป็น)" : " (ถ้ามี)"}
                </Label>
                <Textarea
                  value={creditNote}
                  onChange={(e) => setCreditNote(e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none"
                  placeholder="เช่น ให้เครดิต assistant เท่านั้น"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">ทำต่อ</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void runRespond("accept", { outcome: creditOutcome, note: creditNote });
              }}
            >
              ยืนยันยุติ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={grantOpen} onOpenChange={setGrantOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>ให้เครดิต/สิทธิ์ (ไม่บังคับ)</AlertDialogTitle>
            <AlertDialogDescription>
              อีกฝ่ายสละสิทธิ์ตอนถอนตัวแล้ว — คุณให้เครดิตได้ตามดุลยพินิจ บันทึกไว้ตอนลงผลงาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-1">
            <RadioGroup
              value={voluntaryOutcome}
              onValueChange={(v) => setVoluntaryOutcome(v as CollabEndCreditOutcome)}
              className="space-y-2"
            >
              {COLLAB_END_VOLUNTARY_CREDIT_OUTCOMES.map((opt) => (
                <label
                  key={opt.id}
                  htmlFor={`vol-credit-${opt.id}`}
                  className="flex items-start gap-2 rounded-xl border border-border p-2.5 cursor-pointer"
                >
                  <RadioGroupItem value={opt.id} id={`vol-credit-${opt.id}`} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{opt.label}</span>
                    {opt.hint ? (
                      <span className="block text-[11px] text-muted-foreground">{opt.hint}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </RadioGroup>
            {(voluntaryOutcome === "grant_partial" || voluntaryOutcome === "grant_full") && (
              <div className="space-y-1.5">
                <Label>
                  หมายเหตุ{voluntaryOutcome === "grant_partial" ? " (จำเป็น)" : " (ถ้ามี)"}
                </Label>
                <Textarea
                  value={voluntaryNote}
                  onChange={(e) => setVoluntaryNote(e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none"
                  placeholder="เช่น ให้เครดิต character design"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">ไม่ให้</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              onClick={(e) => {
                e.preventDefault();
                void runGrantCredit();
              }}
            >
              บันทึกเครดิต
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CollabEndCard;
