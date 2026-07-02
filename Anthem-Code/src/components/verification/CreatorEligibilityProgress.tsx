import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronRight, Circle } from "lucide-react";
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
};

type StepDef = {
  done: boolean;
  label: string;
  detail?: string;
  href?: string;
};

const Step = ({
  done,
  label,
  detail,
  href,
}: {
  done: boolean;
  label: string;
  detail?: string;
  href?: string;
}) => (
  <li className="flex items-start gap-2.5 text-sm">
    <span
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
    </span>
    <div className="min-w-0 flex-1">
      <p className={cn("font-medium", done ? "text-foreground" : "text-muted-foreground")}>{label}</p>
      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
    </div>
    {href && !done && (
      <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full">
        <Link to={href} aria-label={`ไปทำ: ${label}`}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    )}
  </li>
);

const CreatorEligibilityProgress = ({ data, compact, className }: Props) => {
  const [open, setOpen] = useState(false);

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
      },
      {
        done: data.publishedCount >= MIN_PUBLISHED_FOR_RECEIVE,
        label: "เผยแพร่ผลงาน",
        detail: publishedDetail,
        href: "/portfolio/new",
      },
      {
        done: data.followerCount >= MIN_FOLLOWERS_FOR_CASHOUT,
        label: "ผู้ติดตาม (สำหรับถอนเงิน)",
        detail: followerDetail,
        href: "/portfolio/followers",
      },
      {
        done: data.referralComplete,
        label: "ชวนเพื่อน 1 คน (สำเร็จ)",
        detail: referralDetail,
        href: "/referrals",
      },
      {
        done: data.isVerified,
        label: "ยืนยันตัวตน (KYC)",
        href: "/verify",
      },
    ],
    [data, welcomeDetail, publishedDetail, followerDetail, referralDetail],
  );

  const doneCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((doneCount / steps.length) * 100);
  const remainingPct = 100 - progressPct;

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
        <Progress value={progressPct} className="h-1.5" />
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
              <span className="text-xs text-muted-foreground shrink-0">
                {remainingPct > 0 ? `เหลือ ${remainingPct}%` : "ครบแล้ว"}
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
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

      <CollapsibleContent className="px-5 pb-5 space-y-4">
        <p className="text-xs text-muted-foreground">
          ทำภารกิจ Welcome Bonus และลงผลงานก่อน — ถอนเงินต้องยืนยันตัวตน มีผู้ติดตามขั้นต่ำ และชวนเพื่อนสำเร็จ
        </p>

        <ul className="space-y-3">
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
