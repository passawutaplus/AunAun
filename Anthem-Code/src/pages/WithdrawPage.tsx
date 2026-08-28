import { useSearchParams } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import { HireWithdrawForm } from "@/components/earnings/HireWithdrawForm";
import { useAuth } from "@/hooks/useAuth";
import { useHireWallet } from "@/hooks/useHireWallet";

/** Dedicated withdraw screen inside My Studio. */
const WithdrawPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const forcePreview = searchParams.get("preview") === "wallet";
  const startWithAll = searchParams.get("all") === "1";
  const { view, isPreview, requestPreviewWithdraw } = useHireWallet(user?.id, { forcePreview });
  const backTo = forcePreview ? "/earnings?preview=wallet" : "/earnings";

  return (
    <StudioLayout backTo={backTo} backLabel="กลับธุรกรรม" padForBottomNav={false} showFooter={false}>
      <SeoHead title="My Studio — ถอนเงิน" path="/earnings/withdraw" noindex />
      <div className="mx-auto max-w-lg">
        <HireWithdrawForm
          view={view}
          isPreview={isPreview}
          startWithAll={startWithAll}
          cancelTo={backTo}
          onConfirm={requestPreviewWithdraw}
        />
      </div>
    </StudioLayout>
  );
};

export default WithdrawPage;
