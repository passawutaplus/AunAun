import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  GitBranch,
  Handshake,
  HelpCircle,
  Home,
  ImageIcon,
  Lightbulb,
  MessageSquare,
  Plus,
  Users,
  Video,
} from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyStudios } from "@/hooks/useStudios";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  COMMUNITY_NEW_PATH,
  communityNewPathWithKind,
} from "@/data/createActions";
import type { CommunityPostKind } from "@/hooks/useCommunityPosts";
import type { CommunityFeedQueryFilter } from "@/hooks/useCommunityFeedFilter";
import { cn } from "@/lib/utils";

type Props = {
  filter: CommunityFeedQueryFilter;
  onFilterChange: (next: CommunityFeedQueryFilter) => void;
  onComposeClick?: () => void;
  className?: string;
};

type NavId = "for-you" | "following" | "questions" | "tips" | "feedback" | "workflow" | "collab";

const NAV_ITEMS: {
  id: NavId;
  label: string;
  icon: typeof Home;
}[] = [
  { id: "for-you", label: "สำหรับคุณ", icon: Home },
  { id: "following", label: "กำลังติดตาม", icon: Users },
  { id: "questions", label: "คำถาม / Q&A", icon: HelpCircle },
  { id: "tips", label: "Tips & ทริค", icon: Lightbulb },
  { id: "feedback", label: "ขอ Feedback", icon: MessageSquare },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "collab", label: "หาคอลแลป", icon: Handshake },
];

function SidebarCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl glass-panel p-4", className)}>{children}</div>
  );
}

function navIsActive(id: NavId, filter: CommunityFeedQueryFilter): boolean {
  switch (id) {
    case "for-you":
      return (
        filter.feedSource === "all" &&
        !filter.postKind &&
        !filter.tag &&
        filter.category === "All"
      );
    case "following":
      return filter.feedSource === "following" && !filter.postKind && !filter.tag;
    case "questions":
      return filter.postKind === "question" && !filter.tag;
    case "tips":
      return filter.postKind === "tip" && !filter.tag;
    case "feedback":
      return filter.tag === "ขอfeedback";
    case "workflow":
      return filter.tag === "workflow";
    case "collab":
      return filter.tag === "collab";
    default:
      return false;
  }
}

function applyNav(id: NavId, filter: CommunityFeedQueryFilter): CommunityFeedQueryFilter {
  const base = { ...filter, category: "All" as const };
  switch (id) {
    case "for-you":
      return { ...base, feedSource: "all", postKind: undefined, tag: undefined };
    case "following":
      return { ...base, feedSource: "following", postKind: undefined, tag: undefined };
    case "questions":
      return { ...base, feedSource: "all", postKind: "question" as CommunityPostKind, tag: undefined };
    case "tips":
      return { ...base, feedSource: "all", postKind: "tip" as CommunityPostKind, tag: undefined };
    case "feedback":
      return { ...base, feedSource: "all", postKind: undefined, tag: "ขอfeedback" };
    case "workflow":
      return { ...base, feedSource: "all", postKind: undefined, tag: "workflow" };
    case "collab":
      return { ...base, feedSource: "all", postKind: undefined, tag: "collab" };
    default:
      return base;
  }
}

function useComposeAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openAuth = useAuthDialog((s) => s.openSignup);

  const requireAuth = (to: string, onComposeClick?: () => void) => {
    if (!user) {
      openAuth(to);
      return;
    }
    if (onComposeClick) {
      onComposeClick();
      return;
    }
    navigate(to);
  };

  return { user, requireAuth };
}

const CommunityFeedSidebar = ({ filter, onFilterChange, onComposeClick, className }: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myStudios = [] } = useMyStudios();
  const navigate = useNavigate();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { requireAuth } = useComposeAuth();

  const goNew = (path: string) => requireAuth(path, onComposeClick);

  const handleNav = (id: NavId) => {
    if (id === "following" && !user) {
      openAuth("/?mode=community&feed=following");
      return;
    }
    onFilterChange(applyNav(id, filter));
  };

  return (
    <aside
      className={cn(
        "hidden xl:block w-[280px] shrink-0 self-start sticky z-20 top-28",
        className,
      )}
    >
      <div className="flex flex-col gap-3 max-h-[calc(100dvh-8.5rem)] overflow-y-auto scrollbar-hide pb-2">
        <SidebarCard>
          <button
            type="button"
            onClick={() => goNew(COMMUNITY_NEW_PATH)}
            className="w-full flex items-start gap-3 text-left rounded-xl hover:bg-accent/25 transition-colors p-1 -m-1"
          >
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.display_name ?? user?.email ?? "?"}
              className="w-10 h-10 shrink-0"
              fallbackClassName="text-sm"
            />
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground thai-display">แชร์อัปเดต</p>
              <p className="text-xs text-muted-foreground thai-body mt-0.5">คิดอะไรอยู่?</p>
            </div>
          </button>

          <div className="mt-3 pt-3 border-t border-border/60 grid grid-cols-4 gap-1">
            {[
              { label: "รูป", icon: ImageIcon, to: COMMUNITY_NEW_PATH },
              { label: "วิดีโอ", icon: Video, to: COMMUNITY_NEW_PATH },
              { label: "Q&A", icon: HelpCircle, to: communityNewPathWithKind("question") },
              { label: "Tips", icon: Lightbulb, to: communityNewPathWithKind("tip") },
            ].map(({ label, icon: Icon, to }) => (
              <button
                key={label}
                type="button"
                onClick={() => goNew(to)}
                className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-accent/30 transition-colors"
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </SidebarCard>

        <SidebarCard>
          <h2 className="text-sm font-semibold text-foreground mb-2 thai-display">ชุมชน</h2>
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = navIsActive(id, filter);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNav(id)}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-left",
                    active
                      ? "bg-accent/50 text-primary"
                      : "text-foreground/90 hover:bg-accent/30 hover:text-foreground",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
                  )}
                  <Icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} strokeWidth={1.75} />
                  <span className="thai-body">{label}</span>
                </button>
              );
            })}
          </nav>
        </SidebarCard>

        <SidebarCard>
          <h2 className="text-sm font-semibold text-foreground mb-2 thai-display">ของฉัน</h2>
          <div className="flex flex-col gap-0.5">
            {user ? (
              <Link
                to="/portfolio/saved"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground/90 hover:bg-accent/30 transition-colors"
              >
                <Bookmark className="w-4 h-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                <span className="thai-body">โพสต์ที่บันทึก</span>
              </Link>
            ) : null}

            {myStudios.slice(0, 4).map((studio) => (
              <Link
                key={studio.id}
                to={`/studio/${studio.slug}`}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-accent/30 transition-colors"
              >
                <UserAvatar
                  src={studio.avatar_url}
                  name={studio.name}
                  className="w-7 h-7 rounded-lg shrink-0"
                  fallbackClassName="text-[10px] rounded-lg"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate thai-body">{studio.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {studio.member_count ?? 0} สมาชิก
                  </p>
                </div>
              </Link>
            ))}

            <button
              type="button"
              onClick={() => (user ? navigate("/studio/new") : openAuth("/studio/new"))}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary hover:bg-accent/30 transition-colors mt-1"
            >
              <Plus className="w-4 h-4" />
              <span className="thai-body">สร้างสตูดิโอ</span>
            </button>
          </div>
        </SidebarCard>
      </div>
    </aside>
  );
};

export default CommunityFeedSidebar;
