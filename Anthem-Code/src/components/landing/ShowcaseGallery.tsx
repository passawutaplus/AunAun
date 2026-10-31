import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import ImageLightbox from "@/components/project/ImageLightbox";
import type { LandingWork } from "./showcase";
import type { LandingText } from "./useLandingCopy";

type TileProps = { work: LandingWork; onOpen: () => void };

function ImageTile({ work, onOpen }: TileProps) {
  return (
    <button type="button" className="g reveal" aria-label={work.title} onClick={onOpen}>
      <img src={work.src} alt="" loading="lazy" style={{ aspectRatio: work.ratio }} />
      <span className="ov">{work.title}</span>
    </button>
  );
}

/** Plays muted while on screen. With reduced motion it stays on its poster. */
function VideoTile({ work, onOpen }: TileProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new IntersectionObserver(
      (entries) => {
        if (entries[entries.length - 1].isIntersecting) video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.15 },
    );
    seen.observe(video);
    return () => seen.disconnect();
  }, []);

  return (
    <button type="button" className="g reveal" aria-label={work.title} onClick={onOpen}>
      <video ref={ref} src={work.video} poster={work.src} muted loop playsInline preload="none" style={{ aspectRatio: work.ratio }} />
      <span className="play" aria-hidden="true">
        <Play size={13} fill="currentColor" strokeWidth={0} />
      </span>
      <span className="ov">{work.title}</span>
    </button>
  );
}

function VideoViewer({ clips, index, onIndexChange, onClose, t }: { clips: LandingWork[]; index: number; onIndexChange: (index: number) => void; onClose: () => void; t: LandingText }) {
  const clip = clips[index];
  const go = (step: number) => onIndexChange((index + step + clips.length) % clips.length);
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goRef.current(-1);
      if (e.key === "ArrowRight") goRef.current(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const arrow = "absolute z-10 flex h-10 w-10 items-center justify-center text-white/90 transition hover:text-white sm:h-12 sm:w-12";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={clip.title} onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <button type="button" aria-label={t("viewer.close")} onClick={onClose} className="absolute right-4 top-4 z-10 p-2 text-white/90 transition hover:text-white">
        <X className="h-5 w-5" strokeWidth={2.2} />
      </button>
      {clips.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={t("viewer.prev")}
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className={`${arrow} left-2 sm:left-4`}
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-label={t("viewer.next")}
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className={`${arrow} right-2 sm:right-4`}
          >
            <ChevronRight className="h-7 w-7" strokeWidth={2.2} />
          </button>
        </>
      ) : null}
      <video
        key={clip.id}
        src={clip.video}
        poster={clip.src}
        autoPlay
        loop
        muted
        controls
        playsInline
        onClick={(e) => e.stopPropagation()}
        className="max-h-[86vh] max-w-[min(1100px,calc(100vw-7rem))] rounded-lg"
      />
    </div>,
    document.body,
  );
}

/** Images open the site's real viewer. Examples get its colour and view tools; member works also get their actions. */
export function ShowcaseGallery({ works, t }: { works: LandingWork[]; t: LandingText }) {
  const stills = works.filter((w) => !w.video);
  const clips = works.filter((w) => w.video);
  const [stillAt, setStillAt] = useState(0);
  const [stillOpen, setStillOpen] = useState(false);
  const [clipAt, setClipAt] = useState<number | null>(null);
  const still = stills[stillAt];

  return (
    <>
      <div className="gallery">
        {works.map((w) =>
          w.video ? (
            <VideoTile key={w.id} work={w} onOpen={() => setClipAt(clips.indexOf(w))} />
          ) : (
            <ImageTile
              key={w.id}
              work={w}
              onOpen={() => {
                setStillAt(stills.indexOf(w));
                setStillOpen(true);
              }}
            />
          ),
        )}
      </div>
      <ImageLightbox
        images={stills.map((w) => w.full ?? w.src)}
        index={stillAt}
        onIndexChange={setStillAt}
        alt={still?.title}
        open={stillOpen}
        onClose={() => setStillOpen(false)}
        projectId={still?.href ? still.id : undefined}
        projectTitle={still?.href ? still.title : undefined}
        projectLink={still?.href ? { href: still.href, label: t("viewer.open") } : undefined}
      />
      {clipAt !== null ? <VideoViewer clips={clips} index={clipAt} onIndexChange={setClipAt} onClose={() => setClipAt(null)} t={t} /> : null}
    </>
  );
}
