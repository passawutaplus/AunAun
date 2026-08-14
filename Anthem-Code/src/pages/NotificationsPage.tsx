import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/core/notifications";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import SeoHead from "@/components/SeoHead";
import PageLoader from "@/components/ui/PageLoader";
import { cn } from "@/lib/utils";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { toast } from "sonner";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { unreadCount, markAllRead } = useNotifications(user?.id);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/notifications");
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;

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

  return (
    <main id="main-content" className={cn("min-h-screen bg-app-ambient lg:pb-8", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead title="การแจ้งเตือน" path="/notifications" noindex />
      <header className="sticky top-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BackButton />
          <h1 className="font-medium text-lg"><span className="text-gradient">การแจ้งเตือน</span></h1>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              disabled={marking}
              onClick={() => void handleMarkAllRead()}
            >
              {marking ? "กำลังอัปเดต…" : "อ่านแล้วทั้งหมด"}
            </Button>
          ) : (
            <span className="w-12" />
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <NotificationsPanel />
      </div>
    </main>
  );
};

export default NotificationsPage;
