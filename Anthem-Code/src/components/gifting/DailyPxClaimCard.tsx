import { Check, Flame, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClaimDailyPx, useDailyPxStatus } from "@/hooks/useDailyPxClaim";
import { toast } from "sonner";

const DailyPxClaimCard = () => {
  const { data: status, isLoading: statusLoading } = useDailyPxStatus();
  const claim = useClaimDailyPx();

  const claimedToday = status?.claimed_today === true;
  const streak = status?.streak ?? 0;
  const rewardPx = status?.reward_px ?? 1;

  const handleClaim = async () => {
    if (claimedToday || claim.isPending) return;
    try {
      const result = await claim.mutateAsync();
      toast.success(`รับ ${result.reward_px} px แล้ว — ใช้ส่งของขวัญได้ทันที`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "รับไม่สำเร็จ";
      if (msg.includes("ALREADY_CLAIMED")) {
        toast.message("รับวันนี้แล้ว");
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">รับฟรีทุกวัน</p>
        {streak > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 dark:text-orange-400 font-medium">
            <Flame className="w-3.5 h-3.5" />
            {streak} วันติด
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        รับ {rewardPx} px ฟรีวันละครั้ง — ใช้ส่งของขวัญได้ทันที (ไม่ถอนเป็นเงิน)
      </p>
      <Button
        type="button"
        size="sm"
        className="w-full rounded-full"
        disabled={claimedToday || claim.isPending || statusLoading}
        onClick={handleClaim}
      >
        {claim.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : claimedToday ? (
          <>
            <Check className="w-4 h-4 mr-1.5" />
            รับวันนี้แล้ว
          </>
        ) : (
          <>
            <Gift className="w-4 h-4 mr-1.5" />
            รับ {rewardPx} px วันนี้
          </>
        )}
      </Button>
    </div>
  );
};

export default DailyPxClaimCard;
