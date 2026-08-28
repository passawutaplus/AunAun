import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import BillingSettingsPanel from "@/components/settings/BillingSettingsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

/** My Studio: bank payout account + hire billing readiness. */
export default function DashboardPayoutPage() {
  const qc = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  return (
    <StudioLayout>
      <SeoHead title="My Studio — บัญชีรับเงิน" path="/dashboard/payout" noindex />
      {authLoading || !user || profileLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : (
        <BillingSettingsPanel
          userId={user.id}
          profile={profile as Record<string, unknown> | null | undefined}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: ["profile", user.id] });
          }}
        />
      )}
    </StudioLayout>
  );
}
