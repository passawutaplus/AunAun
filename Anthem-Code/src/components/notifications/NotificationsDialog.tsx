import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/core/notifications";
import { toast } from "sonner";
import { useState } from "react";

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationsDialog = ({ open, onOpenChange }: NotificationsDialogProps) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { unreadCount, markAllRead } = useNotifications(user?.id);
  const [marking, setMarking] = useState(false);
  const close = () => onOpenChange(false);

  const handleMarkAllRead = async () => {
    if (unreadCount <= 0 || marking) return;
    setMarking(true);
    try {
      await markAllRead();
      toast.success("All notifications marked as read");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't mark all as read");
    } finally {
      setMarking(false);
    }
  };

  const markAllBtn =
    unreadCount > 0 ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
        disabled={marking}
        onClick={() => void handleMarkAllRead()}
      >
        {marking ? "Updating…" : "Mark all read"}
      </Button>
    ) : null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex flex-col gap-0 p-0 h-[min(88dvh,720px)] rounded-t-[1.35rem] border-x-0 border-b-0 border-t border-border/50 bg-popover shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
          aria-describedby={undefined}
        >
          <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
            <span className="h-1 w-11 rounded-full bg-muted-foreground/25" aria-hidden />
          </div>
          <SheetHeader className="shrink-0 space-y-0 px-4 pb-3">
            <div className="flex items-end justify-between gap-3 pr-8">
              <SheetTitle className="text-left font-display text-[1.75rem] font-medium leading-none tracking-tight text-foreground">
                Notifications
              </SheetTitle>
              {markAllBtn}
            </div>
          </SheetHeader>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-3 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <NotificationsPanel embedded compactNav onBeforeNavigate={close} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 p-0 w-[calc(100%-2rem)] max-w-3xl max-h-[min(85vh,680px)] overflow-hidden rounded-2xl border-border/60 bg-popover shadow-2xl [&>button]:top-7 [&>button]:right-5"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 px-6 pb-2 pt-6">
          <div className="flex items-end justify-between gap-4 pr-8">
            <DialogTitle className="text-left font-display text-[2rem] font-medium leading-none tracking-tight text-foreground">
              Notifications
            </DialogTitle>
            {markAllBtn}
          </div>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-5 pt-4 pb-5">
          <NotificationsPanel embedded onBeforeNavigate={close} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
