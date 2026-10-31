import { useEffect, useState } from "react";
import { Ban, ChevronDown, Loader2, LogOut, ShieldOff, UserCheck, XCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { COLLAB_END_REASONS, type CollabEndRequestRow, type CollabEndTier } from "@/lib/collabEndRequest";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  tier: CollabEndTier;
  /** @deprecated pipeline step — no longer shown. */
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
  planRightsSnapshot,
  progressCount = 0,
  existing,
  busy,
  onSubmit,
}: Props) => {
  const [reasonId, setReasonId] = useState<string>(COLLAB_END_REASONS[0].id);
  const [note, setNote] = useState("");
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && existing) {
      setReasonId(existing.reason_id || COLLAB_END_REASONS[0].id);
      setNote(existing.reason_note || "");
      return;
    }
    setReasonId(COLLAB_END_REASONS[0].id);
    setNote("");
    setUnderstood(false);
  }, [open, mode, existing]);

  const canSubmit = (reasonId !== "other" || note.trim().length > 0) && (mode === "edit" || understood);

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
          <DialogDescription className="text-left">
            อีกฝ่ายทำต่อได้ทันที — คอลแลปนี้จะนับเป็น「ยกเลิก」สำหรับคุณ
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

          <div className="space-y-2.5 rounded-xl bg-muted/50 p-3">
            <p className="text-xs font-medium text-foreground">เมื่อถอนตัว</p>
            <ul className="space-y-2 text-xs text-foreground/85">
              <li className="flex gap-2">
                <ShieldOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
                สละสิทธิ์และเครดิตในงานนี้ทั้งหมด
              </li>
              <li className="flex gap-2">
                <UserCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                อีกฝ่ายทำต่อและใช้งานที่ทำร่วมกันได้ (อาจให้เครดิตคุณภายหลังตามดุลยพินิจ)
              </li>
              <li className="flex gap-2">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ไม่นับเป็นงานที่จบ
              </li>
            </ul>
            {showWorkContext && progressCount > 0 ? (
              <p className="text-xs text-muted-foreground">งานที่คุณทำไปแล้วในแผน: {progressCount} ชิ้น</p>
            ) : null}
            {showWorkContext && rightsPreview ? (
              <details className="group text-xs">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
                  ดูสิทธิ์ในแผนที่จะสละ
                </summary>
                <p className="mt-1.5 whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-2 text-muted-foreground">
                  {rightsPreview}
                </p>
              </details>
            ) : null}
          </div>

          {mode === "create" ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} disabled={busy} className="mt-0.5" />
              เข้าใจแล้ว ว่าจะสละสิทธิ์และเครดิตในงานนี้
            </label>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            ยังไม่ถอนตัว
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
            {mode === "edit" ? "บันทึกการแก้ไข" : "ถอนตัว"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollabEndRequestDialog;
