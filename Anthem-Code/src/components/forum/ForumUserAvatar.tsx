import { Shield, Sparkles } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { FORUM_RANK_LABELS, FORUM_RANK_TONES, type ForumRankSlug } from "@/lib/forum";
import { cn } from "@/lib/utils";

type Props = {
  src?: string | null;
  name?: string | null;
  isAdmin?: boolean;
  rank?: ForumRankSlug | null;
  rankTitle?: string | null;
  className?: string;
  size?: "sm" | "md";
};

/** Avatar with optional admin / community-rank badge (Discourse-style). */
export function ForumUserAvatar({
  src,
  name,
  isAdmin,
  rank,
  rankTitle,
  className,
  size = "sm",
}: Props) {
  const avatarSize = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const badgeSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const iconSize = size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";

  const title = isAdmin
    ? "แอดมิน"
    : rank
      ? rankTitle || FORUM_RANK_LABELS[rank]
      : name || undefined;

  return (
    <span className={cn("relative inline-flex shrink-0", className)} title={title}>
      <UserAvatar src={src} name={name} className={avatarSize} />
      {isAdmin ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-amber-500 text-white ring-2 ring-background",
            badgeSize,
          )}
          aria-label="แอดมิน"
        >
          <Shield className={iconSize} />
        </span>
      ) : rank ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-background",
            FORUM_RANK_TONES[rank],
            badgeSize,
          )}
          aria-label={FORUM_RANK_LABELS[rank]}
        >
          <Sparkles className={iconSize} />
        </span>
      ) : null}
    </span>
  );
}

export function ForumRankChip({
  rank,
  title,
  isAdmin,
}: {
  rank?: ForumRankSlug | null;
  title?: string | null;
  isAdmin?: boolean;
}) {
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
        <Shield className="h-3 w-3" />
        แอดมิน
      </span>
    );
  }
  if (!rank) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white",
        FORUM_RANK_TONES[rank],
      )}
    >
      <Sparkles className="h-3 w-3" />
      {title || FORUM_RANK_LABELS[rank]}
    </span>
  );
}
