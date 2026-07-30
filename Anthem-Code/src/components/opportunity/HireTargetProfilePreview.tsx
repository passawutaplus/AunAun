import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  label?: string;
  freelancerId?: string | null;
};

/** Avatar + name chip — who you're hiring (from project / profile / package). */
export default function HireTargetProfilePreview({
  name,
  username,
  avatarUrl,
  role,
  label = "ผู้รับงาน",
  freelancerId,
}: Props) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3",
        "sm:flex-nowrap",
      )}
    >
      <UserAvatar
        src={avatarUrl}
        name={trimmed}
        username={username}
        className="h-11 w-11 sm:h-12 sm:w-12 shrink-0"
      />
      <div className="min-w-0 flex-1 basis-[min(100%,12rem)]">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{trimmed}</p>
        {username?.trim() ? (
          <p className="truncate text-xs text-muted-foreground">@{username.trim()}</p>
        ) : role?.trim() ? (
          <p className="truncate text-xs text-muted-foreground">{role.trim()}</p>
        ) : null}
      </div>
      {freelancerId ? (
        <FollowButton
          freelancerId={freelancerId}
          size="sm"
          variant="compact"
          showFollowerCount={false}
          className="h-9 min-h-9 px-3 text-xs shrink-0 w-full sm:w-auto touch-manipulation"
        />
      ) : null}
    </div>
  );
}
