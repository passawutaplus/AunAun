import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HeroSpotlightCorner from "@/components/feed/HeroSpotlightCorner";
import type { HeroSpotlightSlide } from "@/lib/heroSpotlight";
import { heroFeedCoverSrcSet, heroFeedCoverUrl } from "@/lib/feedProjectCover";
import { imageCrossfadeVariants, imageRevealTransition } from "@/lib/motion";

type Props = {
  slides: HeroSpotlightSlide[];
  variant: "designer" | "studio";
};

const HeroSpotlightShowcase = ({ slides, variant }: Props) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [carouselReady, setCarouselReady] = useState(false);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  useEffect(() => {
    if (reduced || slides.length < 2) return;
    const ready = window.setTimeout(() => setCarouselReady(true), 4000);
    return () => window.clearTimeout(ready);
  }, [reduced, slides.length]);

  useEffect(() => {
    if (!carouselReady || slides.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [carouselReady, slides.length]);

  const current = slides[idx];

  if (!current) {
    return (
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-muted/30 to-muted/50 animate-pulse"
        aria-hidden
      />
    );
  }

  const cover = heroFeedCoverUrl(current.backgroundCover);
  const srcSet = heroFeedCoverSrcSet(current.backgroundCover);
  const isLcp = idx === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(current.projectHref)}
        aria-label={`ดูผลงาน: ${current.projectTitle}`}
        className="absolute inset-0 z-0 bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        {isLcp && !reduced ? (
          <img
            src={cover}
            srcSet={srcSet || undefined}
            sizes="100vw"
            alt=""
            width={800}
            height={520}
            decoding="sync"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-center"
          />
        ) : (
          <AnimatePresence mode="sync">
            <motion.img
              key={current.id + cover}
              src={cover}
              srcSet={srcSet || undefined}
              sizes="100vw"
              alt=""
              width={800}
              height={520}
              decoding="async"
              loading="lazy"
              fetchPriority="low"
              variants={imageCrossfadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={imageRevealTransition}
              className="absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-center"
            />
          </AnimatePresence>
        )}
      </button>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -4 }}
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
