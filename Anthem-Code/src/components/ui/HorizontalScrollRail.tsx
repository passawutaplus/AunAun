import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** Classes for the scrollable inner row (flex chips, etc.). */
  className?: string;
  /** Outer wrapper (relative / flex-1). */
  wrapperClassName?: string;
};

/**
 * Horizontal chip/row scroller: swipe on mobile; subtle left/right arrows on desktop when overflowed.
 */
export function HorizontalScrollRail({ children, className, wrapperClassName }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update, children]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.round(el.clientWidth * 0.55));
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-[5] hidden w-7 bg-gradient-to-r from-background to-transparent transition-opacity lg:block",
          canLeft ? "opacity-100" : "opacity-0",
        )}
      />
      <button
        type="button"
        aria-label="เลื่อนหมวดไปทางซ้าย"
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
        className={cn(
          "absolute left-0 top-1/2 z-10 hidden h-8 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground/55 transition-opacity hover:text-muted-foreground lg:flex",
          "disabled:pointer-events-none disabled:opacity-0",
          canLeft ? "opacity-100" : "opacity-0",
        )}
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      <div ref={scrollerRef} className={cn("overflow-x-auto scrollbar-hide", className)}>
        {children}
      </div>

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-[5] hidden w-7 bg-gradient-to-l from-background to-transparent transition-opacity lg:block",
          canRight ? "opacity-100" : "opacity-0",
        )}
      />
      <button
        type="button"
        aria-label="เลื่อนหมวดไปทางขวา"
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
        className={cn(
          "absolute right-0 top-1/2 z-10 hidden h-8 w-6 -translate-y-1/2 items-center justify-center text-muted-foreground/55 transition-opacity hover:text-muted-foreground lg:flex",
          "disabled:pointer-events-none disabled:opacity-0",
          canRight ? "opacity-100" : "opacity-0",
        )}
      >
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
