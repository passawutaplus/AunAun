import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MessageSquareQuote, Settings } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import SeoHead from "@/components/SeoHead";
import ManageModeNav from "@/components/dashboard/ManageModeNav";
import PortfolioReviewsManagePanel from "@/components/portfolio/PortfolioReviewsManagePanel";
import { useAuth } from "@/hooks/useAuth";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";

/** Manage-work mode: all received reviews (before wallet / กระเป๋า). */
export default function DashboardReviewsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/dashboard/reviews");
  }, [authLoading, user, navigate]);

  return (
    <div className={`min-h-screen bg-app-ambient ${MOBILE_PAGE_BOTTOM_CLASS}`}>
      <SeoHead title="จัดการรีวิว" path="/dashboard/reviews" noindex />

      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-6 lg:pt-8">
          <BackButton fallbackTo="/portfolio" label="กลับโปรไฟล์" className="mb-4" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MessageSquareQuote className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-medium text-foreground">รีวิว</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  รวมรีวิวจ้างงานและคอลแลป — กรองตามประเภทหรือแพ็กเกจ แล้วตอบกลับได้
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
              className="rounded-full"
            >
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </Button>
          </div>
          <ManageModeNav className="mt-4" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-10">
        {authLoading || !user ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <PortfolioReviewsManagePanel subjectUserId={user.id} />
        )}
      </div>
    </div>
  );
}
