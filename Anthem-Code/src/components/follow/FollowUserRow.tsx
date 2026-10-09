import { Link } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { profilePublicPath } from "@/lib/profileRoutes";
import type { FollowUser } from "@/hooks/useFollowLists";
type Props = {
  user: FollowUser;
  showFollowedAt?: boolean;
  showFollowBack?: boolean;
  english?: boolean;
};

const timeAgo = (iso: string, english = false) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (!english) {
    if (m < 1) return "เมื่อสักครู่";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ชม.ที่แล้ว`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} วันที่แล้ว`;
    return new Date(iso).toLocaleDateString("th-TH");
  }
  if (m < 1) return "Just now";
  if (m < 60) return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "1 day ago" : `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const FollowUserRow = ({ user, showFollowedAt = false, showFollowBack = true, english = false }: Props) => {
  const profilePath = profilePublicPath({ user_id: user.userId, username: user.username });

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-card/40 hover:bg-secondary/30 transition-colors">
      <Link to={profilePath} className="shrink-0">
        <UserAvatar src={user.avatarUrl} name={user.displayName} className="w-11 h-11" />
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={profilePath} className="block font-semibold text-sm text-foreground hover:text-primary truncate">
          {user.displayName}
        </Link>
        {user.username && (
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        )}
        {showFollowedAt && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(user.followedAt, english)}</p>
        )}
      </div>
      {showFollowBack && (
        <FollowButton
          freelancerId={user.userId}
          size="sm"
          variant="compact"
          followLabel={english ? "Follow" : undefined}
          followingLabel={english ? "Following" : undefined}
          unfollowLabel={english ? "Unfollow" : undefined}
        />
      )}
    </div>
  );
};

export default FollowUserRow;
