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
      toast.success("อ่านการแจ้งเตือนทั้งหมดแล้ว");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "อ่านทั้งหมดไม่สำเร็จ");
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
        className="h-8 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
        disabled={marking}
        onClick={() => void handleMarkAllRead()}
      >
        {marking ? "กำลังอัปเดต…" : "อ่านแล้วทั้งหมด"}
      </Button>
    ) : null;

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
          <SheetHeader className="shrink-0 px-4 pb-3 border-b border-border/40 space-y-0">
            <div className="flex items-center justify-between gap-2 pr-8">
              <SheetTitle className="text-base font-semibold tracking-tight text-left">
                <span className="text-gradient">การแจ้งเตือน</span>
              </SheetTitle>
              {markAllBtn}
            </div>
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
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="text-lg font-medium text-left">
              <span className="text-gradient">การแจ้งเตือน</span>
            </DialogTitle>
            {markAllBtn}
          </div>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 pt-4 pb-6">
          <NotificationsPanel embedded onBeforeNavigate={close} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
