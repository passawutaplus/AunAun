import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Loader2, LogOut } from "lucide-react";
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
import {
  COLLAB_END_REASONS,
  COLLAB_END_WITHDRAW_WARNING,
  collabEndPlanStepLabel,
  collabEndTierHint,
  type CollabEndRequestRow,
  type CollabEndTier,
} from "@/lib/collabEndRequest";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  tier: CollabEndTier;
  planStep?: string | null;
  planRightsSnapshot?: string | null;
  progressCount?: number;
  existing?: CollabEndRequestRow | null;
  busy?: boolean;
  onSubmit: (input: { reasonId: string; reasonNote: string }) => void | Promise<void>;
};

const CollabEndRequestDialog = ({
  open,
  onOpenChange,
  mode,
  tier,
  planStep,
  planRightsSnapshot,
  progressCount = 0,
  existing,
  busy,
  onSubmit,
}: Props) => {
  const [reasonId, setReasonId] = useState<string>(COLLAB_END_REASONS[0].id);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && existing) {
      setReasonId(existing.reason_id || COLLAB_END_REASONS[0].id);
      setNote(existing.reason_note || "");
      return;
    }
    setReasonId(COLLAB_END_REASONS[0].id);
    setNote("");
  }, [open, mode, existing]);

  const canSubmit = reasonId !== "other" || note.trim().length > 0;

  const stepLabel = collabEndPlanStepLabel(planStep ?? existing?.plan_step);
  const showWorkContext = tier === "active";
  const rightsPreview =
    planRightsSnapshot?.trim() || existing?.plan_rights_snapshot?.trim() || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-destructive" />
            {mode === "edit" ? "แก้ไขเหตุผลถอนตัว" : "ถอนตัวจากคอลแลป"}
          </DialogTitle>
          <DialogDescription className="text-left space-y-1">
            <span className="block">{collabEndTierHint(tier)}</span>
            {stepLabel ? (
              <span className="block text-foreground/80">ขั้นปัจจุบัน: 「{stepLabel}」</span>
            ) : null}
            <span className="block font-medium text-destructive/90">
              ยุติก่อนจบ = ไม่นับเป็นจบงาน — สถานะจะเป็น「ยกเลิก」
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="collab-end-reason">เหตุผล</Label>
            <Select value={reasonId} onValueChange={setReasonId} disabled={busy}>
              <SelectTrigger id="collab-end-reason" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLAB_END_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="collab-end-note">
              รายละเอียด{reasonId === "other" ? " (จำเป็น)" : " (ถ้ามี)"}
            </Label>
            <Textarea
              id="collab-end-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              rows={3}
              className="rounded-xl resize-none"
              placeholder="บอกอีกฝ่ายสั้น ๆ ได้"
            />
          </div>

          <div
            className={cn(
              "space-y-2.5 rounded-xl border p-3",
              showWorkContext
                ? "border-destructive/35 bg-destructive/5"
                : "border-destructive/25 bg-destructive/[0.03]",
            )}
          >
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-destructive">
                  {COLLAB_END_WITHDRAW_WARNING.title}
                </p>
                <p className="text-xs text-foreground/85 leading-relaxed">
                  {COLLAB_END_WITHDRAW_WARNING.body}
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {COLLAB_END_WITHDRAW_WARNING.footnote}
                </p>
              </div>
            </div>

            {showWorkContext && progressCount > 0 ? (
              <p className="text-xs text-foreground/80 pl-6">
                ความคืบหน้าของคุณในแผน: {progressCount} ชิ้น
              </p>
            ) : null}

            {showWorkContext && rightsPreview ? (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap rounded-lg bg-background/60 p-2 border border-border/60 ml-6">
                <span className="font-medium text-foreground/80">สิทธิ์ในแผน (จะสละทั้งหมด): </span>
                {rightsPreview}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            ทำต่อ
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={busy || !canSubmit}
            onClick={() =>
              void onSubmit({
                reasonId,
                reasonNote: note.trim(),
              })
            }
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <LogOut className="w-4 h-4 mr-1" />
            )}
            {mode === "edit" ? "บันทึกการแก้ไข" : "ยืนยันถอนตัว"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollabEndRequestDialog;
