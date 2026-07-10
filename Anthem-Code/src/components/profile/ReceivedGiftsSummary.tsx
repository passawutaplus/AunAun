import { Link } from "react-router-dom";
import { Gift as GiftIcon, Coins, FolderKanban, ArrowRight, Check, Circle } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Progress } from "@/components/ui/progress";
import { useReceivedGiftsByProject } from "@/hooks/useReceivedGiftsByProject";
import { useCreatorEligibility } from "@/hooks/useCreatorEligibility";
import {
  MIN_PUBLISHED_FOR_RECEIVE,
  type CreatorEligibilitySnapshot,
} from "@/lib/creatorEligibility";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
}

const GiftReceiveUnlockProgress = ({ data }: { data: CreatorEligibilitySnapshot }) => {
  const welcomePct = Math.min(100, (data.welcomeClaimedPx / data.welcomeTargetPx) * 100);
  const publishedPct = Math.min(100, (data.publishedCount / MIN_PUBLISHED_FOR_RECEIVE) * 100);
  const overallPct = Math.round((welcomePct + publishedPct) / 2);

  const steps = [
    {
      done: data.welcomeComplete,
      label: "Welcome Bonus",
      detail: `${data.welcomeClaimedPx.toLocaleString()} / ${data.welcomeTargetPx.toLocaleString()} PX`,
      href: "/portfolio",
    },
    {
      done: data.publishedCount >= MIN_PUBLISHED_FOR_RECEIVE,
      label: "เผยแพร่ผลงาน",
      detail: `${data.publishedCount} / ${MIN_PUBLISHED_FOR_RECEIVE} ชิ้น`,
      href: "/portfolio/new",
    },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">ปลดล็อกรับของขวัญ</p>
          <span className="text-xs text-muted-foreground tabular-nums">{overallPct}%</span>
        </div>
        <Progress value={overallPct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          ทำครบทั้ง 2 ขั้นตอนเพื่อให้คนอื่นส่งของขวัญสนับสนุนคุณได้
        </p>
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2.5 text-sm">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {step.done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">{step.detail}</p>
            </div>
            {!step.done && (
              <Link
                to={step.href}
                className="text-xs text-primary hover:underline shrink-0"
              >
                ไปทำ
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ReceivedGiftsSummary = ({ userId }: Props) => {
  const { data, isLoading } = useReceivedGiftsByProject(userId);
  const { data: eligibility, isLoading: eligibilityLoading } = useCreatorEligibility(userId);

  if (isLoading || eligibilityLoading) {
    return <InlineLoader className="py-6" />;
  }

  const showUnlock = eligibility && !eligibility.canReceiveGifts;
  const hasGifts = !!data && data.totalGifts > 0;

  if (!hasGifts) {
    return (
      <div className="space-y-4">
        {showUnlock && eligibility && <GiftReceiveUnlockProgress data={eligibility} />}
        <div className="text-center py-6">
          <GiftIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">ยังไม่มีของขวัญที่ได้รับ</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {showUnlock
              ? "ทำให้ครบ 2 ขั้นตอนด้านบนก่อน แล้วคนอื่นจะส่งของขวัญให้คุณได้"
              : "เมื่อมีคนสนับสนุนผลงานของคุณ จะปรากฏที่นี่"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showUnlock && eligibility && <GiftReceiveUnlockProgress data={eligibility} />}
      <div className="grid grid-cols-3 gap-2">
        <KpiBox icon={GiftIcon} label="ของขวัญทั้งหมด" value={data.totalGifts.toLocaleString()} />
        <KpiBox icon={Coins} label="รวม px" value={data.totalPx.toLocaleString()} accent />
        <KpiBox icon={FolderKanban} label="ผลงานที่ถูกสนับสนุน" value={data.projectsCount.toLocaleString()} />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          แยกตามผลงาน
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data.byProject.slice(0, 6).map((p) => {
            const inner = (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.giftCount} ของขวัญ ·{" "}
                    <span className="text-primary font-medium tabular-nums">
                      {p.totalPx.toLocaleString()} px
                    </span>
                  </p>
                </div>
              </div>
            );
            return p.projectId ? (
              <Link key={p.projectId} to={`/project/${p.projectId}`}>{inner}</Link>
            ) : (
              <div key="__none__">{inner}</div>
            );
          })}
        </div>
      </div>

      <Link
        to="/earnings"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        ดูทั้งหมดในหน้ารายได้ <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

const KpiBox = ({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) => (
  <div className={`rounded-xl p-3 ${accent ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-border"}`}>
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <Icon className={`w-3.5 h-3.5 ${accent ? "text-primary" : ""}`} />
      <span className="text-[10px] uppercase tracking-wider">{label}</span>
    </div>
    <p className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-primary" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);

export default ReceivedGiftsSummary;
