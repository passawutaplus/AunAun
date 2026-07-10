import { useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/core/notifications";
import NotificationsDialog from "@/components/notifications/NotificationsDialog";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "header" | "nav";
  active?: boolean;
};

const NotificationBell = ({ variant = "header", active = false }: Props) => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications(user?.id);

  const handleClick = () => {
    if (!user) {
      navigate("/auth?redirect=/notifications");
      return;
    }
    setOpen(true);
  };

  const label = `แจ้งเตือน${unreadCount > 0 ? ` (${unreadCount} รายการใหม่)` : ""}`;

  if (variant === "nav") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          aria-label={label}
          aria-expanded={open}
          className={cn(
            "relative flex items-center justify-center rounded-full transition-colors min-h-11",
            active
              ? "gap-1.5 bg-foreground text-background px-2.5 py-2 text-[11px] font-medium"
              : "p-2 text-muted-foreground hover:text-foreground hover:bg-accent w-10 min-h-10",
          )}
        >
          <Bell className={cn("shrink-0", active ? "w-4 h-4" : "w-5 h-5")} strokeWidth={active ? 2.2 : 2} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-primary text-white text-[9px] font-semibold flex items-center justify-center leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {active && <span className="whitespace-nowrap max-w-[4.5rem] truncate">แจ้งเตือน</span>}
        </button>
        {user && <NotificationsDialog open={open} onOpenChange={setOpen} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-label={label}
        title="แจ้งเตือน"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {user && <NotificationsDialog open={open} onOpenChange={setOpen} />}
    </>
  );
};

export default NotificationBell;
