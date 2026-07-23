import { useEffect, useRef, useState, type RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Track mouse on this element (e.g. full hero) so spotlight works over slides too */
  trackRef?: RefObject<HTMLElement | null>;
};

function gridStyle(opacity: number, orange: boolean) {
  const line = orange
    ? `hsl(14 100% 50% / ${opacity})`
    : `hsl(0 0% 100% / ${opacity})`;
  return {
    backgroundImage: `
      linear-gradient(to right, ${line} 1px, transparent 1px),
      linear-gradient(to bottom, ${line} 1px, transparent 1px)
    `,
    backgroundSize: "48px 48px",
  } as const;
}

/**
 * Infinite GridX–style: one soft grid, blurred by default, clearer in mouse circle.
 * Light mode → orange lines · Dark mode → soft white lines.
 */
const HeroGridSpotlight = ({ className, trackRef }: Props) => {
  const reduced = useReducedMotion();
  const selfRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 45, y: 40 });
  const [hovering, setHovering] = useState(false);
  const [lightMode, setLightMode] = useState(() =>
    typeof document !== "undefined" ? !document.documentElement.classList.contains("dark") : false,
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setLightMode(!root.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) return;
    const el = trackRef?.current ?? selfRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      setHovering(true);
      setPos({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    const onLeave = () => setHovering(false);

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, trackRef]);

  const coreR = hovering ? "8.5rem" : "0rem";
  const softR = hovering ? "13rem" : "0rem";
  const sharpMask = `radial-gradient(circle ${coreR} at ${pos.x}% ${pos.y}%, #000 0%, #000 62%, transparent 100%)`;
  const veilHole = `radial-gradient(circle ${softR} at ${pos.x}% ${pos.y}%, transparent 0%, transparent 48%, #000 82%)`;

  return (
    <div
      ref={selfRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div className="absolute -left-[18%] bottom-[-12%] h-[58%] w-[72%] rounded-full bg-[radial-gradient(circle,hsl(210_85%_58%_/_0.14)_0%,transparent_70%)] blur-3xl dark:opacity-100 opacity-70" />
      <div className="absolute -right-[12%] top-[-10%] h-[52%] w-[68%] rounded-full bg-[radial-gradient(circle,hsl(14_100%_55%_/_0.18)_0%,transparent_70%)] blur-3xl" />

      <div
        className={cn("absolute inset-0 opacity-80 dark:opacity-70", !reduced && "animate-hero-grid-bg")}
        style={{
          ...gridStyle(lightMode ? 0.28 : 0.22, lightMode),
          filter: "blur(5px)",
          WebkitFilter: "blur(5px)",
        }}
      />

      {!reduced && hovering ? (
        <div
          className="absolute inset-0 animate-hero-grid-bg"
          style={{
            ...gridStyle(lightMode ? 0.48 : 0.38, lightMode),
            WebkitMaskImage: sharpMask,
            maskImage: sharpMask,
          }}
        />
      ) : null}

      <div
        className="absolute inset-0 duration-100 ease-out"
        style={{
          background: "hsl(var(--background) / 0.22)",
          backdropFilter: reduced ? undefined : "blur(8px) saturate(130%)",
          WebkitBackdropFilter: reduced ? undefined : "blur(8px) saturate(130%)",
          WebkitMaskImage: reduced || !hovering ? undefined : veilHole,
          maskImage: reduced || !hovering ? undefined : veilHole,
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-background from-[18%] via-background/70 via-[55%] to-transparent"
        style={
          !reduced && hovering
            ? { WebkitMaskImage: veilHole, maskImage: veilHole }
            : undefined
        }
      />
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background/50 to-transparent" />
    </div>
  );
};

export default HeroGridSpotlight;
