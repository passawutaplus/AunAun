import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import DashboardHireDocumentsPanel from "@/components/dashboard/DashboardHireDocumentsPanel";
import { HireTaxOverview } from "@/components/earnings/HireTaxOverview";
import { useAuth } from "@/hooks/useAuth";
import { useHireWallet } from "@/hooks/useHireWallet";

/** My Studio: documents + tax estimate from platform hire income. */
export default function DashboardDocumentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const forcePreview = searchParams.get("preview") === "wallet";
  const { view, isPreview } = useHireWallet(user?.id, { forcePreview });

  return (
    <StudioLayout>
      <SeoHead title="My Studio — เอกสาร / ภาษี" path="/dashboard/documents" noindex />
      {authLoading || !user ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : (
        <>
          <HireTaxOverview income={view.income} isPreview={isPreview} />
          <DashboardHireDocumentsPanel userId={user.id} />
        </>
      )}
    </StudioLayout>
  );
}
