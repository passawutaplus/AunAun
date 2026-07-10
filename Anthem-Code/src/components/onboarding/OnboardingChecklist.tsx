import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Circle, Compass, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOnboardingChecklist } from "@/hooks/useOnboardingChecklist";
import { useWelcomeMissions } from "@/hooks/useWelcomeMissions";
import { useWelcomeMissionCatalog } from "@/hooks/useWelcomeMissionCatalog";
import { getVisibleOnboardingTasks, likeMissionHint } from "@/lib/onboardingTasks";
import { friendlyAmlError } from "@/lib/amlErrors";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { springProgress } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  variant?: "full" | "compact";
};

export default function OnboardingChecklist({ variant = "full" }: Props) {
  const tourMode = isAplus1LaunchMinimal();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    tasks,
    doneCount,
    total,
    percent,
    allDone,
    visible,
    celebrated,
    dismiss,
    celebrate,
    welcomeCap,
    allMissionsClaimed,
    signals,
  } = useOnboardingChecklist(user?.id);

  const { data: rewardById } = useWelcomeMissionCatalog();
  const {
    claimedIds,
    lifetimeWelcomePx,
    welcomePx,
    claim,
    isLoading: missionsLoading,
  } = useWelcomeMissions(tourMode ? undefined : user?.id);

  const [collapsed, setCollapsed] = useState(variant === "compact");
  const [celebrating, setCelebrating] = useState(false);

  const taskById = Object.fromEntries(getVisibleOnboardingTasks().map((t) => [t.id, t]));
  const pxEarned = Math.min(lifetimeWelcomePx, welcomeCap);
  const pxRemaining = Math.max(0, welcomeCap - lifetimeWelcomePx);
  const welcomeCapReached = !tourMode && !missionsLoading && pxRemaining <= 0;
  const pxPercent = welcomeCap > 0 ? Math.round((pxEarned / welcomeCap) * 100) : 0;
  const pendingTasks = tasks.filter((t) => (tourMode ? !t.done : !claimedIds.has(t.id)));
  const displayTasks = collapsed ? pendingTasks.slice(0, 1) : tasks;
  const checklistComplete = tourMode ? allDone : allMissionsClaimed;

  useEffect(() => {
    if (checklistComplete && !celebrated) setCelebrating(true);
  }, [checklistComplete, celebrated]);

  useEffect(() => {
    if (!celebrating || celebrated) return;
    const t = window.setTimeout(() => celebrate(), 4000);
    return () => window.clearTimeout(t);
  }, [celebrating, celebrated, celebrate]);

  if (!visible) return null;

  if (checklistComplete && celebrated && !celebrating) return null;

  const handleClaim = (missionId: string) => {
    if (welcomeCapReached) {
      toast.info("รับครบโควต้า Welcome Bonus แล้ว", {
        description: `รับได้สูงสุด ${welcomeCap.toLocaleString()} px — ภารกิจที่เหลือไม่ได้ px เพิ่ม`,
      });
      return;
    }
    claim.mutate(missionId as Parameters<typeof claim.mutate>[0], {
      onSuccess: (data) => {
        toast.success(`รับ Welcome Bonus +${data.reward_px} PX`, {
          description: `ยอดต้อนรับ: ${data.welcome_px.toLocaleString()} PX — ใช้ส่งของขวัญได้`,
        });
      },
      onError: (e) => {
        const msg = friendlyAmlError(e);
        if (msg.includes("ครบโควต้า")) {
          toast.info(msg, {
            description: `รับได้สูงสุด ${welcomeCap.toLocaleString()} px`,
          });
          return;
        }
        toast.error(msg);
      },
    });
  };

  if (celebrating) {
    return (
      <AnimatePresence mode="wait">
        <motion.section
          key="celebrate"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6"
        >
          <div className="flex items-center gap-3">
            <PartyPopper className="h-6 w-6 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {tourMode ? "ทัวร์ครบแล้ว — พร้อมใช้งานต่อ!" : "ยินดีด้วย — ทำภารกิจ Welcome Bonus ครบแล้ว!"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tourMode
                  ? "คุณคุ้นกับฟีด ดีไซเนอร์ และการลงผลงานแล้ว — ลงผลงานต่อหรือส่งลิงก์โปรไฟล์ให้ลูกค้าได้เลย"
                  : `รับโบนัสรวม ${pxEarned.toLocaleString()} px — ใช้ส่งของขวัญให้ครีเอเตอร์ได้ที่ผลงานในฟีด`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCelebrating(false);
              celebrate();
              dismiss();
            }}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            ปิด
          </button>
        </motion.section>
      </AnimatePresence>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card",
        variant === "full" ? "p-5 sm:p-6" : "p-4",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-2xl bg-primary/15 p-2.5 text-primary">
          <Compass className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {tourMode ? "ทัวร์รู้จัก Aplus1" : "Welcome Bonus"}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {tourMode ? (
                  <>
                    ภารกิจสั้น ๆ ช่วยคุ้นกับแพลตฟอร์ม ·{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {doneCount}/{total}
                    </span>{" "}
                    · {percent}%
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground tabular-nums">
                      {pxEarned}/{welcomeCap} px
                    </span>
                    {pxRemaining > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        · รับได้อีก {pxRemaining.toLocaleString()} px
                      </span>
                    )}
                    {" · "}
                    {doneCount}/{total} ภารกิจ · {percent}%
                  </>
                )}
              </p>
              {!tourMode && welcomePx > 0 && (
                <p className="mt-0.5 text-xs text-primary">พร้อมส่งของขวัญ: {welcomePx.toLocaleString()} PX</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
              aria-expanded={!collapsed}
              aria-label={collapsed ? "ขยายรายการภารกิจ" : "หุบรายการภารกิจ"}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>

          <div className="mt-3 space-y-1.5">
            {!tourMode && (
              <>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>ความคืบหน้า PX</span>
                  <span className="tabular-nums">{pxPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={false}
                    animate={{ width: `${pxPercent}%` }}
                    transition={springProgress}
                  />
                </div>
              </>
            )}
            <div className={cn("h-2 rounded-full bg-muted overflow-hidden", !tourMode && "h-1.5 bg-muted/60")}>
              <motion.div
                className={cn("h-full rounded-full bg-primary", !tourMode && "bg-primary/50")}
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={springProgress}
              />
            </div>
          </div>

          {!tourMode && welcomeCapReached && !allMissionsClaimed && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 leading-relaxed rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              รับครบโควต้า {welcomeCap.toLocaleString()} px แล้ว — ภารกิจที่ยังไม่รับจะไม่ได้ px เพิ่ม
              แต่ทำต่อเพื่อเรียนรู้แพลตฟอร์มได้
            </p>
          )}
        </div>
      </div>

      {displayTasks.length > 0 && (
        <AnimatePresence initial={false} mode="popLayout">
          <motion.ul
            key={collapsed ? "collapsed" : "expanded"}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn("w-full space-y-2 overflow-hidden", variant === "full" ? "mt-4" : "mt-3")}
          >
            {displayTasks.map((task) => {
              const def = taskById[task.id];
              const Icon = def?.icon;
              const rewardPx = rewardById?.get(task.id) ?? def?.rewardPx ?? 0;
              const claimed = !tourMode && claimedIds.has(task.id);
              const claimable =
                !tourMode && task.done && !claimed && !welcomeCapReached && !missionsLoading;

              return (
                <li
                  key={task.id}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl border p-3 transition-colors",
                    task.done || claimed
                      ? "border-primary/20 bg-primary/5"
                      : claimable
                        ? "border-primary/30 bg-primary/8"
                        : "border-border bg-background/60",
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {task.done || claimed ? (
                      <Check className="h-4 w-4 text-primary" aria-hidden />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                  </span>
                  {Icon && (
                    <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          task.done || claimed ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {task.title}
                      </p>
                      {!tourMode && (
                        <span className="text-[10px] font-medium rounded-full bg-primary/15 text-primary px-2 py-0.5 tabular-nums">
                          +{rewardPx} PX
                        </span>
                      )}
                    </div>
                    {variant === "full" && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                        {task.description}
                      </p>
                    )}
                    {task.id === "like" && signals && !task.done && !claimed && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                        {likeMissionHint(signals) ?? ""}
                      </p>
                    )}
                    {(task.done || claimed) && (
                      <p className="text-[10px] text-primary mt-1">{claimed ? "รับแล้ว" : "เสร็จแล้ว"}</p>
                    )}
                  </div>
                  {claimable ? (
                    <Button
                      size="sm"
                      className="shrink-0 rounded-full h-7 text-xs"
                      disabled={claim.isPending}
                      onClick={() => handleClaim(task.id)}
                    >
                      รับ PX
                    </Button>
                  ) : !task.done ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-full h-7 text-xs"
                      onClick={() => navigate(task.href)}
                    >
                      ไปทำ
                    </Button>
                  ) : tourMode ? null : welcomeCapReached ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground px-2">
                      โควต้าเต็ม
                    </span>
                  ) : null}
                </li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      )}

      {!collapsed && (
        <>
          {!tourMode && (
            <p className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
              Welcome Bonus ใช้ส่งของขวัญได้เท่านั้น ไม่ถอนเป็นเงินสด — ถอนได้เฉพาะ PX ที่คนอื่นส่งให้คุณ ขั้นต่ำ 1,000 PX
            </p>
          )}
          {tourMode && (
            <p className="mt-3 text-[10px] text-muted-foreground leading-snug line-clamp-2">
              ทำทีละขั้น — ฟีด ดีไซเนอร์ ลงผลงาน แชร์โปรไฟล์ · ทำครบแล้วค่อยปิดได้
            </p>
          )}
        </>
      )}
    </motion.section>
  );
}
