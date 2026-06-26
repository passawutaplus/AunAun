import { useRef, useState } from "react";
import { Play } from "lucide-react";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

type Props = {
  items: PortfolioMediaItem[];
  className?: string;
};

/** Horizontal snap carousel for post preview (Lemon8 / IG style). */
export function CommunityMediaCarousel({ items, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateIndexFromScroll = () => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setActiveIndex(Math.min(idx, items.length - 1));
  };

  if (items.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        onScroll={updateIndexFromScroll}
        className={cn(
          "flex overflow-x-auto snap-x snap-mandatory scrollbar-none",
          "[-webkit-overflow-scrolling:touch]",
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="relative shrink-0 w-full snap-center aspect-square max-h-[min(420px,55vh)] bg-muted"
          >
            {item.kind === "video" ? (
              <div className="absolute inset-0 grid place-items-center bg-muted">
                <Play className="w-10 h-10 text-muted-foreground" />
              </div>
            ) : (
              <img src={item.url} alt="" className="w-full h-full object-cover" draggable={false} />
            )}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {items.map((item, i) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === activeIndex ? "w-4 bg-white shadow-sm" : "w-1.5 bg-white/55",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
