import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import {
  JOB_REJECT_REASON_OPTIONS,
  type JobRejectReason,
} from "@/lib/jobApplicationReview";

type Props = {
  open: boolean;
  applicantName?: string | null;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: Exclude<JobRejectReason, "expired">, note: string) => void;
};

export default function JobRejectDialog({
  open,
  applicantName,
  busy,
  onOpenChange,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<Exclude<JobRejectReason, "expired"> | "">("");
  const [note, setNote] = useState("");
  const needNote = reason === "other";
  const canSend = !!reason && (!needNote || !!note.trim());

  const close = (next: boolean) => {
    if (!next) {
      setReason("");
      setNote("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogTitle className="thai-display pr-6">ปฏิเสธใบสมัคร</DialogTitle>
        <DialogDescription>
          {applicantName ? `เลือกเหตุผลที่จะบอก ${applicantName}` : "เลือกเหตุผลที่จะบอกผู้สมัคร"}
        </DialogDescription>
        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as Exclude<JobRejectReason, "expired">)}
          className="gap-2"
        >
          {JOB_REJECT_REASON_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              htmlFor={`reject-${opt.id}`}
              className="flex items-start gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 text-sm"
            >
              <RadioGroupItem id={`reject-${opt.id}`} value={opt.id} className="mt-0.5" />
              <span>{opt.company}</span>
            </label>
          ))}
        </RadioGroup>
        {needNote ? (
          <div>
            <Label htmlFor="reject-note">เหตุผลเพิ่มเติม</Label>
            <Textarea
              id="reject-note"
              className="rounded-xl mt-1"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="บอกสั้น ๆ ว่าทำไมปฏิเสธ"
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => close(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={!canSend || busy}
            onClick={() => {
              if (!reason) return;
              onConfirm(reason, note.trim());
            }}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            ส่งการปฏิเสธ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
