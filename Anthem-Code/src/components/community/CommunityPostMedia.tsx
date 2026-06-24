import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { communityMediaFromPost } from "@/lib/communityMedia";
import { isVideoUrl } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

type Props = {
  galleryUrls?: string[];
  videoUrls?: string[];
  title: string;
  className?: string;
  /** Tailwind aspect / height classes. Use variant="detail" for full-width hero. */
  aspectClass?: string;
  variant?: "feed" | "detail";
};

const CommunityPostMedia = ({
  galleryUrls = [],
  videoUrls = [],
  title,
  className,
  aspectClass = "aspect-[4/5] sm:aspect-[16/10]",
  variant = "feed",
}: Props) => {
  const items = communityMediaFromPost(galleryUrls, videoUrls);
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  if (!items.length) return null;

  const current = items[Math.min(index, items.length - 1)];
  const hasMany = items.length > 1;

  const go = (dir: -1 | 1) => {
    setIndex((i) => (i + dir + items.length) % items.length);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40",
        variant === "detail" ? "w-full" : aspectClass,
        className,
      )}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current == null || !hasMany) return;
        const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
        if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
        touchStart.current = null;
      }}
    >
      {current.kind === "video" || isVideoUrl(current.url) ? (
        <video
          src={current.url}
          className={cn(
            "w-full object-cover",
            variant === "detail" ? "max-h-[min(520px,70vh)]" : "h-full w-full",
          )}
          controls
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={current.url}
          alt={title}
          className={cn(
            "w-full object-cover",
            variant === "detail" ? "max-h-[min(520px,70vh)]" : "h-full w-full",
          )}
          loading="lazy"
        />
      )}

      {hasMany && (
        <>
          <button
            type="button"
            aria-label="ภาพก่อนหน้า"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white hidden sm:inline-flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="ภาพถัดไป"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white hidden sm:inline-flex"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
            {items.map((item, i) => (
              <span
                key={item.id}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/50")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CommunityPostMedia;
