import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronRight, Gift, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { useWelcomeMissions } from "@/hooks/useWelcomeMissions";
import { useReferralDashboard } from "@/hooks/useReferral";
import {
  ONBOARDING_TASKS,
  WELCOME_PX_CAP,
  type OnboardingTaskId,
} from "@/lib/onboardingTasks";
import { friendlyAmlError } from "@/lib/amlErrors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  onClose?: () => void;
};

const MAX_MISSIONS_SHOWN = 4;

const WalletEarnMoreSection = ({ onClose }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasks, claimedPx, isLoading: checklistLoading } = useOnboardingChecklist(user?.id);
  const { claimedIds, claim, isLoading: missionsLoading } = useWelcomeMissions(user?.id);
  const { data: referral, isLoading: referralLoading } = useReferralDashboard();

  const pendingMissions = ONBOARDING_TASKS.filter((def) => !claimedIds.has(def.id)).map((def) => {
    const progress = tasks.find((t) => t.id === def.id);
    return {
      ...def,
      done: progress?.done ?? false,
      claimable: (progress?.done ?? false) && !claimedIds.has(def.id),
    };
  });

  const sortedMissions = [...pendingMissions].sort((a, b) => {
    if (a.claimable !== b.claimable) return a.claimable ? -1 : 1;
    if (a.done !== b.done) return a.done ? -1 : 1;
    return b.rewardPx - a.rewardPx;
  });

  const remainingPx = pendingMissions.reduce((s, t) => s + t.rewardPx, 0);
  const allMissionsClaimed = claimedPx >= WELCOME_PX_CAP || pendingMissions.length === 0;
  const showMissions = !allMissionsClaimed && !checklistLoading && !missionsLoading;

  const handleClaim = (missionId: OnboardingTaskId) => {
    claim.mutate(missionId, {
      onSuccess: (data) => {
        toast.success(`รับ +${data.reward_px} px แล้ว`);
      },
      onError: (e) => toast.error(friendlyAmlError(e)),
    });
  };

  const go = (href: string) => {
    onClose?.();
    navigate(href);
  };

  return (
    <div className="space-y-3">
      {showMissions && (
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">ภารกิจรับ px ฟรี</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                รับได้อีกสูงสุด{" "}
                <span className="font-medium text-foreground tabular-nums">{remainingPx} px</span>
                {" · "}
                <span className="tabular-nums">
                  {claimedPx}/{WELCOME_PX_CAP} px
                </span>
              </p>
            </div>
            {sortedMissions.length > MAX_MISSIONS_SHOWN && (
              <button
                type="button"
                onClick={() => go("/portfolio")}
                className="text-[10px] text-primary shrink-0 hover:underline"
              >
                ดูทั้งหมด
              </button>
            )}
          </div>

          <ul className="space-y-1.5">
            {sortedMissions.slice(0, MAX_MISSIONS_SHOWN).map((task) => {
              const Icon = task.icon;
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2.5 py-2"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    <p className="text-[10px] text-muted-foreground">+{task.rewardPx} px</p>
                  </div>
                  {task.claimable ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 rounded-full text-[11px] px-2.5 shrink-0"
                      disabled={claim.isPending}
                      onClick={() => handleClaim(task.id)}
                    >
                      {claim.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Gift className="w-3 h-3 mr-1" />
                          รับ
                        </>
                      )}
                    </Button>
                  ) : task.done ? (
                    <span className="inline-flex items-center text-[10px] text-muted-foreground shrink-0">
                      <Check className="w-3 h-3 mr-0.5" />
                      รับแล้ว
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full text-[11px] px-2.5 shrink-0"
                      onClick={() => go(task.href)}
                    >
                      ไปทำ
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card/60 p-3">
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
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn("mt-2 h-8 rounded-full text-xs")}
            >
              <Link to="/referrals" onClick={() => onClose?.()}>
                ดูลิงก์ชวนเพื่อน
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WalletEarnMoreSection;
