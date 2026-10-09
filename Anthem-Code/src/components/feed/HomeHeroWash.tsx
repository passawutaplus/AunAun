import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ScrollBlur } from "@/components/ScrollBlur";
import { cn } from "@/lib/utils";

const NAV_H = 56;

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")";

/**
 * Paper wash and film grain for the home feed, plus a progressive blur
 * at the top and bottom edges (Scroll Blur by Aki). The wash fades as the feed arrives.
 */
const BOTTOM_BLUR_FADE_MS = 1100;

const HomeHeroWash = ({
  className,
  hideBottomBlur = false,
}: {
  className?: string;
  /** Projects feed has no bottom scroll blur. */
  hideBottomBlur?: boolean;
}) => {
  const reduced = useReducedMotion();
  const [scale, setScale] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const bottomBlurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastY = window.scrollY;
    let idleTimer = 0;
    let blurOn = false;
    const el = bottomBlurRef.current;

    const showBottomBlur = () => {
      if (!el) return;
      window.clearTimeout(idleTimer);
      if (!blurOn) {
        blurOn = true;
        const opacityNow = getComputedStyle(el).opacity;
        el.getAnimations().forEach((anim) => anim.cancel());
        el.animate(
          [
            { transform: "translateY(100%)", opacity: opacityNow },
            { transform: "translateY(0)", opacity: 1 },
          ],
          { duration: 360, easing: "ease-out", fill: "forwards" },
        );
      }
      idleTimer = window.setTimeout(hideBottomBlur, 200);
    };

    const hideBottomBlur = () => {
      if (!el || !blurOn) return;
      blurOn = false;
      const opacityNow = getComputedStyle(el).opacity;
      el.getAnimations().forEach((anim) => anim.cancel());
      el.animate(
        [
          { transform: "translateY(0)", opacity: opacityNow },
          { transform: "translateY(0)", opacity: 0 },
        ],
        { duration: BOTTOM_BLUR_FADE_MS, easing: "linear", fill: "forwards" },
      );
    };

    const update = () => {
      const hero = document.querySelector<HTMLElement>("[data-feed-hero]");
      const toolbar = document.querySelector<HTMLElement>("[data-feed-toolbar]");
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
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

      if (!reduced && delta > 2) showBottomBlur();
      else if (delta < -24) {
        window.clearTimeout(idleTimer);
        hideBottomBlur();
      }

      setScale(nextScale);
      setOpacity(nextOpacity);
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
      window.clearTimeout(idleTimer);
      bottomBlurRef.current?.getAnimations().forEach((anim) => anim.cancel());
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  return (
    <>
      <div
        className={cn("pointer-events-none fixed inset-0 z-[6]", className)}
        aria-hidden
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "180px 180px",
          opacity: 0.16,
          mixBlendMode: "multiply",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-24" aria-hidden>
        <ScrollBlur direction="top" blur={12} layers={4} />
      </div>

      {hideBottomBlur ? null : (
        <div
          ref={bottomBlurRef}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24"
          style={{ opacity: 0, transform: "translateY(100%)" }}
          aria-hidden
        >
          <ScrollBlur direction="bottom" blur={12} layers={4} />
        </div>
      )}

      {opacity > 0.01 ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[70vh] overflow-hidden"
          aria-hidden
        >
          <div
            className="absolute left-1/2 top-[-18%] h-[70vw] w-[100vw] max-h-[40rem] max-w-[68rem] origin-top"
            style={{
              opacity: opacity * 0.9,
              transform: `translateX(-50%) scale(${scale})`,
              background:
                "radial-gradient(ellipse at 50% 28%, rgba(229,228,226,0.95) 0%, rgba(188,186,180,0.28) 42%, transparent 70%)",
            }}
          />
        </div>
      ) : null}
    </>
  );
};

export default HomeHeroWash;
