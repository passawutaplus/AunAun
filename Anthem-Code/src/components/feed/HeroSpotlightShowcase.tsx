import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import HeroSpotlightCorner from "@/components/feed/HeroSpotlightCorner";
import type { HeroSpotlightSlide } from "@/lib/heroSpotlight";
import { imageCrossfadeVariants, imageRevealTransition } from "@/lib/motion";

type Props = {
  slides: HeroSpotlightSlide[];
  variant: "designer" | "studio";
};

const HeroSpotlightShowcase = ({ slides, variant }: Props) => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[idx];

  if (!current) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-muted/30 to-muted/50 animate-pulse"
        aria-hidden
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(current.projectHref)}
        aria-label={`ดูผลงาน: ${current.projectTitle}`}
        className="absolute inset-0 z-0 bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="sync">
          <motion.img
            key={current.id + current.backgroundCover}
            src={current.backgroundCover}
            alt=""
            variants={imageCrossfadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={imageRevealTransition}
            className="absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </AnimatePresence>
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          <HeroSpotlightCorner
            name={current.name}
            avatarUrl={current.avatarUrl}
            profileHref={current.profileHref}
            variant={variant}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default HeroSpotlightShowcase;
