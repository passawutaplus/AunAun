import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationsDialog = ({ open, onOpenChange }: NotificationsDialogProps) => {
  const isMobile = useIsMobile();
  const close = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex flex-col gap-0 p-0 h-[min(88dvh,720px)] rounded-t-[1.35rem] border-x-0 border-b-0 border-t border-border/50 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
          aria-describedby={undefined}
        >
          <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
            <span className="h-1 w-11 rounded-full bg-muted-foreground/25" aria-hidden />
          </div>
          <SheetHeader className="shrink-0 px-4 pb-3 border-b border-border/40 text-center space-y-0">
            <SheetTitle className="text-base font-semibold tracking-tight">
              <span className="text-gradient">การแจ้งเตือน</span>
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <NotificationsPanel embedded onBeforeNavigate={close} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 p-0 w-[calc(100%-2rem)] max-w-2xl max-h-[min(85vh,680px)] overflow-hidden rounded-2xl border-border/60 shadow-2xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/40 text-center">
          <DialogTitle className="text-lg font-medium">
            <span className="text-gradient">การแจ้งเตือน</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-6">
          <NotificationsPanel embedded onBeforeNavigate={close} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
