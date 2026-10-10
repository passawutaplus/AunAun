import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TOUR_DIALOG_SLOT_ID } from "@/components/project/EditorTour";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Left side: live preview of the work. */
  preview: ReactNode;
  /** Right side: the fields. */
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Work details (cover, title, category, tags, hiring, connect…) as a dialog: centred on desktop,
 * a full-height sheet rising from the bottom on phones. Closing it never discards what was typed —
 * the fields live in the editor page's own state.
 */
export function ProjectDetailsDialog({ open, onOpenChange, preview, children, footer }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90dvh] w-full max-w-xl flex-col gap-0 overflow-hidden bg-background p-0 lg:max-w-5xl",
          "max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:h-[92dvh] max-sm:max-h-[92dvh] max-sm:max-w-none",
          "max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-3xl",
          "max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom",
          "max-sm:data-[state=closed]:slide-out-to-left-0 max-sm:data-[state=open]:slide-in-from-left-0",
        )}
      >
        <div className="border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="font-display text-lg font-normal tracking-tight">Work details</DialogTitle>
          <DialogDescription className="sr-only">ปิดหน้าต่างนี้ได้ ข้อมูลที่กรอกจะไม่หาย</DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:overflow-hidden">
          <aside className="border-b border-border px-5 py-4 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            {preview}
          </aside>
          <div className="px-5 py-4 lg:overflow-y-auto">
            <div id={TOUR_DIALOG_SLOT_ID} />
            {children}
          </div>
        </div>
        <div className="border-t border-border px-5 py-3">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}
