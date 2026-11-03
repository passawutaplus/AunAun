import { Bookmark, Eye, Heart, Share2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SharePopover from "@/components/SharePopover";
import { useAuth } from "@/hooks/useAuth";
import { useToggleEventInterest, useToggleEventLike, type EventStats } from "@/hooks/useExhibitionEvents";
import { isDemoEventId, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const iconBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-50";

type Props = {
  event: Pick<ExhibitionEvent, "id" | "title" | "cover_url" | "status">;
  stats?: EventStats;
  liked?: boolean;
  /** "สนใจ" — saved + reminders before the event starts. */
  interested?: boolean;
  /** Detail page: also show the view count. */
  showViews?: boolean;
  className?: string;
};

/** Like · share (· views) for an event — list cards and the event page. */
export function EventActions({ event, stats, liked = false, interested = false, showViews = false, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toggle = useToggleEventLike();
  const toggleInterest = useToggleEventInterest();
  const canLike = event.status === "published" && !isDemoEventId(event.id);
  const url = typeof window !== "undefined" ? `${window.location.origin}/exhibition/${event.id}` : `/exhibition/${event.id}`;

  const requireUser = () => {
    if (user) return true;
    navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`);
    return false;
  };
  const onLike = () => {
    if (requireUser()) toggle.mutate(event.id);
  };
  const onInterest = () => {
    if (requireUser()) toggleInterest.mutate(event.id);
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {showViews && stats ? (
        <span className="inline-flex h-9 items-center gap-1.5 px-2.5 text-sm text-muted-foreground" title="จำนวนครั้งที่เปิดดู">
          <Eye className="h-4 w-4" aria-hidden />
          <span className="tabular-nums">{compact.format(stats.view_count)}</span>
          <span className="sr-only">ครั้งที่เปิดดู</span>
        </span>
      ) : null}
      <button
        type="button"
        onClick={onLike}
        disabled={!canLike || toggle.isPending}
        aria-pressed={liked}
        aria-label={liked ? "เลิกถูกใจ" : "ถูกใจ"}
        className={cn(iconBtn, liked && "text-brand hover:text-brand")}
      >
        <Heart className={cn("h-4 w-4", liked && "fill-current")} aria-hidden />
        {stats ? <span className="tabular-nums">{compact.format(stats.like_count)}</span> : null}
      </button>
      <button
        type="button"
        onClick={onInterest}
        disabled={!canLike || toggleInterest.isPending}
        aria-pressed={interested}
        aria-label={interested ? "เลิกสนใจงานนี้" : "สนใจงานนี้ (เตือนก่อนงานเริ่ม)"}
        title={interested ? "สนใจแล้ว — จะเตือนก่อนงานเริ่ม" : "สนใจ — เตือนก่อนงานเริ่ม 3 วันและ 1 วัน"}
        className={cn(iconBtn, interested && "text-brand hover:text-brand")}
      >
        <Bookmark className={cn("h-4 w-4", interested && "fill-current")} aria-hidden />
        {stats ? <span className="tabular-nums">{compact.format(stats.interest_count)}</span> : null}
      </button>
      <SharePopover url={url} title={event.title} label="แชร์งานนี้" imageUrl={event.cover_url ?? undefined}>
        <button type="button" aria-label="แชร์" className={iconBtn}>
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </SharePopover>
    </div>
  );
}
