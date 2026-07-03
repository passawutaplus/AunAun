import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  Briefcase,
  ChevronRight,
  Flame,
  Users,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  getDesignerProfileUserId,
  useCommunityProfileStats,
  useCommunityTrendingTags,
  useFeedSidebarJobs,
  useSuggestedFeedDesigners,
} from "@/hooks/useCommunityFeedSidebarData";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useSavedJobIds, useToggleSaveJob } from "@/hooks/useJobs";
import { fmtBudget, fmtLocationChip } from "@/components/jobs/jobCardUtils";
import { profilePublicPath } from "@/lib/profileRoutes";
import { communityTagFeedUrl } from "@/lib/communityRoutes";
import type { CommunityFeedQueryFilter } from "@/hooks/useCommunityFeedFilter";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/lib/requireAuth";
import { useStickyViewportCenter } from "@/hooks/useStickyViewportCenter";
import { formatCompact } from "@/lib/format";

type Props = {
  filter: CommunityFeedQueryFilter;
  onFilterChange: (next: CommunityFeedQueryFilter) => void;
  className?: string;
};

function SidebarSection({
  children,
  className,
  first,
}: {
  children: ReactNode;
  className?: string;
  first?: boolean;
}) {
  return (
    <section
      className={cn(
        "py-4",
        !first && "border-t border-border/50",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: typeof Flame;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.75} />
      <h2 className="text-sm font-semibold text-foreground thai-display">{title}</h2>
    </div>
  );
}

function ViewAllLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 mt-3 text-xs font-medium text-primary hover:underline underline-offset-2"
    >
      {label}
      <ChevronRight className="w-3.5 h-3.5" />
    </Link>
  );
}

function ProfileStatLink({ to, value, label }: { to: string; value: number; label: string }) {
  return (
    <Link
      to={to}
      className="min-w-0 rounded-lg py-1 text-left transition-colors hover:text-primary"
    >
      <span className="block text-sm font-semibold leading-none text-foreground tabular-nums">
        {formatCompact(value)}
      </span>
      <span className="mt-1 block text-[11px] leading-none text-muted-foreground thai-body">
        {label}
      </span>
    </Link>
  );
}

export const CommunityFeedMobileDiscovery = ({ filter, onFilterChange, className }: Props) => {
  const navigate = useNavigate();
  const { data: trending = [] } = useCommunityTrendingTags(5);
  const { designers = [] } = useSuggestedFeedDesigners(3);

  const handleTrendingClick = (tag: string) => {
    onFilterChange({
      ...filter,
      category: "All",
      feedSource: "all",
      postKind: undefined,
      tag,
    });
    navigate(communityTagFeedUrl(tag));
  };

  return (
    <section className={cn("xl:hidden mb-4 border-y border-border/60 py-3", className)}>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 border-r border-border/50 pr-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
            <h2 className="truncate text-xs font-semibold text-foreground thai-display">Trends</h2>
          </div>
          {trending.length > 0 ? (
            <ol className="space-y-1.5">
              {trending.map(({ tag }, index) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => handleTrendingClick(tag)}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-1.5 rounded-md py-0.5 text-left transition-colors hover:text-primary",
                      filter.tag === tag ? "text-primary" : "text-foreground",
                    )}
                  >
                    <span className="w-3 shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 truncate text-[12px] font-medium">#{tag}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] text-muted-foreground thai-body">ยังไม่มีเทรนด์</p>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
            <h2 className="truncate text-xs font-semibold text-foreground thai-display">
              Suggested
            </h2>
          </div>
          {designers.length > 0 ? (
            <ul className="space-y-2.5">
              {designers.map(({ profile: designer }) => {
                const userId = getDesignerProfileUserId(designer);
                return (
                  <li key={userId} className="flex items-center gap-2">
                    <Link
                      to={profilePublicPath({ user_id: userId, username: designer.username })}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg transition-colors hover:text-primary"
                    >
                      <UserAvatar
                        src={designer.avatar_url}
                        name={designer.display_name ?? "?"}
                        className="h-7 w-7 shrink-0"
                        fallbackClassName="text-[10px]"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-foreground thai-body">
                          {designer.display_name ?? "Creator"}
                        </span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {designer.username ? `@${designer.username}` : designer.role ?? "Creator"}
                        </span>
                      </span>
                    </Link>
                    <FollowButton
                      freelancerId={userId}
                      size="sm"
                      tone="muted"
                      iconOnly
                      showFollowerCount={false}
                      className="h-8 w-8 shrink-0"
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[11px] text-muted-foreground thai-body">กำลังหาให้...</p>
          )}
        </div>
      </div>
    </section>
  );
};

const CommunityFeedSidebar = ({ filter, onFilterChange, className }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { data: profile } = useProfile(user?.id);
  const { data: profileStats } = useCommunityProfileStats(user?.id);
  const { data: trending = [] } = useCommunityTrendingTags(5);
  const { jobs = [] } = useFeedSidebarJobs(3);
  const { designers = [] } = useSuggestedFeedDesigners(3);
  const { data: savedJobIds } = useSavedJobIds();
  const toggleSaveJob = useToggleSaveJob();
  const { ref: stickyRef, topPx } = useStickyViewportCenter();
  const handleTrendingClick = (tag: string) => {
    onFilterChange({
      ...filter,
      category: "All",
      feedSource: "all",
      postKind: undefined,
      tag,
    });
    navigate(communityTagFeedUrl(tag));
  };

  return (
    <aside
      style={{ top: topPx }}
      className={cn(
        "hidden xl:block w-[280px] shrink-0 sticky z-20 self-start",
        className,
      )}
    >
      <div
        ref={stickyRef}
        className="flex flex-col max-h-[calc(100dvh-8.5rem)] overflow-y-auto scrollbar-hide pb-2"
      >
        <SidebarSection first>
          {user && profile ? (
            <div>
              <Link
                to="/portfolio"
                className="flex items-center gap-3 rounded-xl hover:bg-accent/25 transition-colors p-1 -m-1"
              >
                <UserAvatar
                  src={profile.avatar_url}
                  name={profile.display_name ?? user.email ?? "?"}
                  className="w-11 h-11 shrink-0"
                  fallbackClassName="text-sm"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate thai-display">
                    {profile.display_name ?? "โปรไฟล์ของฉัน"}
                  </p>
                  {profile.username ? (
                    <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground truncate thai-body">ดูโปรไฟล์</p>
                  )}
                </div>
              </Link>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <ProfileStatLink
                  to="/portfolio"
                  value={profileStats?.posts ?? 0}
                  label="โพสต์"
                />
                <ProfileStatLink
                  to={`/u/${user.id}/followers`}
                  value={profileStats?.followers ?? 0}
                  label="ผู้ติดตาม"
                />
                <ProfileStatLink
                  to={`/u/${user.id}/followers?tab=following`}
                  value={profileStats?.following ?? 0}
                  label="ติดตาม"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuth("/?mode=community")}
              className="w-full text-left rounded-xl hover:bg-accent/25 transition-colors p-1 -m-1"
            >
              <p className="text-sm font-semibold text-foreground thai-display">เข้าสู่ระบบ</p>
              <p className="text-xs text-muted-foreground mt-0.5 thai-body">
                ดูงานและดีไซเนอร์ที่เหมาะกับคุณ
              </p>
            </button>
          )}
        </SidebarSection>

        <SidebarSection>
          <SectionHeader icon={Flame} title="Trending Topics" />
          {trending.length > 0 ? (
            <ol className="space-y-2">
              {trending.map(({ tag }, index) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => handleTrendingClick(tag)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-accent/30 transition-colors",
                      filter.tag === tag && "bg-accent/40",
                    )}
                  >
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums w-4 shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">#{tag}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-muted-foreground thai-body">ยังไม่มีแฮชแท็กยอดนิยม</p>
          )}
        </SidebarSection>

        <SidebarSection>
          <SectionHeader icon={Briefcase} title="งานที่น่าสนใจ" />
          {jobs.length > 0 ? (
            <ul className="space-y-2.5">
              {jobs.map((job) => {
                const isSaved = savedJobIds?.has(job.id) ?? false;
                const meta = [fmtLocationChip(job.location_type, job.location), fmtBudget(job)]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={job.id} className="flex items-start gap-2">
                    <Link to={`/jobs/${job.id}`} className="min-w-0 flex-1 group">
                      <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors thai-body">
                        {job.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{meta}</p>
                    </Link>
                    <button
                      type="button"
                      aria-label={isSaved ? "เลิกบันทึกงาน" : "บันทึกงาน"}
                      onClick={(e) => {
                        e.preventDefault();
                        requireAuth(user, () =>
                          toggleSaveJob.mutate({ jobId: job.id, saved: isSaved }),
                        );
                      }}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent/30 transition-colors"
                    >
                      <Bookmark
                        className={cn("w-4 h-4", isSaved && "fill-primary text-primary")}
                        strokeWidth={1.75}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground thai-body">ยังไม่มีงานเปิดรับตอนนี้</p>
          )}
          <ViewAllLink to="/jobs" label="ดูงานทั้งหมด" />
        </SidebarSection>

        <SidebarSection>
          <SectionHeader icon={Users} title="Suggested Creators" />
          {designers.length > 0 ? (
            <ul className="space-y-3">
              {designers.map(({ profile: designer }) => {
                const userId = getDesignerProfileUserId(designer);
                return (
                  <li key={userId} className="flex items-center gap-2.5">
                    <Link to={profilePublicPath({ user_id: userId, username: designer.username })}>
                      <UserAvatar
                        src={designer.avatar_url}
                        name={designer.display_name ?? "?"}
                        className="w-9 h-9 shrink-0"
                        fallbackClassName="text-xs"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={profilePublicPath({ user_id: userId, username: designer.username })}
                        className="text-sm font-medium text-foreground truncate block hover:text-primary transition-colors thai-body"
                      >
                        {designer.display_name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {designer.username ? `@${designer.username}` : designer.role ?? "Creator"}
                      </p>
                    </div>
                    <FollowButton
                      freelancerId={userId}
                      size="sm"
                      tone="muted"
                      showFollowerCount={false}
                      className="h-7 px-2.5 text-[11px]"
                    />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground thai-body">กำลังหาดีไซเนอร์ให้…</p>
          )}
          <ViewAllLink to="/?mode=designers" label="ดูดีไซเนอร์เพิ่ม" />
        </SidebarSection>
      </div>
    </aside>
  );
};

export default CommunityFeedSidebar;
