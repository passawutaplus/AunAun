import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TOUR_DIALOG_SLOT_ID } from "@/components/project/EditorTour";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Work details (cover, title, category, tags, hiring, connect…) as a dialog: centred on desktop,
 * a full-height sheet rising from the bottom on phones. Closing it never discards what was typed —
 * the fields live in the editor page's own state.
 */
export function ProjectDetailsDialog({ open, onOpenChange, children, footer }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90dvh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0",
          "max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:h-[92dvh] max-sm:max-h-[92dvh] max-sm:max-w-none",
          "max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-3xl",
          "max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom",
          "max-sm:data-[state=closed]:slide-out-to-left-0 max-sm:data-[state=open]:slide-in-from-left-0",
        )}
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="text-base font-medium">รายละเอียดงาน</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            ปิดหน้าต่างนี้ได้ ข้อมูลที่กรอกจะไม่หาย
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div id={TOUR_DIALOG_SLOT_ID} />
          {children}
        </div>
        <div className="border-t border-border px-5 py-3">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}
