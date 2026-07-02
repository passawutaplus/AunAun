import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { CommunityTextCover } from "@/components/community/CommunityTextCover";
import { cn } from "@/lib/utils";

type Props = {
  galleryUrls: string[];
  videoUrls: string[];
  aspectClass: string;
  className?: string;
  /** Text-only post cover */
  postId?: string;
  title?: string;
  body?: string;
  tags?: string[];
  textCoverTheme?: string | null;
};

export function CommunityPostGridCarousel({
  galleryUrls,
  videoUrls,
  aspectClass,
  className,
  postId,
  title = "",
  body = "",
  tags = [],
  textCoverTheme,
}: Props) {
  const slides = [
    ...galleryUrls.map((url) => ({ kind: "image" as const, url })),
    ...videoUrls.map((url) => ({ kind: "video" as const, url })),
  ];
  const [index, setIndex] = useState(0);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((i) => (i - 1 + slides.length) % slides.length);
    },
    [slides.length],
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((i) => (i + 1) % slides.length);
    },
    [slides.length],
  );

  if (!slides.length) {
    return (
      <CommunityTextCover
        seed={postId ?? `${title}:${body.slice(0, 40)}`}
        themeId={textCoverTheme}
        title={title}
        body={body}
        tags={tags}
        aspectClass={aspectClass}
        className={className}
        compact
      />
    );
  }

  const slide = slides[index] ?? slides[0];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {slide.kind === "image" ? (
        <img
          src={slide.url}
          alt=""
          className={cn("w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]", aspectClass)}
          loading="lazy"
        />
      ) : (
        <div className={cn("relative w-full bg-black/80", aspectClass)}>
          <video src={slide.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Play className="w-8 h-8 text-white/90 fill-white/90" />
          </span>
        </div>
      )}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="รูปก่อนหน้า"
            onClick={prev}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="รูปถัดไป"
            onClick={next}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1">
            {slides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-3 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
