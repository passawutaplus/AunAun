import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";import {
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
type Props = {
  filter: CommunityFeedQueryFilter;
  onFilterChange: (next: CommunityFeedQueryFilter) => void;
  className?: string;
};

function SidebarCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl glass-panel p-4", className)}>{children}</div>
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

const CommunityFeedSidebar = ({ filter, onFilterChange, className }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { data: profile } = useProfile(user?.id);
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
        className="flex flex-col gap-3 max-h-[calc(100dvh-8.5rem)] overflow-y-auto scrollbar-hide pb-2"
      >
        <SidebarCard>
          {user && profile ? (
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
        </SidebarCard>

        <SidebarCard>
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
        </SidebarCard>

        <SidebarCard>
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
        </SidebarCard>

        <SidebarCard>
          <SectionHeader icon={Users} title="Suggested Creators" />
          {designers.length > 0 ? (
            <ul className="space-y-3">
              {designers.map(({ profile: designer }) => {
                const userId = designer.user_id ?? designer.id;
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
        </SidebarCard>
      </div>
    </aside>
  );
};

export default CommunityFeedSidebar;
