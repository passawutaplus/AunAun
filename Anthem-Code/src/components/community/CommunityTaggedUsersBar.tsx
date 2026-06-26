import { Link } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import type { TaggedUserSummary } from "@/lib/communityTaggedUsers";
import { profilePublicPath } from "@/lib/profileRoutes";
import { cn } from "@/lib/utils";

type Props = {
  users: TaggedUserSummary[];
  linkable?: boolean;
  className?: string;
};

function userLabel(u: TaggedUserSummary) {
  return u.username ? `@${u.username}` : u.display_name;
}

export function CommunityTaggedUsersBar({ users, linkable = false, className }: Props) {
  if (!users.length) return null;

  return (
    <div className={cn("px-4 py-2.5 border-t border-border/50 bg-muted/20", className)}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">แท็กเพื่อน</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {users.map((u) => {
          const inner = (
            <>
              <UserAvatar src={u.avatar_url} name={u.display_name} className="w-7 h-7 shrink-0" />
              <span className="text-xs font-medium truncate max-w-[140px]">{userLabel(u)}</span>
            </>
          );
          const chipClass =
            "inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-2.5 py-1.5 shrink-0";

          if (linkable) {
            return (
              <Link
                key={u.user_id}
                to={profilePublicPath({ user_id: u.user_id, username: u.username })}
                className={cn(chipClass, "hover:border-primary/40")}
              >
                {inner}
              </Link>
            );
          }
          return (
            <span key={u.user_id} className={chipClass}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
