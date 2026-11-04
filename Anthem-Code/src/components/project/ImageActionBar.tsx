import { useState } from "react";
import { hapticTap } from "@/lib/haptics";
import { isInspireEnabled } from "@/lib/aplus1Launch";
import { useNavigate } from "react-router-dom";
import { Sparkles, Share2, ImageIcon } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import { useAuth } from "@/hooks/useAuth";
import { useIsImageLiked, useToggleImageLike } from "@/hooks/useImageLikes";
import { useImageStats } from "@/hooks/useImageStats";
import { useAuthDialog } from "@/stores/authDialogStore";
import InspirePopover from "@/components/inspire/InspirePopover";
import SharePopover from "@/components/share/SharePopover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { userFacingError } from "@/lib/userFacingError";
import { useProjectT } from "@/lib/i18n/project";

interface Props {
  projectId: string;
  projectTitle: string;
  imageUrl: string;
  imageIndex: number;
  /** Always show (e.g. lightbox) — skip hover-only fade on desktop. */
  forceVisible?: boolean;
  /** Stack actions vertically (lightbox top-left). */
  vertical?: boolean;
  className?: string;
}

const ImageActionBar = ({
  projectId,
  projectTitle,
  imageUrl,
  imageIndex,
  forceVisible,
  vertical,
  className,
}: Props) => {
  const navigate = useNavigate();
  const { t } = useProjectT();
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openLogin);
  const { data: liked = false } = useIsImageLiked(projectId, imageUrl);
  const { data: stats } = useImageStats(projectId, imageUrl);
  const toggleLike = useToggleImageLike();
  const [inspireOpen, setInspireOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const likes = stats?.likes ?? 0;

  const requireAuth = () => {
    if (!user) {
      openAuth();
      return false;
    }
    return true;
  };

  const handleLike = () => {
    if (!requireAuth()) return;
    if (!liked) hapticTap();
    toggleLike.mutate(
      { projectId, imageUrl, liked },
      {
        onSuccess: () => toast.success(liked ? t("unliked") : t("liked")),
        onError: (e: Error) => toast.error(userFacingError(e)),
      },
    );
  };

  const btn =
    "flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-full bg-black/25 hover:bg-black/45 text-white text-xs font-medium backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] transition-all border border-white/10 shadow-sm";

  const labelClass = vertical ? "inline" : "hidden sm:inline";

  return (
    <div
      className={cn(
        "z-10 flex w-max max-w-none gap-2 transition-opacity duration-200 [&>*]:pointer-events-auto [&>*]:shrink-0",
        vertical ? "flex-col items-start" : "flex-nowrap items-center",
        forceVisible
          ? "relative opacity-100 pointer-events-auto"
          : // Mobile: no overlay chrome — open lightbox to act. Desktop: hover bar.
            "absolute top-3 left-3 hidden md:flex opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
        className,
      )}
      style={{ pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <PlusOneControl
        active={liked}
        count={likes}
        showCount={likes > 0}
        onClick={handleLike}
        ariaLabel={liked ? t("unlike") : t("like")}
        className={cn(btn, "text-white hover:text-white hover:bg-black/45 [&_span]:text-white/90", liked && "[&_svg]:fill-brand [&_svg]:text-brand")}
      />

      {isInspireEnabled() ? (
      <InspirePopover
        open={inspireOpen}
        onOpenChange={(o) => {
          if (o && !requireAuth()) return;
          setInspireOpen(o);
        }}
        projectId={projectId}
        imageUrl={imageUrl}
      >
        <button type="button" className={btn} title={t("inspireTitle")}>
          <Sparkles className="w-3.5 h-3.5" />
          <span className={labelClass}>{t("inspire")}</span>
        </button>
      </InspirePopover>
      ) : null}

      {!vertical ? (
        <span aria-hidden="true" className="w-px h-6 bg-white/30 self-center mx-0.5 rounded-full" />
      ) : null}

      <button
        type="button"
        onClick={() => navigate(`/similar/${projectId}?img=${imageIndex}`)}
        className={btn}
        title={t("similar")}
      >
        <ImageIcon className="w-3.5 h-3.5" />
        <span className={labelClass}>{t("similarShort")}</span>
      </button>

      <SharePopover
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={projectTitle}
        url={`${window.location.origin}/showcase/${projectId}`}
        imageUrl={imageUrl}
        projectId={projectId}
      >
        <button type="button" className={btn} title={t("share")} aria-label={t("share")}>
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </SharePopover>
    </div>
  );
};

export default ImageActionBar;
