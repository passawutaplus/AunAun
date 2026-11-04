import { Link } from "react-router-dom";
import { Bookmark, MessageCircle, Share } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import SharePopover from "@/components/SharePopover";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProjectIds } from "@/hooks/useCollections";
import { cn } from "@/lib/utils";

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
  const { data: savedProjectIds = [] } = useSavedProjectIds(user?.id);
  const saved = !!projectId && savedProjectIds.includes(projectId);
  const rail = variant === "rail";
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
          aria-label={`ดูโปรไฟล์ ${ownerName}`}
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
      className={cn(
        "flex items-center gap-1 rounded-full p-1 backdrop-blur-2xl backdrop-saturate-150",
        onDark
          ? "bg-white/[0.08] text-white [&_button:hover]:bg-white/15 ring-1 ring-inset ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(255,255,255,0.06),0_10px_30px_rgba(0,0,0,0.45)]"
          : "bg-background/55 text-foreground ring-1 ring-inset ring-foreground/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_8px_24px_rgba(0,0,0,0.12)] dark:bg-card/40 dark:ring-white/15 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_rgba(0,0,0,0.4)]",
        rail && "flex-col",
      )}
    >
      <SaveToCollectionPopover projectId={projectId}>
        <button
          type="button"
          className={iconBtn}
          aria-pressed={saved}
          aria-label={saved ? "เก็บเข้าคอลเลกชันแล้ว" : "เก็บเข้าคอลเลกชัน"}
          title="Collection"
        >
          <Bookmark
            className={cn("h-5 w-5", saved && "fill-brand text-brand")}
            strokeWidth={saved ? 0 : 1.8}
          />
        </button>
      </SaveToCollectionPopover>
      <SharePopover
        url={shareUrl}
        title={title}
        label="แชร์"
        imageUrl={shareImageUrl}
      >
        <button
          type="button"
          className={iconBtn}
          aria-label="แชร์ผลงาน"
          title="Share"
        >
          <Share className="h-5 w-5" strokeWidth={1.8} />
        </button>
      </SharePopover>
      {onChat && !isOwner ? (
        <button
          type="button"
          className={iconBtn}
          onClick={onChat}
          aria-label="ส่งข้อความ"
          title="Message"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
        </button>
      ) : null}
    </div>
  );

  if (rail) {
    return (
      <nav
        aria-label="การกระทำกับผลงาน"
        className={cn("flex flex-col items-center gap-4", className)}
      >
        {avatar}
        {pill}
      </nav>
    );
  }

  return (
    <nav
      aria-label="การกระทำกับผลงาน"
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
