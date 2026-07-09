import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { useWelcomeMissions } from "@/hooks/useWelcomeMissions";
import { useWelcomeMissionCatalog, useWelcomePxCap } from "@/hooks/useWelcomeMissionCatalog";
import {
  getVisibleOnboardingTasks,
  type OnboardingTaskId,
} from "@/lib/onboardingTasks";
import { friendlyAmlError } from "@/lib/amlErrors";
import { ReferralInviteCard } from "@/components/referral/ReferralInviteCard";
import { toast } from "sonner";

type Props = {
  onClose?: () => void;
  /** Hide referral card when shown elsewhere (e.g. TopUpDialog). */
  hideReferral?: boolean;
};

const MAX_MISSIONS_SHOWN = 4;

const WalletEarnMoreSection = ({ onClose, hideReferral = false }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasks, isLoading: checklistLoading } = useOnboardingChecklist(user?.id);
  const { claimedIds, lifetimeWelcomePx, claim, isLoading: missionsLoading } = useWelcomeMissions(user?.id);
  const { data: rewardById } = useWelcomeMissionCatalog();
  const { data: welcomeCap = 100 } = useWelcomePxCap();
  const [claimingId, setClaimingId] = useState<OnboardingTaskId | null>(null);

  const rewardPx = (id: OnboardingTaskId, fallback: number) => rewardById?.get(id) ?? fallback;

  const pxEarned = Math.min(lifetimeWelcomePx, welcomeCap);
  const pxRemaining = Math.max(0, welcomeCap - lifetimeWelcomePx);
  const welcomeCapReached = !missionsLoading && pxRemaining <= 0;

  const pendingMissions = getVisibleOnboardingTasks().filter((def) => !claimedIds.has(def.id)).map((def) => {
    const progress = tasks.find((t) => t.id === def.id);
    const done = progress?.done ?? false;
    return {
      ...def,
      rewardPx: rewardPx(def.id, def.rewardPx),
      done,
      claimable: done && !claimedIds.has(def.id) && !welcomeCapReached,
    };
  });

  const sortedMissions = [...pendingMissions].sort((a, b) => {
    if (a.claimable !== b.claimable) return a.claimable ? -1 : 1;
    if (a.done !== b.done) return a.done ? -1 : 1;
    return b.rewardPx - a.rewardPx;
  });

  const hasClaimable = pendingMissions.some((t) => t.claimable);
  const showMissions = hasClaimable && !checklistLoading && !missionsLoading;

  const handleClaim = (missionId: OnboardingTaskId) => {
    if (welcomeCapReached) {
      toast.info("รับครบโควต้า Welcome Bonus แล้ว", {
        description: `รับได้สูงสุด ${welcomeCap.toLocaleString()} px`,
      });
      return;
    }
    setClaimingId(missionId);
    claim.mutate(missionId, {
      onSuccess: (data) => {
        toast.success(`รับ +${data.reward_px} px แล้ว — ใช้ส่งของขวัญได้ทันที`);
        setClaimingId(null);
      },
      onError: (e) => {
        const msg = friendlyAmlError(e);
        if (msg.includes("ครบโควต้า")) {
          toast.info(msg);
        } else {
          toast.error(msg);
        }
        setClaimingId(null);
      },
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
                <span className="font-medium text-foreground tabular-nums">
                  {pxRemaining.toLocaleString()} px
                </span>
                {" · "}
                <span className="tabular-nums">
                  {pxEarned}/{welcomeCap} px
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
              const isClaiming = claimingId === task.id;
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClaim(task.id);
                      }}
                    >
                      {isClaiming ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Gift className="w-3 h-3 mr-1" />
                          รับ
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full text-[11px] px-2.5 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        go(task.href);
                      }}
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

      {!hideReferral && <ReferralInviteCard onClose={onClose} />}
    </div>
  );
};

export default WalletEarnMoreSection;
