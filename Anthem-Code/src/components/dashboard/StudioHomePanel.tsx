import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Handshake, Heart } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { InlineLoader } from "@/components/ui/BanterLoader";
import StudioNoteCard from "@/components/dashboard/StudioNoteCard";
import StudioTodoPanel from "@/components/dashboard/StudioTodoPanel";
import StudioPulseChart, { type StudioPulseScope } from "@/components/dashboard/StudioPulseChart";
import StudioIdentityCard from "@/components/dashboard/StudioIdentityCard";
import { EarningsHireBalanceCard } from "@/components/earnings/EarningsHireBalanceCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useHiringRequests } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { useMyProjects } from "@/hooks/useProjects";
import { useHireWallet } from "@/hooks/useHireWallet";
import { useHireSellerReadiness } from "@/hooks/useHireSellerReadiness";
import { useSubjectWorkReviews } from "@/hooks/useWorkReviews";
import { usePortfolioOverviewSeries } from "@/hooks/usePortfolioOverviewSeries";
import { usePackageOverviewSeries } from "@/hooks/usePackageOverviewSeries";
import { useCreatorServices } from "@/hooks/useCreatorServices";
import { useStudioRangeLikes } from "@/hooks/useStudioRangeLikes";
import { isContactedNewStatus, HIRE_TAB_ACCEPTED, isHireCompletedStatus } from "@/lib/hiringStatus";
import { isCollabAcceptedStatus, isCollabContactedNewStatus, isCollabCompletedStatus } from "@/lib/collabInbox";
import { PAYOUT_MIN_SATANG } from "@/lib/payments/payoutPolicy";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { satangToThb } from "@/lib/payments/fees";
import { withdrawStartPath } from "@/lib/payments/withdrawPin";
import { getProjectStatsRangeBounds, type ProjectStatsDateRange } from "@/lib/projectStatsDateRange";
import { STUDIO_HIRE_PATH, STUDIO_PROJECTS_PATH } from "@/lib/studioNav";

type Props = {
  userId: string;
};

export default function StudioHomePanel({ userId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(userId);
  const { data: hireRequests = [], isLoading: hireLoading } = useHiringRequests(userId);
  const { data: collabRequests = [], isLoading: collabLoading } = useReceivedCollabRequests();
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects(userId);
  const { view: wallet, isLoading: walletLoading, isPreview, resetPreview } = useHireWallet(userId);
  const readiness = useHireSellerReadiness(userId);
  const { data: reviews = [], isLoading: reviewsLoading } = useSubjectWorkReviews(userId);
  const [dateRange, setDateRange] = useState<ProjectStatsDateRange>({ preset: "7d" });
  const [pulseScope, setPulseScope] = useState<StudioPulseScope>("projects");
  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);
  const fromIso = bounds?.from.toISOString();
  const toIso = bounds?.to.toISOString();

  const hireNew = hireRequests.filter((r) => isContactedNewStatus(r.status)).length;
  const hireActive = hireRequests.filter((r) => r.status === HIRE_TAB_ACCEPTED).length;
  const collabNew = collabRequests.filter((r) => isCollabContactedNewStatus(r.status)).length;
  const collabActive = collabRequests.filter((r) => isCollabAcceptedStatus(r.status)).length;
  const hireCompleted = hireRequests.filter((r) => isHireCompletedStatus(r.status)).length;
  const collabCompleted = collabRequests.filter((r) => isCollabCompletedStatus(r.status)).length;
  const joinedAt = profile?.created_at ?? user?.created_at;
  const reviewPending = reviews.filter((r) => !r.reply_at).length;
  const projectIds = projects.map((p) => p.id);
  const { data: services = [] } = useCreatorServices(userId, { includeDrafts: true });
  const serviceIds = useMemo(() => services.map((service) => service.id), [services]);
  const pulseEnabled = !projectsLoading && !!bounds;
  const projectOverview = usePortfolioOverviewSeries(userId, projectIds, fromIso, toIso, pulseEnabled);
  const packageOverview = usePackageOverviewSeries(
    userId,
    serviceIds,
    fromIso,
    toIso,
    pulseEnabled && pulseScope === "packages",
  );
  const likesQuery = useStudioRangeLikes(projectIds, fromIso, toIso, pulseEnabled);
  const viewCount =
    pulseScope === "packages"
      ? (packageOverview.data?.current.views.length ?? 0)
      : (projectOverview.data?.current.views.length ?? 0);
  const followerCount = projectOverview.data?.current.followers.length ?? 0;
  const likeCount = likesQuery.data ?? 0;

  const statsLoading =
    hireLoading || collabLoading || projectsLoading || reviewsLoading || readiness.isLoading;

  const queue = [
    { to: STUDIO_HIRE_PATH, label: "จ้างงานรอตอบ", count: hireNew, kind: "hire" as const },
    { to: STUDIO_HIRE_PATH, label: "งานจ้างที่กำลังทำ", count: hireActive, kind: "hire" as const },
    { to: "/dashboard/collab", label: "คอลแลปรอตอบ", count: collabNew, kind: "collab" as const },
    { to: "/dashboard/collab", label: "คอลแลปที่กำลังทำ", count: collabActive, kind: "collab" as const },
    ...(reviewPending > 0
      ? [{ to: "/dashboard/reviews", label: "รีวิวยังไม่ตอบ", count: reviewPending, kind: "review" as const }]
      : []),
  ];

  const missingReady = readiness.items.filter((item) => !item.done);
  const canWithdraw = isPreview && wallet.availableSatang >= PAYOUT_MIN_SATANG;
  const withdrawHint = !isPreview
    ? "ระบบถอนจริงกำลังเปิด — ทดลองกดได้ในเดโม่หรือโหมดตัวอย่าง"
    : wallet.availableSatang < PAYOUT_MIN_SATANG
      ? `อีก ${formatMoneyLabel(satangToThb(Math.max(0, PAYOUT_MIN_SATANG - wallet.availableSatang)), "THB")} ถึงขั้นต่ำถอน`
      : undefined;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <StudioIdentityCard
          userId={userId}
          displayName={profile?.display_name}
          username={profile?.username}
          avatarUrl={profile?.avatar_url}
          joinedAt={joinedAt}
          hireCompleted={hireCompleted}
          collabCompleted={collabCompleted}
        />
        <StudioPulseChart
          userId={userId}
          projectIds={projectIds}
          enabled={!projectsLoading}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          scope={pulseScope}
          onScopeChange={setPulseScope}
        />
        <div className="grid grid-cols-3 gap-3">
          <Link to={STUDIO_PROJECTS_PATH} className="min-w-0">
            <StatsCard label="ยอดเข้าชม" value={viewCount} icon={Eye} />
          </Link>
          <Link to={STUDIO_PROJECTS_PATH} className="min-w-0">
            <StatsCard label="กดไลค์" value={likeCount} icon={Heart} />
          </Link>
          <Link to="/portfolio/followers" className="min-w-0">
            <StatsCard label="ผู้ติดตาม" value={followerCount} icon={Handshake} />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <StudioTodoPanel userId={userId} queue={statsLoading ? [] : queue} />
        <div className="space-y-4">
          <StudioNoteCard userId={userId} />
          {walletLoading ? (
            <InlineLoader />
          ) : (
            <EarningsHireBalanceCard
              compact
              availableSatang={wallet.availableSatang}
              onWithdraw={() => navigate(withdrawStartPath({ preview: isPreview }))}
              canWithdraw={canWithdraw}
              withdrawHint={withdrawHint}
              isPreview={isPreview}
              bankName={wallet.bankName}
              accountLast4={wallet.accountLast4}
              onResetPreview={isPreview ? resetPreview : undefined}
            />
          )}
        </div>
      </div>

      {!statsLoading && missingReady.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">ความพร้อมรับงาน</h2>
          <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl glass-panel">
            {missingReady.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-secondary/40"
                >
                  <span>
                    <span className="block font-medium text-foreground">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.hint}</span>
                  </span>
                  <span className="shrink-0 text-xs text-primary">ไปทำ</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
