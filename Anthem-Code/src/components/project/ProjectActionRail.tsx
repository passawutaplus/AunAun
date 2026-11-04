import { useLayoutEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, MessageCircle, Pencil, Share2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import SharePopover from "@/components/SharePopover";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProjectIds } from "@/hooks/useCollections";
import { cn } from "@/lib/utils";
import { useProjectT } from "@/lib/i18n/project";

type Props = {
  projectId?: string;
  title: string;
  ownerId?: string;
  ownerName: string;
  ownerAvatar?: string;
  isOwner?: boolean;
  onChat?: () => void;
  shareUrl: string;
  shareImageUrl?: string;
  /** "rail": floating vertical pill beside the work (desktop). "row": inline row above the work (phones). */
  variant?: "rail" | "row";
  /** Rail sits on the dark overlay backdrop: frosted dark glass with white icons. */
  onDark?: boolean;
  className?: string;
};

const iconBtn =
  "inline-flex h-11 w-11 items-center justify-center rounded-full text-current transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Rail geometry: disc diameter = pill width (wider than the 48px avatar so the follow badge stays inside), gap between disc and pill. */
const RAIL_W = 60;
const RAIL_GAP = 12;

/**
 * Vertical pill + liquid neck + avatar disc below it as one outline (bottom-nav style, upright).
 * Built in horizontal coordinates (disc left, pill right), then rotated so the disc ends up at
 * the bottom (x -> total height - x, y -> x); a rotation keeps the arc sweep directions.
 */
function railOutline(pillH: number): string {
  const R = RAIL_W / 2;
  const x0 = RAIL_W + RAIL_GAP;
  const t = (50 * Math.PI) / 180;
  const sin = Math.sin(t);
  const cos = Math.cos(t);
  const a = [R + R * cos, R - R * sin];
  const b = [x0 + R - R * cos, R - R * sin];
  const a2 = [R + R * cos, R + R * sin];
  const b2 = [x0 + R - R * cos, R + R * sin];
  const k = (b[0] - a[0]) / 2;
  const end = x0 + pillH;
  const P = (x: number, y: number) => `${y.toFixed(2)} ${(end - x).toFixed(2)}`;
  return [
    `M ${P(a[0], a[1])}`,
    `C ${P(a[0] + k * sin, a[1] + k * cos)} ${P(b[0] - k * sin, b[1] + k * cos)} ${P(b[0], b[1])}`,
    `A ${R} ${R} 0 0 1 ${P(x0 + R, 0)}`,
    `L ${P(end - R, 0)}`,
    `A ${R} ${R} 0 1 1 ${P(end - R, 2 * R)}`,
    `L ${P(x0 + R, 2 * R)}`,
    `A ${R} ${R} 0 0 1 ${P(b2[0], b2[1])}`,
    `C ${P(b2[0] - k * sin, b2[1] - k * cos)} ${P(a2[0] + k * sin, a2[1] - k * cos)} ${P(a2[0], a2[1])}`,
    `A ${R} ${R} 0 1 1 ${P(a[0], a[1])}`,
    "Z",
  ].join(" ");
}

/** Frosted glass behind the avatar disc and the pill, sized from the pill. */
function RailGlass({ pill, onDark }: { pill: HTMLDivElement | null; onDark: boolean }) {
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    if (!pill) return;
    const measure = () => setH(pill.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pill);
    return () => ro.disconnect();
  }, [pill]);
  if (!h) return null;
  const height = RAIL_W + RAIL_GAP + h;
  const d = railOutline(h);
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2" style={{ width: RAIL_W, height }}>
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-2xl backdrop-saturate-150",
          onDark ? "bg-white/[0.08]" : "bg-background/65 dark:bg-card/50",
        )}
        style={{ clipPath: `path('${d}')` }}
      />
      <svg className="absolute inset-0 overflow-visible" width={RAIL_W} height={height}>
        <path d={d} fill="none" className={onDark ? "stroke-white/25" : "stroke-foreground/15"} strokeWidth={1} />
      </svg>
    </div>
  );
}

/** Profile (+ follow badge) and one pill of icon-only actions: collection, share, message. */
const ProjectActionRail = ({
  projectId,
  title,
  ownerId,
  ownerName,
  ownerAvatar,
  isOwner,
  onChat,
  shareUrl,
  shareImageUrl,
  variant = "rail",
  onDark = false,
  className,
}: Props) => {
  const { user } = useAuth();
  const { t } = useProjectT();
  const { data: savedProjectIds = [] } = useSavedProjectIds(user?.id);
  const saved = !!projectId && savedProjectIds.includes(projectId);
  const rail = variant === "rail";
  const [pillEl, setPillEl] = useState<HTMLDivElement | null>(null);
  const avatarCls = cn(
    rail ? "h-12 w-12" : "h-9 w-9",
    "ring-2",
    onDark ? "ring-white/25" : "ring-background",
  );
  const avatarFallback = "bg-muted text-foreground text-xs font-medium";

  const avatar = (
    <div className="relative shrink-0">
      {ownerId ? (
        <Link
          to={`/u/${ownerId}`}
          aria-label={t("viewProfile", { name: ownerName })}
          title={ownerName}
          className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserAvatar
            src={ownerAvatar}
            name={ownerName}
            className={avatarCls}
            fallbackClassName={avatarFallback}
          />
        </Link>
      ) : (
        <UserAvatar
          src={ownerAvatar}
          name={ownerName}
          className={avatarCls}
          fallbackClassName={avatarFallback}
        />
      )}
      {!isOwner ? (
        <FollowButton
          freelancerId={ownerId}
          iconOnly
          announceName={ownerName}
          className="absolute -bottom-1 -right-1 !h-6 !w-6 border-2 border-background !bg-brand p-0 !text-white shadow-sm hover:!bg-brand/90 aria-pressed:!bg-white aria-pressed:!text-neutral-900 [&_svg]:!h-3 [&_svg]:!w-3"
        />
      ) : null}
    </div>
  );

  const pill = (
    <div
      ref={rail ? setPillEl : undefined}
      style={rail ? { width: RAIL_W } : undefined}
      className={cn(
        "relative flex items-center gap-1 rounded-full p-1",
        rail
          ? cn("flex-col", onDark ? "text-white [&_button:hover]:bg-white/15" : "text-foreground")
          : "backdrop-blur-2xl backdrop-saturate-150",
        rail ? null : onDark
          ? "bg-white/[0.08] text-white [&_button:hover]:bg-white/15 ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.45)]"
          : "bg-background/55 text-foreground ring-1 ring-inset ring-foreground/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_24px_rgba(0,0,0,0.12)] dark:bg-card/40 dark:ring-white/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.4)]",
      )}
    >
      {isOwner && projectId ? (
        // Own work: edit instead of saving it to a collection.
        <Link to={`/portfolio/${projectId}/edit`} className={iconBtn} aria-label={t("editWork")} title={t("editWork")}>
          <Pencil className="h-5 w-5" strokeWidth={1.8} />
        </Link>
      ) : (
        <SaveToCollectionPopover projectId={projectId}>
          <button
            type="button"
            className={iconBtn}
            aria-pressed={saved}
            aria-label={saved ? t("savedToCollection") : t("saveToCollection")}
            title={t("collectionTitle")}
          >
            <Bookmark
              className={cn("h-5 w-5", saved && "fill-brand text-brand")}
              strokeWidth={saved ? 0 : 1.8}
            />
          </button>
        </SaveToCollectionPopover>
      )}
      <SharePopover
        url={shareUrl}
        title={title}
        label={t("share")}
        imageUrl={shareImageUrl}
      >
        <button
          type="button"
          className={iconBtn}
          aria-label={t("shareWork")}
          title={t("share")}
        >
          <Share2 className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </SharePopover>
      {onChat && !isOwner ? (
        <button
          type="button"
          className={iconBtn}
          onClick={onChat}
          aria-label={t("sendMessage")}
          title={t("sendMessage")}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
        </button>
      ) : null}
    </div>
  );

  if (rail) {
    return (
      <nav
        aria-label={t("actionsAria")}
        className={cn("relative flex flex-col items-center", className)}
        style={{ gap: RAIL_GAP }}
      >
        <RailGlass pill={pillEl} onDark={onDark} />
        {pill}
        <div className="relative flex items-center justify-center" style={{ width: RAIL_W, height: RAIL_W }}>
          {avatar}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label={t("actionsAria")}
      className={cn("flex items-center gap-3", className)}
    >
      {avatar}
      {ownerId ? (
        <Link
          to={`/u/${ownerId}`}
          className="min-w-0 flex-1 truncate text-sm font-medium text-foreground"
        >
          {ownerName}
        </Link>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {ownerName}
        </span>
      )}
      {pill}
    </nav>
  );
};

export default ProjectActionRail;
