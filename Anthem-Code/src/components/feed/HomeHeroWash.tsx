import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_H = 56;

/**
 * Soft brand wash behind the home hero: expands while scrolling the hero,
 * then fades out as the project toolbar / cards reach the sticky header.
 */
const HomeHeroWash = ({ className }: { className?: string }) => {
  const reduced = useReducedMotion();
  // Written straight to the DOM (no React re-render per scroll frame).
  const rootRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const hero = document.querySelector<HTMLElement>("[data-feed-hero]");
      const toolbar = document.querySelector<HTMLElement>("[data-feed-toolbar]");
      const y = window.scrollY;
      const heroH = hero?.offsetHeight ?? window.innerHeight;
      const nextScale = reduced ? 1 : 1 + Math.min(1, y / Math.max(heroH * 0.62, 1)) * 0.85;

      let nextOpacity = 1;
      if (toolbar) {
        const top = toolbar.getBoundingClientRect().top;
        const desktop = window.matchMedia("(min-width: 1024px)").matches;
        const end = (desktop ? NAV_H : 0) + 28;
        const start = Math.max(end + 80, window.innerHeight * 0.42);
        nextOpacity = Math.max(0, Math.min(1, (top - end) / (start - end)));
      }

      const root = rootRef.current;
      const a = aRef.current;
      const b = bRef.current;
      if (!root || !a || !b) return;
      root.style.display = nextOpacity <= 0.01 ? "none" : "";
      a.style.opacity = String(nextOpacity);
      a.style.transform = `translateX(-46%) scale(${nextScale})`;
      b.style.opacity = String(nextOpacity * 0.85);
      b.style.transform = `translateX(-62%) scale(${1 + (nextScale - 1) * 0.7})`;
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-0 h-[92vh] overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div
        ref={aRef}
        className="absolute left-1/2 top-[-22%] h-[78vw] w-[110vw] max-h-[46rem] max-w-[72rem] origin-top"
        style={{
          opacity: 1,
          transform: "translateX(-46%) scale(1)",
          willChange: "transform, opacity",
          background:
            "radial-gradient(ellipse at 58% 32%, hsl(18 100% 72% / 0.42) 0%, hsl(14 100% 55% / 0.16) 36%, transparent 68%)",
        }}
      />
      <div
        ref={bRef}
        className="absolute left-1/2 top-[-18%] h-[62vw] w-[86vw] max-h-[38rem] max-w-[54rem] origin-top"
        style={{
          opacity: 0.85,
          transform: "translateX(-62%) scale(1)",
          willChange: "transform, opacity",
          background:
            "radial-gradient(ellipse at 40% 28%, hsl(36 100% 78% / 0.28) 0%, hsl(22 100% 70% / 0.1) 42%, transparent 70%)",
        }}
      />
    </div>
  );
};

export default HomeHeroWash;
