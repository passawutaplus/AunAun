import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";

/** Matches ScrollBlurEssential: locked blur, six layers, spring in / spring out. */
const BLUR = 12;
const LAYERS = 6;
const HOLD_MS = 200;
const BAND_PX = 160;
const FADE_IN = { type: "spring" as const, stiffness: 300, damping: 30 };
const FADE_OUT = { duration: 1, ease: "linear" as const };

/**
 * Bottom scroll blur for the learn page.
 * Strength springs in while scrolling and springs back out once scrolling stops.
 */
export function LearnScrollBlur() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const sb = useMotionValue(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const write = (value: number) => node.style.setProperty("--sb", String(Math.max(0, value)));
    write(sb.get());
    return sb.on("change", write);
  }, [sb]);

  useEffect(() => {
    if (reduced) return;
    let idle = 0;
    let active = false;
    let controls: { stop: () => void } | null = null;

    const hide = () => {
      active = false;
      controls?.stop();
      controls = animate(sb, 0, {
        ...FADE_OUT,
        onComplete: () => {
          if (!active) ref.current?.style.setProperty("visibility", "hidden");
        },
      });
    };

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (Math.abs(delta) < 1) return;

      ref.current?.style.setProperty("visibility", "visible");
      if (!active) {
        active = true;
        controls?.stop();
        controls = animate(sb, 1, FADE_IN);
      }
      window.clearTimeout(idle);
      idle = window.setTimeout(hide, HOLD_MS);
    };

    const opts = { passive: true, capture: true } as const;
    window.addEventListener("scroll", onScroll, opts);
    return () => {
      window.removeEventListener("scroll", onScroll, opts);
      window.clearTimeout(idle);
      controls?.stop();
    };
  }, [reduced, sb]);

  if (reduced || typeof document === "undefined") return null;

  const step = 100 / LAYERS;

  return createPortal(
    <div
      ref={ref}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 overflow-hidden"
      style={{ height: BAND_PX, ["--sb" as string]: "0" }}
      aria-hidden
    >
      {Array.from({ length: LAYERS }, (_, index) => {
        const radius = (BLUR * (index + 1)) / LAYERS;
        const cover = 100 - index * step;
        const fadeStart = Math.max(0, cover - step);
        const mask = `linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,1) ${fadeStart}%, rgba(255,255,255,0) ${cover}%)`;
        const filter = `blur(calc(var(--sb, 0) * ${radius}px))`;
        return (
          <div
            key={index}
            className="absolute inset-0"
            style={{
              backdropFilter: filter,
              WebkitBackdropFilter: filter,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>,
    document.body,
  );
}
