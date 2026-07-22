import { useState } from "react";
import { CalendarDays, Coins, Loader2, MessageCircle, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import {
  formatHireBudgetLabel,
  formatHireDeadlineLabel,
  formatHireJobTypesLabel,
  HIRE_REJECT_REASONS,
  type HireRejectReasonId,
} from "@/lib/hireBrief";
import type { HiringRow } from "@/hooks/useHiringRequests";
import { useFollowingList } from "@/hooks/useFollowLists";
import { useAuth } from "@/hooks/useAuth";

export type HireRejectAction = "decline" | "busy_chat" | "forward";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: HiringRow | null;
  busy?: boolean;
  onConfirm: (input: {
    action: HireRejectAction;
    reason: HireRejectReasonId | "busy_but_chat" | "forwarded";
    note: string;
    /** Optional note to the friend when forwarding (separate from client reason). */
    friendNote?: string;
    forwardToUserId?: string;
    forwardToDisplayName?: string;
  }) => void | Promise<void>;
};

function hireJobTypeSummary(request: HiringRow): string | null {
  const jobType = (request as { job_type?: string | null }).job_type?.trim();
  const other = (request as { job_type_other?: string | null }).job_type_other?.trim();
  if (!jobType) return null;
  if (jobType === "other" && other) return `อื่นๆ — ${other}`;
  return formatHireJobTypesLabel(jobType) ?? jobType;
}

const HireRejectDialog = ({ open, onOpenChange, request, busy, onConfirm }: Props) => {
  const { user } = useAuth();
  const { data: following = [], isLoading: followingLoading } = useFollowingList(
    open ? user?.id : undefined,
  );
  const [reason, setReason] = useState<HireRejectReasonId>("queue_full");
  const [note, setNote] = useState("");
  const [friendNote, setFriendNote] = useState("");
  const [mode, setMode] = useState<"reasons" | "forward">("reasons");
  const [forwardTo, setForwardTo] = useState<string | null>(null);

  const reset = () => {
    setReason("queue_full");
    setNote("");
    setFriendNote("");
    setMode("reasons");
    setForwardTo(null);
  };

  const clientMessageForReason = () =>
    reason === "other"
      ? note.trim()
      : (HIRE_REJECT_REASONS.find((r) => r.id === reason)?.label ?? note.trim());

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  if (!request) return null;

  const budgetLabel = formatHireBudgetLabel({
    budget_min: (request as { budget_min?: number | null }).budget_min,
    budget_max: (request as { budget_max?: number | null }).budget_max,
    budget_amount: request.budget_amount,
    budget: request.budget as string | null,
  });
  const deadlineLabel = formatHireDeadlineLabel(request.deadline);
  const jobTypeSummary = hireJobTypeSummary(request);
  const messagePreview = request.message?.trim() || "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle>{mode === "forward" ? "ส่งต่องานให้เพื่อน" : "ไม่สนใจคำขอจ้าง"}</DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "forward"
              ? "เลือกคนที่คุณติดตามเพื่อส่งต่องาน"
              : `ไม่สนใจคำขอจาก ${request.client_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[hsl(var(--chat-hire)/0.3)] bg-[hsl(var(--chat-hire-soft))]/60 p-3 space-y-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              จาก {request.client_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              อ้างอิง: <span className="text-foreground/90">{request.project_title}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {budgetLabel ? (
              <span className="inline-flex items-center gap-1 text-[hsl(var(--chat-hire))]">
                <Coins className="w-3.5 h-3.5" />
                งบ {budgetLabel}
              </span>
            ) : null}
            {deadlineLabel ? (
              <span className="inline-flex items-center gap-1 text-foreground/90">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                ส่ง {deadlineLabel}
              </span>
            ) : null}
            {jobTypeSummary ? (
              <span className="text-muted-foreground">ประเภท: {jobTypeSummary}</span>
            ) : null}
          </div>
          {messagePreview ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed border-t border-border/40 pt-2">
              {messagePreview}
            </p>
          ) : null}
        </div>

        {mode === "forward" ? (
          <p className="text-xs text-muted-foreground -mt-1">
            เลือกคนที่คุณติดตาม — ระบบจะสร้างคำขอใหม่ให้เขา และปิดคำขอนี้ของคุณ
          </p>
        ) : null}

        {mode === "reasons" ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">ไม่สนใจทันทีไม่คุยต่อ โดยให้เหตุผล:</Label>
              <div className="flex flex-col gap-1.5 mt-2">
                {HIRE_REJECT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReason(r.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-xl text-sm border transition-colors",
                      reason === r.id
                        ? "border-[hsl(var(--chat-hire))] bg-[hsl(var(--chat-hire-soft))] text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {(reason === "other") && (
              <div>
                <Label htmlFor="hire-reject-note" className="text-xs">
                  รายละเอียดเพิ่มเติม *
                </Label>
                <Textarea
                  id="hire-reject-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="บอกสั้นๆ ให้ลูกค้าเข้าใจได้"
                  className="rounded-xl mt-1.5"
                />
              </div>
            )}

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">ตัวเลือกอื่น</p>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-xl h-auto py-2.5 gap-2"
                disabled={busy}
                onClick={() => setMode("forward")}
              >
                <Share2 className="w-4 h-4 text-[hsl(var(--chat-hire))]" />
                <span className="text-left">
                  <span className="block text-sm font-medium">ส่งต่องาน</span>
                  <span className="block text-[11px] text-muted-foreground font-normal">
                    แนะนำให้เพื่อนที่ติดตามที่น่าจะรับแทนได้
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-xl h-auto py-2.5 gap-2"
                disabled={busy}
                onClick={() =>
                  void onConfirm({
                    action: "busy_chat",
                    reason: "busy_but_chat",
                    note:
                      note.trim() ||
                      "ยังไม่พร้อมรับงานช่วงนี้จากเวลา/งบที่แจ้งมา แต่ยินดีคุยรายละเอียดก่อน",
                  })
                }
              >
                <MessageCircle className="w-4 h-4 text-[hsl(var(--chat-hire))]" />
                <span className="text-left">
                  <span className="block text-sm font-medium">ยังไม่พร้อมทำ แต่คุยได้</span>
                  <span className="block text-[11px] text-muted-foreground font-normal">
                    เปิดแชทต่อ — แจ้งว่าเวล/งบอาจยังไม่ตรง
                  </span>
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Button type="button" variant="ghost" size="sm" className="rounded-full -ml-2" onClick={() => setMode("reasons")}>
              ← กลับไปเหตุผล
            </Button>

            <div>
              <Label className="text-xs">ส่งต่อให้เพื่อน</Label>
              {followingLoading ? (
                <div className="flex items-center h-10 mt-1.5 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : following.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-1.5">
                  ยังไม่ได้ติดตามใคร — ติดตามเพื่อนครีเอเตอร์ก่อนเพื่อส่งต่องานได้
                </p>
              ) : (
                <Select value={forwardTo ?? undefined} onValueChange={setForwardTo}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="เลือกเพื่อนที่ติดตาม" />
                  </SelectTrigger>
                  <SelectContent>
                    {following.map((f) => (
                      <SelectItem key={f.userId} value={f.userId}>
                        {f.displayName}
                        {f.username ? ` (@${f.username})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="hire-forward-friend-note" className="text-xs">
                ข้อความถึงเพื่อน
              </Label>
              <Textarea
                id="hire-forward-friend-note"
                rows={2}
                value={friendNote}
                onChange={(e) => setFriendNote(e.target.value)}
                placeholder="ข้อความถึงเพื่อน (ไม่บังคับ)"
                className="rounded-xl mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs">ข้อความถึงผู้จ้าง</Label>
              <div className="flex flex-col gap-1.5 mt-2">
                {HIRE_REJECT_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setReason(r.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-xl text-sm border transition-colors",
                      reason === r.id
                        ? "border-[hsl(var(--chat-hire))] bg-[hsl(var(--chat-hire-soft))] text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {reason === "other" ? (
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="รายละเอียดถึงผู้จ้าง *"
                  className="rounded-xl mt-2"
                />
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => handleOpenChange(false)}>
            ยกเลิก
          </Button>
          {mode === "reasons" ? (
            <Button
              type="button"
              variant="destructive"
              disabled={busy || (reason === "other" && !note.trim())}
              className="rounded-full"
              onClick={() =>
                void onConfirm({
                  action: "decline",
                  reason,
                  note: note.trim(),
                })
              }
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ยืนยันไม่สนใจ"}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy || !forwardTo || (reason === "other" && !note.trim())}
              className="rounded-full bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
              onClick={() => {
                if (!forwardTo) return;
                const friend = following.find((f) => f.userId === forwardTo);
                void onConfirm({
                  action: "forward",
                  reason,
                  note: clientMessageForReason(),
                  friendNote: friendNote.trim(),
                  forwardToUserId: forwardTo,
                  forwardToDisplayName: friend?.displayName,
                });
              }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ส่งต่องาน"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireRejectDialog;
