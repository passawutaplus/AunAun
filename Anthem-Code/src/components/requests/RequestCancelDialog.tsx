import { useState } from "react";
import { Loader2 } from "lucide-react";
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
  REQUEST_CANCEL_REASONS,
  type RequestCancelReasonId,
} from "@/lib/requestOutcome";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  busy?: boolean;
  onConfirm: (input: { reason: RequestCancelReasonId; note: string }) => void | Promise<void>;
};

const RequestCancelDialog = ({
  open,
  onOpenChange,
  title = "ยกเลิกคำขอ?",
  description = "แจ้งเหตุผลให้อีกฝ่ายทราบ — คำขอจะย้ายไปแท็บยกเลิก",
  busy,
  onConfirm,
}: Props) => {
  const [reason, setReason] = useState<RequestCancelReasonId>("changed_mind");
  const [note, setNote] = useState("");

  const reset = () => {
    setReason("changed_mind");
    setNote("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const canSubmit = reason !== "other" || note.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">เหตุผล</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as RequestCancelReasonId)}
              disabled={busy}
            >
              <SelectTrigger id="cancel-reason" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_CANCEL_REASONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-note">
              รายละเอียด{reason === "other" ? " (จำเป็น)" : " (ถ้ามี)"}
            </Label>
            <Textarea
              id="cancel-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              rows={3}
              className="rounded-xl resize-none"
              placeholder="บอกอีกฝ่ายสั้น ๆ ได้"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            กลับ
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={busy || !canSubmit}
            onClick={() => void onConfirm({ reason, note: note.trim() })}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            ยืนยันยกเลิก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestCancelDialog;
