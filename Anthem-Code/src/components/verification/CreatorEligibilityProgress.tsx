import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { CreatorEligibilitySnapshot } from "@/lib/creatorEligibility";
import {
  MIN_FOLLOWERS_FOR_CASHOUT,
  MIN_PUBLISHED_FOR_RECEIVE,
  MIN_SUCCESSFUL_REFERRALS,
} from "@/lib/creatorEligibility";
import { cn } from "@/lib/utils";

type Props = {
  data: CreatorEligibilitySnapshot;
  compact?: boolean;
  className?: string;
  defaultOpen?: boolean;
};

type StepDef = {
  done: boolean;
  label: string;
  detail?: string;
  href?: string;
  progressPct?: number;
};

const Step = ({
  done,
  label,
  detail,
  href,
  progressPct,
}: StepDef) => (
  <li className="rounded-xl border border-border/60 bg-muted/15 p-3">
    <div className="flex items-start gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", done ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </p>
            {detail && (
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">{detail}</p>
            )}
          </div>
          {href && !done && (
            <Link to={href} className="text-xs text-primary hover:underline shrink-0 pt-0.5">
              ไปทำ
            </Link>
          )}
        </div>

        {!done && progressPct !== undefined && (
          <Progress value={progressPct} className="h-1.5" />
        )}
      </div>
    </div>
  </li>
);

function computeOverallProgress(data: CreatorEligibilitySnapshot): number {
  const pcts = [
    Math.min(100, (data.welcomeClaimedPx / data.welcomeTargetPx) * 100),
    Math.min(100, (data.publishedCount / MIN_PUBLISHED_FOR_RECEIVE) * 100),
    Math.min(100, (data.followerCount / MIN_FOLLOWERS_FOR_CASHOUT) * 100),
    Math.min(100, (data.qualifiedReferralCount / MIN_SUCCESSFUL_REFERRALS) * 100),
    data.isVerified ? 100 : 0,
  ];
  return Math.round(pcts.reduce((sum, pct) => sum + pct, 0) / pcts.length);
}

const CreatorEligibilityProgress = ({ data, compact, className, defaultOpen = false }: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  const welcomeDetail = `${data.welcomeClaimedPx.toLocaleString()} / ${data.welcomeTargetPx.toLocaleString()} PX`;
  const publishedDetail = `${data.publishedCount} / ${MIN_PUBLISHED_FOR_RECEIVE} ชิ้น`;
  const followerDetail = `${data.followerCount} / ${MIN_FOLLOWERS_FOR_CASHOUT} คน`;
  const referralDetail = `${data.qualifiedReferralCount} / ${MIN_SUCCESSFUL_REFERRALS} คน`;

  const steps: StepDef[] = useMemo(
    () => [
      {
        done: data.welcomeComplete,
        label: "Welcome Bonus ครบ",
        detail: welcomeDetail,
        href: "/portfolio",
        progressPct: Math.min(100, (data.welcomeClaimedPx / data.welcomeTargetPx) * 100),
      },
      {
        done: data.publishedCount >= MIN_PUBLISHED_FOR_RECEIVE,
        label: "เผยแพร่ผลงาน",
        detail: publishedDetail,
        href: "/portfolio/new",
        progressPct: Math.min(100, (data.publishedCount / MIN_PUBLISHED_FOR_RECEIVE) * 100),
      },
      {
        done: data.followerCount >= MIN_FOLLOWERS_FOR_CASHOUT,
        label: "ผู้ติดตาม (สำหรับถอนเงิน)",
        detail: followerDetail,
        href: "/portfolio/followers",
        progressPct: Math.min(100, (data.followerCount / MIN_FOLLOWERS_FOR_CASHOUT) * 100),
      },
      {
        done: data.referralComplete,
        label: "ชวนเพื่อน 1 คน (สำเร็จ)",
        detail: referralDetail,
        href: "/referrals",
        progressPct: Math.min(100, (data.qualifiedReferralCount / MIN_SUCCESSFUL_REFERRALS) * 100),
      },
      {
        done: data.isVerified,
        label: "ยืนยันตัวตน (KYC)",
        href: data.canStartKyc ? "/verify" : undefined,
        progressPct: data.isVerified ? 100 : 0,
      },
    ],
    [data, welcomeDetail, publishedDetail, followerDetail, referralDetail],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = computeOverallProgress(data);

  const title =
    data.tier === "cashout"
      ? "พร้อมรับรายได้และถอนเงิน"
      : data.tier === "receive"
        ? "เปิดรับการสนับสนุนแล้ว"
        : "เตรียมเปิดรับรายได้";

  if (compact) {
    return (
      <div className={cn("rounded-2xl glass-panel p-4 space-y-2", className)}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className="text-xs text-muted-foreground">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2" />
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-2xl glass-panel", className)}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full p-5 text-left flex items-start gap-3 hover:bg-muted/30 transition-colors rounded-2xl"
        >
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-foreground">{title}</h2>
              <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                {progressPct >= 100 ? "ครบแล้ว" : `${progressPct}%`}
              </span>
            </div>
            <Progress value={progressPct} className="h-2" />
            {!open && (
              <p className="text-xs text-muted-foreground">
                {doneCount}/{steps.length} ภารกิจ — แตะเพื่อดูรายการและไปทำต่อ
              </p>
            )}
          </div>
          <ChevronDown
            className={cn("w-5 h-5 text-muted-foreground shrink-0 mt-0.5 transition-transform", open && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-5 pb-5 space-y-4 overflow-hidden">
        <p className="text-xs text-muted-foreground">
          ทำภารกิจ Welcome Bonus และลงผลงานก่อน — ถอนเงินต้องยืนยันตัวตน มีผู้ติดตามขั้นต่ำ และชวนเพื่อนสำเร็จ
        </p>

        <ul className="space-y-2">
          {steps.map((step) => (
            <Step key={step.label} {...step} />
          ))}
        </ul>

        {data.canStartKyc && !data.isVerified && (
          <Button asChild className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/verify">เริ่มยืนยันตัวตน</Link>
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default CreatorEligibilityProgress;
