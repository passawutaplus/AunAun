import { Link } from "react-router-dom";
import { ChevronRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferralInlineShare } from "@/components/referral/ReferralInlineShare";
import { useReferralDashboard } from "@/hooks/useReferral";
import { cn } from "@/lib/utils";

type Props = {
  onClose?: () => void;
  className?: string;
  /** Skip fetch when parent is hidden (e.g. closed dialog). */
  enabled?: boolean;
};

export function ReferralInviteCard({ onClose, className, enabled = true }: Props) {
  const { data: referral, isLoading: referralLoading } = useReferralDashboard({ enabled });

  return (
    <section className={cn("rounded-xl border border-border bg-card/60 p-3", className)}>
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
          <UserPlus className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">ชวนเพื่อนรับ Pixel</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {referralLoading ? (
              "กำลังโหลด…"
            ) : (
              <>
                คุณได้{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {referral?.referrer_reward_px ?? 50} px
                </span>{" "}
                เมื่อเพื่อนโพสต์/เผยแพร่ครั้งแรกสำเร็จ
                {referral && referral.earned_px > 0 && (
                  <>
                    {" · "}
                    รับไปแล้ว {referral.earned_px.toLocaleString()} px
                  </>
                )}
              </>
            )}
          </p>
          <ReferralInlineShare enabled={enabled} />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Link to="/referrals" onClick={() => onClose?.()}>
              ดูสถิติชวนเพื่อน
              <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
