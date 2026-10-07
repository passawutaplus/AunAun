import { Link } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { profilePublicPath } from "@/lib/profileRoutes";
import type { FollowUser } from "@/hooks/useFollowLists";
import { timeAgo } from "@/lib/format";

type Props = {
  user: FollowUser;
  showFollowedAt?: boolean;
  showFollowBack?: boolean;
};

const FollowUserRow = ({ user, showFollowedAt = false, showFollowBack = true }: Props) => {
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
          <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(user.followedAt)}</p>
        )}
      </div>
      {showFollowBack && <FollowButton freelancerId={user.userId} size="sm" variant="compact" />}
    </div>
  );
};

export default FollowUserRow;
