import { ArrowLeftRight, Replace } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwap: () => void;
  onReplace: () => void;
};

/** Confirm how to place a dragged image onto an occupied slot. */
export function CanvasImageSlotDropDialog({ open, onOpenChange, onSwap, onReplace }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>วางภาพนี้ยังไง?</AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <span className="block">ช่องเป้าหมายมีภาพอยู่แล้ว เลือกได้สองแบบ:</span>
            <span className="block">
              <strong className="text-foreground">สลับตำแหน่ง</strong> — สลับภาพทั้งสองช่อง
            </span>
            <span className="block">
              <strong className="text-foreground">แทนที่</strong> — ใส่ภาพที่ลากทับช่องนี้ และลบภาพเดิมที่ถูกทับออก
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <div className="flex w-full gap-2">
            <Button type="button" className="flex-1 gap-1.5" onClick={onSwap}>
              <ArrowLeftRight className="h-4 w-4 shrink-0" />
              สลับตำแหน่ง
            </Button>
            <Button type="button" variant="secondary" className="flex-1 gap-1.5" onClick={onReplace}>
              <Replace className="h-4 w-4 shrink-0" />
              แทนที่
            </Button>
          </div>
          <AlertDialogCancel className="mt-0 w-full">ยกเลิก</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
