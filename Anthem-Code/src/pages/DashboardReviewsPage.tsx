import { Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import PortfolioReviewsManagePanel from "@/components/portfolio/PortfolioReviewsManagePanel";
import { useAuth } from "@/hooks/useAuth";

/** My Studio: received reviews. */
export default function DashboardReviewsPage() {
  const { user, loading: authLoading } = useAuth();

  return (
    <StudioLayout>
      <SeoHead title="My Studio — รีวิว" path="/dashboard/reviews" noindex />
      {authLoading || !user ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : (
        <PortfolioReviewsManagePanel subjectUserId={user.id} />
      )}
    </StudioLayout>
  );
}
