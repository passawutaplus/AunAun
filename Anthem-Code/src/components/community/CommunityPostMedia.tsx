import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
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

function MediaSlide({
  url,
  kind,
  title,
}: {
  url: string;
  kind: "image" | "video";
  title: string;
}) {
  if (kind === "video" || isVideoUrl(url)) {
    return (
      <video
        src={url}
        className="absolute inset-0 h-full w-full object-cover"
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  return (
    <img
      src={url}
      alt={title}
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
      draggable={false}
    />
  );
}

const CommunityPostMedia = ({
  galleryUrls = [],
  videoUrls = [],
  title,
  className,
  aspectClass = "aspect-[4/5] sm:aspect-[16/10]",
  variant = "feed",
}: Props) => {
  const items = communityMediaFromPost(galleryUrls, videoUrls);
  const hasMany = items.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: hasMany,
      align: "start",
      duration: 32,
      dragFree: false,
      containScroll: "trimSnaps",
    },
    hasMany ? [] : undefined,
  );

  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("reInit", onSelect);
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("reInit", onSelect);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!items.length) return null;

  const frameClass = cn(
    "relative overflow-hidden bg-muted/40",
    variant === "detail" ? "w-full aspect-square" : aspectClass,
    className,
  );

  if (!hasMany) {
    const item = items[0]!;
    return (
      <div className={frameClass}>
        <MediaSlide url={item.url} kind={item.kind} title={title} />
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <div className="h-full w-full overflow-hidden" ref={emblaRef}>
        <div className="flex h-full touch-pan-y">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative min-w-0 shrink-0 grow-0 basis-full h-full"
            >
              <MediaSlide url={item.url} kind={item.kind} title={title} />
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="ภาพก่อนหน้า"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          emblaApi?.scrollPrev();
        }}
        className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white transition-opacity hover:bg-black/60 sm:inline-flex"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="ภาพถัดไป"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          emblaApi?.scrollNext();
        }}
        className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/45 p-1.5 text-white transition-opacity hover:bg-black/60 sm:inline-flex"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="absolute bottom-2 inset-x-0 z-10 flex justify-center gap-1.5">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={`ภาพที่ ${i + 1}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              emblaApi?.scrollTo(i);
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index ? "w-4 bg-white shadow-sm" : "w-1.5 bg-white/55 hover:bg-white/75",
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default CommunityPostMedia;
