import { Progress } from "@/components/ui/progress";
import type { CreatorEligibilitySnapshot } from "@/lib/creatorEligibility";
import CreatorEligibilityProgress from "@/components/verification/CreatorEligibilityProgress";
import { MIN_CASHOUT_PX } from "@/hooks/useCashout";

type Props = {
  eligibility: CreatorEligibilitySnapshot;
  earnedPx: number;
};

export function EarningsCashoutReadiness({ eligibility, earnedPx }: Props) {
  const earnedPct = Math.min(100, (earnedPx / MIN_CASHOUT_PX) * 100);
  const earnedReady = earnedPx >= MIN_CASHOUT_PX;
  const remaining = Math.max(0, MIN_CASHOUT_PX - earnedPx);

  return (
    <div className="space-y-3">
      <CreatorEligibilityProgress data={eligibility} defaultOpen={false} />

      {!earnedReady && (
        <div className="rounded-2xl glass-panel p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-foreground">ยอดขั้นต่ำถอน</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {earnedPx.toLocaleString()} / {MIN_CASHOUT_PX.toLocaleString()} px
            </span>
          </div>
          <Progress value={earnedPct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            อีก {remaining.toLocaleString()} px จากของขวัญถึงขั้นต่ำถอน
          </p>
        </div>
      )}
    </div>
  );
}
