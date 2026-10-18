import { Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import { BillingDashboard } from "@/components/dashboard/BillingDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useMyStudioDocs } from "@/hooks/useStudioDocuments";

/** My Studio: quotations, invoices, receipts and outstanding money (works during the free launch). */
export default function DashboardBillingPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: docs = [], isLoading, isError, refetch } = useMyStudioDocs();

  return (
    <StudioLayout>
      <SeoHead
        title="My Studio — เอกสารและรายรับ"
        path="/dashboard/billing"
        noindex
      />
      {authLoading || isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm">
          โหลดเอกสารไม่สำเร็จ{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => void refetch()}
          >
            ลองอีกครั้ง
          </button>
        </div>
      ) : (
        <BillingDashboard docs={docs} viewerId={user?.id ?? null} />
      )}
    </StudioLayout>
  );
}
