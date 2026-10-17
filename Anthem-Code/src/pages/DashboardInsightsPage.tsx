import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Handshake, Heart, Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StatsCard from "@/components/StatsCard";
import StudioLayout from "@/components/dashboard/StudioLayout";
import StudioIdentityCard from "@/components/dashboard/StudioIdentityCard";
import PortfolioOverviewChart from "@/components/portfolio/PortfolioOverviewChart";
import StudioPulseChart, { type StudioPulseScope } from "@/components/dashboard/StudioPulseChart";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useHiringRequests } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { usePortfolioOverviewSeries } from "@/hooks/usePortfolioOverviewSeries";
import { usePackageOverviewSeries } from "@/hooks/usePackageOverviewSeries";
import { useCreatorServices } from "@/hooks/useCreatorServices";
import { useStudioRangeLikes } from "@/hooks/useStudioRangeLikes";
import { isHireCompletedStatus } from "@/lib/hiringStatus";
import { isCollabCompletedStatus } from "@/lib/collabInbox";
import { getProjectStatsRangeBounds, type ProjectStatsDateRange } from "@/lib/projectStatsDateRange";
import { STUDIO_INSIGHTS_PATH, STUDIO_PROJECTS_PATH } from "@/lib/studioNav";

/** My Studio → สถิติ: views / likes / followers over time (moved off the home page). */
export default function DashboardInsightsPage() {
  const { user, loading } = useAuth();
  return (
    <StudioLayout>
      <SeoHead title="My Studio — สถิติ" path={STUDIO_INSIGHTS_PATH} noindex />
      {loading || !user ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : (
        <InsightsBody userId={user.id} />
      )}
    </StudioLayout>
  );
}

function InsightsBody({ userId }: { userId: string }) {
  const { user } = useAuth();
  const { data: profile } = useProfile(userId);
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects(userId);
  const { data: hire = [] } = useHiringRequests(userId);
  const { data: collab = [] } = useReceivedCollabRequests();
  const [dateRange, setDateRange] = useState<ProjectStatsDateRange>({ preset: "7d" });
  const [scope, setScope] = useState<StudioPulseScope>("projects");
  const bounds = useMemo(() => getProjectStatsRangeBounds(dateRange), [dateRange]);
  const fromIso = bounds?.from.toISOString();
  const toIso = bounds?.to.toISOString();
  const projectIds = projects.map((p) => p.id);
  const { data: services = [] } = useCreatorServices(userId, { includeDrafts: true });
  const serviceIds = useMemo(() => services.map((s) => s.id), [services]);
  const enabled = !projectsLoading && !!bounds;
  const projectOverview = usePortfolioOverviewSeries(userId, projectIds, fromIso, toIso, enabled);
  const packageOverview = usePackageOverviewSeries(userId, serviceIds, fromIso, toIso, enabled && scope === "packages");
  const likes = useStudioRangeLikes(projectIds, fromIso, toIso, enabled);

  const views =
    scope === "packages"
      ? (packageOverview.data?.current.views.length ?? 0)
      : (projectOverview.data?.current.views.length ?? 0);

  return (
    <div className="space-y-4">
      <StudioIdentityCard
        userId={userId}
        displayName={profile?.display_name}
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        joinedAt={profile?.created_at ?? user?.created_at}
        hireCompleted={hire.filter((r) => isHireCompletedStatus(r.status)).length}
        collabCompleted={collab.filter((r) => isCollabCompletedStatus(r.status)).length}
      />
      <div className="grid grid-cols-3 gap-3">
        <Link to={STUDIO_PROJECTS_PATH} className="min-w-0">
          <StatsCard label="ยอดเข้าชม" value={views} icon={Eye} />
        </Link>
        <Link to={STUDIO_PROJECTS_PATH} className="min-w-0">
          <StatsCard label="กดไลค์" value={likes.data ?? 0} icon={Heart} />
        </Link>
        <Link to="/portfolio/followers" className="min-w-0">
          <StatsCard label="ผู้ติดตาม" value={projectOverview.data?.current.followers.length ?? 0} icon={Handshake} />
        </Link>
      </div>
      <StudioPulseChart
        userId={userId}
        projectIds={projectIds}
        enabled={!projectsLoading}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        scope={scope}
        onScopeChange={setScope}
      />
      <PortfolioOverviewChart ownerId={userId} projectIds={projectIds} />
    </div>
  );
}
