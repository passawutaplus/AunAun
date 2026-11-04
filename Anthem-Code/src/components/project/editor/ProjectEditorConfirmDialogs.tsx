import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OriginalWorkAttestation from "@/components/license/OriginalWorkAttestation";

/** "Save draft before leaving?" prompt shown when the editor has unsaved content. */
export function ProjectEditorLeaveDialog({
  open,
  busy,
  onStay,
  onLeaveWithoutSave,
  onSaveAndLeave,
}: {
  open: boolean;
  busy: boolean;
  onStay: () => void;
  onLeaveWithoutSave: () => void;
  onSaveAndLeave: () => void;
}) {
  return (
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (busy) return;
          if (!next) onStay();
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>บันทึกฉบับร่างนี้ไหม?</DialogTitle>
            <DialogDescription>
              คุณกำลังจะออกจากหน้าแก้ไข — บันทึกฉบับร่างไว้ก่อนไหม เพื่อไม่ให้งานหาย
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end flex-col-reverse sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={onStay}
            >
              อยู่ต่อ
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="rounded-full"
              onClick={onLeaveWithoutSave}
            >
              ออกโดยไม่บันทึก
            </Button>
            <Button
              type="button"
              disabled={busy}
              className="rounded-full"
              onClick={onSaveAndLeave}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              บันทึกฉบับร่างแล้วออก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

/** Rights attestation + final confirm before publishing. */
export function ProjectEditorPublishConfirmDialog({
  open,
  onOpenChange,
  publishing,
  attestChecked,
  onAttestChange,
  disabled,
  onPublish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publishing: boolean;
  attestChecked: boolean;
  onAttestChange: (checked: boolean) => void;
  disabled: boolean;
  onPublish: () => void;
}) {
  return (
      <Dialog open={open} onOpenChange={(next) => !publishing && onOpenChange(next)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>ยืนยันก่อนเผยแพร่</DialogTitle>
            <DialogDescription>เลือกยืนยันสิทธิ์ในผลงาน แล้วกดเผยแพร่</DialogDescription>
          </DialogHeader>
          <OriginalWorkAttestation checked={attestChecked} onCheckedChange={onAttestChange} />
          <DialogFooter className="gap-2 sm:justify-end flex-col-reverse sm:flex-row">
            <Button type="button" variant="ghost" disabled={publishing} onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={!attestChecked || publishing || disabled}
              onClick={onPublish}
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              เผยแพร่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
