import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import PageLoader from "@/components/ui/PageLoader";
import PortfolioPackagesManagePanel from "@/components/portfolio/PortfolioPackagesManagePanel";
import { useAuth } from "@/hooks/useAuth";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

/**
 * Dedicated packages workspace — list, stats, reorder.
 * Create / edit open as full pages under /portfolio/packages/*
 */
export default function PackageManagePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/portfolio/packages");
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=/portfolio/packages" replace />;

  return (
    <div className={cn("min-h-[100dvh] bg-background", MOBILE_PAGE_BOTTOM_CLASS)}>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-3 sm:px-6">
          <BackButton fallbackTo="/portfolio?tab=services" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 shrink-0" />
              <p className="text-[11px] font-medium uppercase tracking-wide">Packages</p>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              จัดการแพ็กเกจ
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              รวมแพ็กเกจทั้งหมด — กดเพิ่มหรือแก้ไขเพื่อจัดการแบบเต็มหน้า
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <PortfolioPackagesManagePanel ownerId={user.id} />
      </main>
    </div>
  );
}
