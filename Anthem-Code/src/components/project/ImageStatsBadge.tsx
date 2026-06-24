import { Heart, Share2 } from "lucide-react";
import { useImageStats } from "@/hooks/useImageStats";

interface Props {
  projectId: string;
  imageUrl: string;
}

const formatCount = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
};

const ImageStatsBadge = ({ projectId, imageUrl }: Props) => {
  const { data } = useImageStats(projectId, imageUrl);
  const likes = data?.likes ?? 0;
  const shares = data?.shares ?? 0;

  return (
    <div
      className="absolute bottom-3 right-3 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/25 text-white text-xs font-medium backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] border border-white/10 shadow-lg pointer-events-none select-none opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
      aria-label="สถิติของภาพนี้"
    >
      <span className="flex items-center gap-1">
        <Heart className="w-3.5 h-3.5" />
        <span className="tabular-nums">{formatCount(likes)}</span>
      </span>
      <span className="w-px h-3 bg-white/25 mx-1" />
      <span className="flex items-center gap-1">
        <Share2 className="w-3.5 h-3.5" />
        <span className="tabular-nums">{formatCount(shares)}</span>
      </span>
    </div>
  );
};

export default ImageStatsBadge;
