import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import { imageCrossfadeVariants, imageRevealTransition } from "@/lib/motion";

const projectCover = (p: DBProject) =>
  p.cover_url?.trim() || p.gallery_urls?.find((url) => url?.trim()) || "";

/** Hero background carousel — top projects by engagement, click image to open. */
const TopProjectShowcase = () => {
  const navigate = useNavigate();
  const { data: top = [] } = useTopProjects();
  const slides = useMemo(
    () => top.filter((p) => projectCover(p)).slice(0, 6),
    [top],
  );
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

  const cover = projectCover(current);

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(`/project/${current.id}`)}
        aria-label={`ดูผลงาน: ${current.title}`}
        className="absolute inset-0 z-0 bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="sync">
          <motion.img
            key={current.id}
            src={cover}
            alt=""
            variants={imageCrossfadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={imageRevealTransition}
            className="absolute inset-0 h-full w-full object-cover object-[center_30%] md:object-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </AnimatePresence>
        <span className="absolute bottom-20 right-4 hidden md:flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/90 backdrop-blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          แตะเพื่อดูผลงาน
        </span>
      </button>
    </>
  );
};

export default TopProjectShowcase;
