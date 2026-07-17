import { useState } from "react";
import { CalendarDays, Handshake, Loader2, MessageCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  COLLAB_REJECT_REASONS,
  type CollabRejectReasonId,
} from "@/lib/collabBrief";

export type CollabRejectAction = "decline" | "busy_chat";

export type CollabRejectRequestLite = {
  id: string;
  sender_name?: string | null;
  message?: string | null;
  timeline?: string | null;
  collab_types?: string[] | null;
  project_id?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: CollabRejectRequestLite | null;
  busy?: boolean;
  onConfirm: (input: {
    action: CollabRejectAction;
    reason: CollabRejectReasonId | "busy_but_chat";
    note: string;
  }) => void | Promise<void>;
};

const TYPE_LABELS: Record<string, string> = {
  chat: "พูดคุย",
  "joint-project": "ร่วมโปรเจกต์",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "Studio/ทีม",
  experiment: "งานทดลอง",
  content: "คอนเทนต์",
  other: "อื่นๆ",
};

const CollabRejectDialog = ({ open, onOpenChange, request, busy, onConfirm }: Props) => {
  const [reason, setReason] = useState<CollabRejectReasonId>("busy_now");
  const [note, setNote] = useState("");

  const reset = () => {
    setReason("busy_now");
    setNote("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  if (!request) return null;

  const types = (request.collab_types ?? [])
    .map((t) => TYPE_LABELS[t] ?? t)
    .filter(Boolean);
  const messagePreview = request.message?.trim() || "";

  const submit = async (action: CollabRejectAction) => {
    if (reason === "other" && !note.trim()) return;
    const reasonId = action === "busy_chat" ? "busy_but_chat" : reason;
    const resolvedNote =
      reason === "other" || action === "busy_chat"
        ? note.trim()
        : (COLLAB_REJECT_REASONS.find((r) => r.id === reason)?.label ?? note.trim());
    await onConfirm({
      action,
      reason: reasonId,
      note: resolvedNote,
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle>ยังไม่พร้อมร่วมงาน</DialogTitle>
          <DialogDescription className="sr-only">
            ปฏิเสธคำขอคอลแลปจาก {request.sender_name ?? "ผู้ส่ง"}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[hsl(var(--chat-collab)/0.3)] bg-[hsl(var(--chat-collab-soft))]/60 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Handshake className="w-4 h-4 text-[hsl(var(--chat-collab))] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                จาก {request.sender_name?.trim() || "ผู้ส่งคำขอ"}
              </p>
              {types.length ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ประเภท: <span className="text-foreground/90">{types.join(" · ")}</span>
                </p>
              ) : null}
            </div>
          </div>
          {request.timeline?.trim() ? (
            <span className="inline-flex items-center gap-1 text-xs text-foreground/90">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
              {request.timeline.trim()}
            </span>
          ) : null}
          {messagePreview ? (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3 leading-relaxed border-t border-border/40 pt-2">
              {messagePreview}
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">แจ้งเหตุผลให้เพื่อนทราบ</Label>
            <div className="flex flex-col gap-1.5 mt-2">
              {COLLAB_REJECT_REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "text-left px-3 py-2 rounded-xl text-sm border transition-colors",
                    reason === r.id
                      ? "border-[hsl(var(--chat-collab))] bg-[hsl(var(--chat-collab-soft))] text-foreground"
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
              <Label htmlFor="collab-reject-note" className="text-xs">
                รายละเอียดเพิ่มเติม *
              </Label>
              <Textarea
                id="collab-reject-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="mt-1.5 rounded-xl"
                placeholder="บอกสั้น ๆ ได้ตามสบาย"
              />
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            คอลแลปไม่มีปุ่มส่งต่องาน — ถ้ายังอยากคุยไอเดีย เลือก &quot;ยังไม่พร้อม แต่คุยได้&quot;
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy || (reason === "other" && !note.trim())}
            className="w-full rounded-full"
            onClick={() => void submit("busy_chat")}
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <MessageCircle className="w-4 h-4 mr-1" />
            )}
            ยังไม่พร้อม แต่คุยได้
          </Button>
          <Button
            type="button"
            disabled={busy || (reason === "other" && !note.trim())}
            className="w-full rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void submit("decline")}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            ยืนยันว่ายังไม่พร้อมร่วมงาน
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className="w-full rounded-full"
            onClick={() => handleOpenChange(false)}
          >
            กลับ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollabRejectDialog;
