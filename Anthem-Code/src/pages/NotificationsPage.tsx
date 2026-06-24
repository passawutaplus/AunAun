import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";
import SeoHead from "@/components/SeoHead";
import { cn } from "@/lib/utils";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/notifications");
  }, [loading, user, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;

  return (
    <div className={cn("min-h-screen bg-app-ambient lg:pb-8", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead title="การแจ้งเตือน" path="/notifications" noindex />
      <header className="sticky top-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <h1 className="font-medium text-lg"><span className="text-gradient">การแจ้งเตือน</span></h1>
          <span className="w-12" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <NotificationsPanel />
      </div>
    </div>
  );
};

export default NotificationsPage;
