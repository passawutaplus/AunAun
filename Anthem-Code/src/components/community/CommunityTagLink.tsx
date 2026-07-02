import { Link } from "react-router-dom";
import { communityTagFeedUrl } from "@/lib/communityRoutes";
import { cn } from "@/lib/utils";

type Props = {
  tag: string;
  className?: string;
  compact?: boolean;
};

export function CommunityTagLink({ tag, className, compact }: Props) {
  const label = tag.trim().replace(/^#+/, "");
  if (!label) return null;

  return (
    <Link
      to={communityTagFeedUrl(label)}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "text-primary hover:underline hover:text-primary/90 transition-colors",
        compact ? "text-xs" : "text-sm",
        className,
      )}
    >
      #{label}
    </Link>
  );
}
