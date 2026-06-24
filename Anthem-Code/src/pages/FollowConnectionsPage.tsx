import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import FollowConnectionsPanel from "@/components/follow/FollowConnectionsPanel";
import SeoHead from "@/components/SeoHead";
import { cn } from "@/lib/utils";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";

const FollowConnectionsPage = () => {
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const subjectId = routeUserId ?? user?.id;
  const isOwn = !routeUserId || routeUserId === user?.id;
  const defaultTab = searchParams.get("tab") === "following" ? "following" : "followers";

  useEffect(() => {
    if (!loading && isOwn && !user) navigate("/auth?redirect=/portfolio/followers");
  }, [loading, isOwn, user, navigate]);

  if (loading || !subjectId) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">กำลังโหลด...</div>;
  }

  return (
    <div className={cn("min-h-screen bg-app-ambient lg:pb-8", MOBILE_PAGE_BOTTOM_CLASS)}>
      <SeoHead title="ผู้ติดตาม" path={isOwn ? "/portfolio/followers" : `/u/${subjectId}/followers`} noindex />
      <header className="sticky top-0 z-20 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <h1 className="font-medium text-lg thai-display">
            <span className="text-gradient">{isOwn ? "ผู้ติดตามของฉัน" : "ผู้ติดตาม"}</span>
          </h1>
          <span className="w-12" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <FollowConnectionsPanel userId={subjectId} defaultTab={defaultTab} />
      </div>
    </div>
  );
};

export default FollowConnectionsPage;
