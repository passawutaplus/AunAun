import { Bookmark, Eye, Share2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SharePopover from "@/components/SharePopover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  useToggleEventInterest,
  type EventStats,
} from "@/hooks/useExhibitionEvents";
import { eventPath, isDemoEventId, type ExhibitionEvent } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";
import { intlLocale, useLang, useT } from "@/lib/i18n";
import { DETAIL } from "@/lib/i18n/exhibition/detail";

const iconBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:opacity-50";

type Props = {
  event: Pick<ExhibitionEvent, "id" | "title" | "cover_url" | "status">;
  stats?: EventStats;
  /** "สนใจ" — saved + reminders before the event starts. */
  interested?: boolean;
  /** Detail page: also show the view count. */
  showViews?: boolean;
  /** Event page: สนใจ as an outlined pill with its label, not just the icon. */
  labeled?: boolean;
  className?: string;
};

/** สนใจ · share (· views) for an event — list cards and the event page. */
export function EventActions({
  event,
  stats,
  interested = false,
  showViews = false,
  labeled = false,
  className,
}: Props) {
  const { user } = useAuth();
  const t = useT(DETAIL);
  const lang = useLang();
  const compact = new Intl.NumberFormat(intlLocale(lang), { notation: "compact", maximumFractionDigits: 1 });
  const navigate = useNavigate();
  const location = useLocation();
  const toggleInterest = useToggleEventInterest();
  const canInterest = event.status === "published" && !isDemoEventId(event.id);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${eventPath(event)}`
      : eventPath(event);

  const requireUser = () => {
    if (user) return true;
    navigate(
      `/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`,
    );
    return false;
  };
  const onInterest = () => {
    if (requireUser()) toggleInterest.mutate(event.id);
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {showViews && stats ? (
        <span
          className="inline-flex h-9 items-center gap-1.5 px-2.5 text-sm text-muted-foreground"
          title={t("viewCount")}
        >
          <Eye className="h-4 w-4" aria-hidden />
          <span className="tabular-nums">
            {compact.format(stats.view_count)}
          </span>
          <span className="sr-only">{t("viewsSr")}</span>
        </span>
      ) : null}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onInterest}
            disabled={!canInterest || toggleInterest.isPending}
            aria-pressed={interested}
            aria-label={
              interested ? t("uninterestAria") : t("interestAria")
            }
            className={cn(
              iconBtn,
              labeled &&
                "mr-1 border border-foreground/25 bg-transparent px-4 text-foreground hover:border-foreground hover:bg-transparent",
              interested && "text-brand hover:text-brand",
              labeled && interested && "border-brand hover:border-brand",
            )}
          >
            <Bookmark
              className={cn("h-4 w-4", interested && "fill-current")}
              aria-hidden
            />
            {labeled ? <span>{interested ? t("interested") : t("interest")}</span> : null}
            {stats ? (
              <span className="tabular-nums">
                {compact.format(stats.interest_count)}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[16rem] text-center">
          {interested
            ? t("interestedTip")
            : t("interestTip")}
        </TooltipContent>
      </Tooltip>
      <SharePopover
        url={url}
        title={event.title}
        label={t("shareEvent")}
        imageUrl={event.cover_url ?? undefined}
      >
        <button type="button" aria-label={t("share")} className={iconBtn}>
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </SharePopover>
    </div>
  );
}
