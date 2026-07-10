import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import { heroFeedCoverSrcSet, heroFeedCoverUrl } from "@/lib/feedProjectCover";
import { imageCrossfadeVariants, imageRevealTransition } from "@/lib/motion";

const projectCover = (p: DBProject) =>
  p.cover_url?.trim() || p.gallery_urls?.find((url) => url?.trim()) || "";

/** Hero background carousel — top projects by engagement, click image to open. */
const TopProjectShowcase = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { data: top = [] } = useTopProjects();
  const slides = useMemo(
    () => top.filter((p) => projectCover(p)).slice(0, 6),
    [top],
  );
  const [idx, setIdx] = useState(0);
  const [carouselReady, setCarouselReady] = useState(false);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  // Defer carousel on mobile/slow devices — LCP must win first.
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

  const raw = projectCover(current);
  const cover = heroFeedCoverUrl(raw);
  const srcSet = heroFeedCoverSrcSet(raw);
  const isLcp = idx === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(`/project/${current.id}`)}
        aria-label={`ดูผลงาน: ${current.title}`}
        className="absolute inset-0 z-0 bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        {reduced || !isLcp ? (
          <AnimatePresence mode="sync">
            <motion.img
              key={current.id}
              src={cover}
              srcSet={srcSet || undefined}
              sizes="100vw"
              alt=""
              width={800}
              height={520}
              decoding="async"
              loading={isLcp ? "eager" : "lazy"}
              fetchPriority={isLcp ? "high" : "low"}
              variants={imageCrossfadeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={imageRevealTransition}
              className="absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-center"
            />
          </AnimatePresence>
        ) : (
          // First LCP frame: plain <img> avoids framer-motion main-thread work on mobile.
          <img
            key={current.id}
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
        )}
        <span className="absolute bottom-20 right-4 hidden md:flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          แตะเพื่อดูผลงาน
        </span>
      </button>
    </>
  );
};

export default TopProjectShowcase;
