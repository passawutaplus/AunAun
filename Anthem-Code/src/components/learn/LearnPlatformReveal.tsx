import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { HeroPosterTitle } from "@/components/feed/StudioHomeHero";
import type { FeedMode } from "@/components/feed/FeedModeToggle";
import { coerceLaunchFeedMode } from "@/lib/aplus1Launch";

const PLATFORM_VIDEO = "/learn/learn-platform.mp4";
const PLATFORM_POSTER = "/learn/learn-platform.jpg";

function storedFeedMode(): FeedMode {
  if (typeof window === "undefined") return "projects";
  const stored = localStorage.getItem("feed-mode");
  if (
    stored === "projects" ||
    stored === "designers" ||
    stored === "packages" ||
    stored === "objects" ||
    stored === "studios" ||
    stored === "community"
  ) {
    return coerceLaunchFeedMode(stored);
  }
  return "projects";
}

/** One platform film, then the home poster. The film plays once it scrolls into view. */
export function LearnPlatformReveal({ images }: { images: string[] }) {
  const reduced = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const [posterIn, setPosterIn] = useState(Boolean(reduced));
  const [mode, setMode] = useState<FeedMode>(storedFeedMode);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45], reduced ? [1, 1] : [0.94, 1]);

  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame || !video || reduced) return;
    let visible = false;
    const tryPlay = () => {
      if (!visible) return;
      void video.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) tryPlay();
        else video.pause();
      },
      { threshold: 0.4 },
    );
    video.addEventListener("canplay", tryPlay);
    observer.observe(frame);
    return () => {
      video.removeEventListener("canplay", tryPlay);
      observer.disconnect();
      video.pause();
    };
  }, [reduced]);

  useEffect(() => {
    const node = posterRef.current;
    if (!node || reduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setPosterIn(true);
      },
      { threshold: 0.45 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <section className="relative z-0 -mt-[22vh] pb-8 sm:pb-16" aria-label="Platform">
      <motion.div
        ref={frameRef}
        style={{ scale }}
        className="mx-4 origin-bottom overflow-hidden rounded-[1.75rem] bg-[#e4e1db] sm:mx-6 lg:mx-8"
      >
        <video
          ref={videoRef}
          src={PLATFORM_VIDEO}
          poster={PLATFORM_POSTER}
          muted
          playsInline
          loop
          preload="metadata"
          aria-label="Designers in a Bangkok studio pointing at work pinned on the wall"
          className="block h-auto w-full"
        />
      </motion.div>
      <div ref={posterRef} className="flex justify-center px-4 pb-16 pt-16 sm:pb-24 sm:pt-24">
        <HeroPosterTitle
          images={images}
          mode={mode}
          onModeChange={(next) => {
            const stored = coerceLaunchFeedMode(next);
            setMode(stored);
            localStorage.setItem("feed-mode", stored);
          }}
          active={posterIn}
          arrive
        />
      </div>
    </section>
  );
}
