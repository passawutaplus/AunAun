import { useMemo, useState } from "react";
import { Check, Loader2, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
import { Label } from "@/components/ui/label";
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
import {
  ackPreviewText,
  collabGroupExpandStatusLabel,
  formatCollabGroupExpandRemaining,
  isCollabGroupExpandOpenStatus,
  parseAckPreview,
  planModeLabel,
  type CollabGroupExpandCardPayload,
  type CollabGroupExpandRequestRow,
} from "@/lib/collabGroupExpand";
import {
  useCollabGroupExpandById,
  useRespondCollabGroupExpandRequest,
  useWithdrawCollabGroupExpandRequest,
} from "@/hooks/useCollabGroupExpand";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Props = {
  payload: CollabGroupExpandCardPayload;
  mine: boolean;
  userId?: string | null;
  sourceMemberIds: string[];
  partnerUserId?: string | null;
  onWithdraw?: (row: CollabGroupExpandRequestRow) => void;
  withdrawBusy?: boolean;
};

export function CollabGroupExpandCard({
  payload,
  mine,
  userId,
  sourceMemberIds,
  partnerUserId,
  onWithdraw,
  withdrawBusy,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = userId ?? user?.id ?? null;
  const { data: row, isLoading } = useCollabGroupExpandById(payload.expandRequestId);
  const respond = useRespondCollabGroupExpandRequest();
  const withdraw = useWithdrawCollabGroupExpandRequest();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const ackPreview = useMemo(
    () => parseAckPreview(row?.ack_preview),
    [row?.ack_preview],
  );

  if (isLoading || !row) {
    return (
      <div className="rounded-2xl border border-border bg-card px-3 py-3 text-xs text-muted-foreground min-w-[16rem]">
        {isLoading ? "โหลดคำขอสร้างกลุ่ม…" : "ไม่พบคำขอ"}
      </div>
    );
  }

  const isProposer = !!uid && row.proposed_by === uid;
  const canRespond =
    isCollabGroupExpandOpenStatus(row.status) && !!uid && !isProposer;
  const busy = respond.isPending || withdraw.isPending || !!withdrawBusy;
  const invitedCount = row.new_member_ids.length;

  const runRespond = async (action: "accept" | "reject") => {
    if (!uid || !partnerUserId) return;
    try {
      const result = await respond.mutateAsync({
        row,
        userId: uid,
        proposerUserId: row.proposed_by,
        sourceMemberIds,
        action,
        responseNote: action === "reject" ? rejectNote : undefined,
        notifyUserIds: [row.proposed_by, uid],
      });
      if (action === "accept" && result.result_conversation_id) {
        toast.success("สร้างกลุ่มแล้ว — เปิดแผนเพื่อยืนยันขั้นปัจจุบัน");
        navigate(`/chat/${result.result_conversation_id}`);
      } else {
        toast.success("ปฏิเสธการสร้างกลุ่มแล้ว — ยังแชทคู่ต่อได้");
      }
      setRejectOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const runWithdraw = async () => {
    if (!uid || !partnerUserId) {
      onWithdraw?.(row);
      return;
    }
    try {
      await withdraw.mutateAsync({
        row,
        userId: uid,
        partnerUserId,
      });
      toast.success("ถอนคำขอสร้างกลุ่มแล้ว");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ถอนไม่สำเร็จ");
    }
  };

  const footer = (
    <div className="flex flex-col gap-2">
      {isProposer && isCollabGroupExpandOpenStatus(row.status) && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          className="w-full rounded-full h-8 text-xs text-muted-foreground"
          onClick={() => (onWithdraw ? onWithdraw(row) : void runWithdraw())}
        >
          {withdrawBusy || withdraw.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : null}
          ถอนคำขอ
        </Button>
      )}

      {canRespond && (
        <>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="w-full rounded-full h-8 text-xs bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
            onClick={() => void runRespond("accept")}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            ยืนยันสร้างกลุ่ม
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            className="w-full rounded-full h-8 text-xs"
            onClick={() => setRejectOpen(true)}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            ไม่สร้างกลุ่ม
          </Button>
        </>
      )}

      {row.status === "approved" && row.result_conversation_id ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full rounded-full h-8 text-xs"
          onClick={() => navigate(`/chat/${row.result_conversation_id}`)}
        >
          เปิดกลุ่ม
        </Button>
      ) : null}

      {!canRespond && !(isProposer && isCollabGroupExpandOpenStatus(row.status)) ? (
        <ChatCardStatus>{collabGroupExpandStatusLabel(row.status)}</ChatCardStatus>
      ) : null}
    </div>
  );

  return (
    <>
      <ChatCardShell
        tone="collab"
        icon={Users}
        title="คำขอสร้างกลุ่มคอลแลป"
        footer={footer}
        className={mine ? "ring-1 ring-[hsl(var(--chat-collab)/0.2)]" : undefined}
      >
        <p className="text-xs font-semibold">{collabGroupExpandStatusLabel(row.status)}</p>
        {row.status === "pending" ? (
          <p className="text-[11px] text-muted-foreground">
            ตอบภายใน {formatCollabGroupExpandRemaining(row.expires_at)}
          </p>
        ) : null}
        <div className="space-y-1.5 text-sm">
          <p>
            <span className="text-muted-foreground">ชื่อกลุ่ม: </span>
            {row.group_title}
          </p>
          <p>
            <span className="text-muted-foreground">ชวนเพิ่ม: </span>
            {invitedCount} คน
          </p>
          <p>
            <span className="text-muted-foreground">แผน: </span>
            {planModeLabel(row.plan_mode)}
          </p>
          {row.plan_mode === "migrate" && ackPreview ? (
            <p className="text-xs text-[hsl(var(--chat-collab))]">{ackPreviewText(ackPreview)}</p>
          ) : null}
          {row.response_note?.trim() ? (
            <p className="text-xs text-muted-foreground italic">« {row.response_note.trim()} »</p>
          ) : null}
        </div>
      </ChatCardShell>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ปฏิเสธการสร้างกลุ่ม</AlertDialogTitle>
            <AlertDialogDescription>
              บอกอีกฝ่ายว่าทำไมยังไม่อยากขยายเป็นกลุ่ม — แชทคู่ยังใช้ต่อได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-1">
            <Label>หมายเหตุ (ถ้ามี)</Label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">กลับ</AlertDialogCancel>
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
    </>
  );
}

export default CollabGroupExpandCard;
