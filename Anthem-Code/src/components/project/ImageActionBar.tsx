import { useState } from "react";
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

interface Props {
  projectId: string;
  projectTitle: string;
  imageUrl: string;
  imageIndex: number;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

const ImageActionBar = ({ projectId, projectTitle, imageUrl, imageIndex }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openLogin);
  const { data: liked = false } = useIsImageLiked(projectId, imageUrl);
  const { data: stats } = useImageStats(projectId, imageUrl);
  const toggleLike = useToggleImageLike();
  const [inspireOpen, setInspireOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const likes = stats?.likes ?? 0;
  const shares = stats?.shares ?? 0;

  const requireAuth = () => {
    if (!user) {
      openAuth();
      return false;
    }
    return true;
  };

  const handleLike = () => {
    if (!requireAuth()) return;
    toggleLike.mutate(
      { projectId, imageUrl, liked },
      {
        onSuccess: () => toast.success(liked ? "ยกเลิกแล้ว" : "ให้ +1 แล้ว"),
        onError: (e: Error) => toast.error(e.message),
      }
    );
  };

  const btn =
    "flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/25 hover:bg-black/45 text-white text-xs font-medium backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] transition-all border border-white/10 shadow-lg";

  return (
    <div
      className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 pointer-events-none md:group-hover:pointer-events-auto [&>*]:pointer-events-auto"
      style={{ pointerEvents: "auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      <PlusOneControl
        active={liked}
        count={likes}
        onClick={handleLike}
        ariaLabel={liked ? "ยกเลิก +1" : "ให้ +1"}
        className={`${btn} text-white hover:text-white ${liked ? "!bg-primary/90 hover:!bg-primary [&_span]:text-white" : "[&_span]:text-white/90"}`}
      />

      <InspirePopover
        open={inspireOpen}
        onOpenChange={(o) => {
          if (o && !requireAuth()) return;
          setInspireOpen(o);
        }}
        projectId={projectId}
        imageUrl={imageUrl}
      >
        <button type="button" className={btn} title="เก็บแรงบันดาลใจ">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Inspire</span>
        </button>
      </InspirePopover>

      <span aria-hidden="true" className="w-px h-6 bg-white/30 self-center mx-0.5 rounded-full" />

      <button
        type="button"
        onClick={() => navigate(`/similar/${projectId}?img=${imageIndex}`)}
        className={btn}
        title="ดูภาพคล้าย"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">ภาพคล้าย</span>
      </button>

      {/* Share with inline count */}
      <SharePopover
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={projectTitle}
        url={`${window.location.origin}/project/${projectId}`}
        imageUrl={imageUrl}
        projectId={projectId}
      >
        <button type="button" className={btn} title="แชร์">
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">แชร์</span>
          <span className="tabular-nums opacity-90">{formatCount(shares)}</span>
        </button>
      </SharePopover>
    </div>
  );
};

export default ImageActionBar;
