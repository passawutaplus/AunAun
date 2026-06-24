import { Link } from "react-router-dom";
import { Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreatorEligibilitySnapshot } from "@/lib/creatorEligibility";
import { MIN_FOLLOWERS_FOR_CASHOUT, MIN_PUBLISHED_FOR_RECEIVE } from "@/lib/creatorEligibility";
import { cn } from "@/lib/utils";

type Props = {
  data: CreatorEligibilitySnapshot;
  compact?: boolean;
  className?: string;
};

const Step = ({ done, label, detail }: { done: boolean; label: string; detail?: string }) => (
  <li className="flex items-start gap-2.5 text-sm">
    <span
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
        done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
    </span>
    <div className="min-w-0">
      <p className={cn("font-medium", done ? "text-foreground" : "text-muted-foreground")}>{label}</p>
      {detail && <p className="text-xs text-muted-foreground mt-0.5">{detail}</p>}
    </div>
  </li>
);

const CreatorEligibilityProgress = ({ data, compact, className }: Props) => {
  const welcomeDetail = `${data.welcomeClaimedPx.toLocaleString()} / ${data.welcomeTargetPx.toLocaleString()} PX`;
  const publishedDetail = `${data.publishedCount} / ${MIN_PUBLISHED_FOR_RECEIVE} ชิ้น`;
  const followerDetail = `${data.followerCount} / ${MIN_FOLLOWERS_FOR_CASHOUT} คน`;

  return (
    <div className={cn("rounded-2xl glass-panel p-5 space-y-4", className)}>
      <div>
        <h2 className="font-medium text-foreground">
          {data.tier === "cashout"
            ? "พร้อมรับรายได้และถอนเงิน"
            : data.tier === "receive"
              ? "เปิดรับการสนับสนุนแล้ว"
              : "เตรียมเปิดรับรายได้"}
        </h2>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1">
            ทำภารกิม Welcome Bonus และลงผลงานก่อน — ถอนเงินต้องยืนยันตัวตนและมีผู้ติดตามขั้นต่ำ
          </p>
        )}
      </div>

      <ul className="space-y-3">
        <Step done={data.welcomeComplete} label="Welcome Bonus ครบ" detail={welcomeDetail} />
        <Step
          done={data.publishedCount >= MIN_PUBLISHED_FOR_RECEIVE}
          label="เผยแพร่ผลงาน"
          detail={publishedDetail}
        />
        <Step
          done={data.followerCount >= MIN_FOLLOWERS_FOR_CASHOUT}
          label="ผู้ติดตาม (สำหรับถอนเงิน)"
          detail={followerDetail}
        />
        <Step done={data.isVerified} label="ยืนยันตัวตน (KYC)" />
      </ul>

      {data.canStartKyc && !data.isVerified && (
        <Button asChild className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/verify">เริ่มยืนยันตัวตน</Link>
        </Button>
      )}
      {!data.welcomeComplete && (
        <Button asChild variant="outline" className="w-full rounded-full">
          <Link to="/portfolio">ทำ Welcome Bonus</Link>
        </Button>
      )}
    </div>
  );
};

export default CreatorEligibilityProgress;
