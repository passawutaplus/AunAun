import * as React from "react";
import { motion, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LANDING_MOCKUPS } from "@/data/landingAssets";
import { BrowserFrame, MockupImage } from "@/components/landing/BrowserFrame";

const BENTO = [
  { ...LANDING_MOCKUPS.heroSlides[0], frameLabel: "app.solofreelancer.com/dashboard" },
  { ...LANDING_MOCKUPS.heroSlides[1], frameLabel: "app.solofreelancer.com/quotations" },
  { ...LANDING_MOCKUPS.heroSlides[2], frameLabel: "app.solofreelancer.com/tax" },
];

function BentoTile({
  src,
  alt,
  frameLabel,
  className,
  priority,
}: {
  src: string;
  alt: string;
  frameLabel: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <BrowserFrame label={frameLabel} className={cn("h-full", className)}>
      <div className="relative aspect-[800/520] sm:aspect-auto sm:h-full min-h-[120px] overflow-hidden">
        <MockupImage
          src={src}
          alt={alt}
          priority={priority}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </div>
    </BrowserFrame>
  );
}

export function LandingHeroMockup({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const rotateX = useSpring(0, { stiffness: 180, damping: 22 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 22 });

  const onMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (reduced || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rotateY.set(px * 10);
      rotateX.set(-py * 8);
    },
    [reduced, rotateX, rotateY],
  );

  const onLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <div
      ref={ref}
      className={cn("w-full max-w-lg mx-auto lg:max-w-none perspective-[1200px]", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-[1.15fr_0.85fr] gap-3 sm:gap-3.5 origin-center"
        style={
          reduced
            ? undefined
            : {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
        }
      >
        <div className="sm:row-span-2 min-h-[200px] sm:min-h-[340px]">
          <BentoTile {...BENTO[0]} priority className="shadow-elevated h-full" />
        </div>
        <div className="min-h-[140px] sm:min-h-0">
          <BentoTile {...BENTO[1]} className="shadow-soft h-full" />
        </div>
        <div className="min-h-[140px] sm:min-h-0">
          <BentoTile {...BENTO[2]} className="shadow-soft h-full" />
        </div>
      </motion.div>
    </div>
  );
}
