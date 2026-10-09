import type { ReactNode } from "react";
import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStudioHeroSlides } from "@/hooks/useHeroSlides";
import { BRAND_CONCEPT } from "@/lib/brandConfig";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { carouselSlideTransition, carouselSlideVariants, smoothEase } from "@/lib/motion";
import { FadeUp } from "@/components/motion/FadeUp";
import type { FeedMode } from "@/components/feed/FeedModeToggle";
import HeroSpotlightShowcase from "./HeroSpotlightShowcase";
import CommunityHeroShowcase from "./CommunityHeroShowcase";
import StudioHomeHero from "./StudioHomeHero";
import { cn } from "@/lib/utils";

/** Match FeedPage / DesktopTopNav horizontal gutters so hero copy lines up with the logo. */
export const FEED_PAGE_GUTTER_X =
  "px-3 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]";

const HERO_COPY: Record<FeedMode, { badge: string; title: ReactNode }> = {
  projects: {
    badge: BRAND_CONCEPT,
    title: (
      <>
        {isAplus1LaunchMinimal() ? "ดูผลงานจริง" : "ค้นพบผลงาน"}
        <br />
        <span className="bg-gradient-brand bg-clip-text text-transparent">
          {isAplus1LaunchMinimal() ? "ก่อนคุยโอกาส" : "ที่ถูกใจคุณ"}
        </span>
      </>
    ),
  },
  designers: {
    badge: isAplus1LaunchMinimal() ? "ค้นหาจากสไตล์" : "ทีมครีเอทีฟอิสระ",
    title: (
      <>
        ค้นพบดีไซเนอร์
        <br />
        <span className="bg-gradient-brand bg-clip-text text-transparent">
          {isAplus1LaunchMinimal() ? "ไม่ใช่จากแพ็กเกจ" : "ที่ใช่สำหรับคุณ"}
        </span>
      </>
    ),
  },
  packages: {
    badge: "ขอบเขตงานจากผลงานจริง",
    title: (
      <>
        ค้นพบแพ็กเกจ
        <br />
        <span className="bg-gradient-brand bg-clip-text text-transparent">จากครีเอเตอร์ที่มีงานโชว์</span>
      </>
    ),
  },
  objects: {
    badge: "ของที่ถือได้ และไฟล์ที่เอาไปใช้ได้",
    title: (
      <>
        ค้นพบ Objects
        <br />
        <span className="bg-gradient-brand bg-clip-text text-transparent">จากคนที่ทำงานจริง</span>
      </>
    ),
  },
  studios: {
    badge: "ทีมดีไซน์เต็มรูปแบบ",
    title: (
      <>
        ค้นพบสตูดิโอ
        <br />
        <span className="bg-gradient-brand bg-clip-text text-transparent">ที่พร้อมลงมือจริงจัง</span>
      </>
    ),
  },
  community: {
    badge: "พื้นที่พูดคุย",
    title: (
      <>
        ค้นพบพื้นที่
        <br />
        <span className="bg-gradient-brand bg-clip-text text-transparent">คอมมูนิตี้ที่จริงใจ</span>
      </>
    ),
  },
};

type Props = {
  mode?: FeedMode;
  onModeChange?: (mode: FeedMode, source?: "hero") => void;
  className?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
};

/** Projects, designers, and packages: editorial paper hero. Other modes: spotlight. */
const FeedHero = ({ mode = "projects", onModeChange, className, search, onSearchChange }: Props) => {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { data: studioSlides = [] } = useStudioHeroSlides();
  const copy = HERO_COPY[mode];
  const useHomeHero = mode === "projects" || mode === "designers" || mode === "packages" || mode === "objects";

  if (useHomeHero) {
    return (
      <StudioHomeHero
        className={className}
        search={search}
        onSearchChange={onSearchChange}
        mode={mode}
        onModeChange={onModeChange}
      />
    );
  }

  const showcase =
    mode === "community" ? (
      <CommunityHeroShowcase />
    ) : (
      <HeroSpotlightShowcase slides={studioSlides} variant="studio" />
    );

  return (
    <section
      ref={heroRef}
      data-feed-hero
      className={cn(
        "relative overflow-hidden min-h-[22rem] sm:min-h-[24rem] md:min-h-[19rem] lg:min-h-[21rem]",
        "-mx-3 -mt-4 rounded-none ring-0 shadow-none sm:-mx-4",
        "md:mx-0 md:mt-0 md:rounded-[1.75rem] md:ring-1 md:ring-border/35 md:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      {reduced ? (
        showcase
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: smoothEase }}
            className="absolute inset-0"
          >
            {showcase}
          </motion.div>
        </AnimatePresence>
      )}

      <div
        className="absolute inset-0 z-[1] pointer-events-none md:hidden bg-gradient-to-b from-transparent from-[14%] via-background/45 via-[42%] to-background/55 to-[100%]"
        aria-hidden
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none hidden md:block bg-gradient-to-r from-background from-[0%] via-background/94 via-[34%] via-background/40 via-[48%] to-transparent to-[100%]"
        aria-hidden
      />

      <FadeUp className="relative z-10 flex h-full min-h-[inherit] flex-col px-5 pb-8 pt-6 sm:px-7 sm:pt-7 md:justify-center md:gap-4 md:max-w-[min(100%,30rem)] md:px-8 md:py-10 lg:max-w-[28rem] lg:px-10 lg:py-12">
        {reduced ? (
          <div className="space-y-3 md:space-y-4">
            <p className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[11px] font-medium tracking-wide text-primary thai-body">
              {copy.badge}
            </p>
            <h1 className="text-[1.75rem] sm:text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-tight text-foreground leading-[1.12] thai-display">
              {copy.title}
            </h1>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={carouselSlideVariants}
              transition={carouselSlideTransition}
              className="space-y-3 md:space-y-4"
            >
              <p className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[11px] font-medium tracking-wide text-primary thai-body">
                {copy.badge}
              </p>
              <h1 className="text-[1.75rem] sm:text-3xl md:text-4xl lg:text-[2.65rem] font-semibold tracking-tight text-foreground leading-[1.12] thai-display">
                {copy.title}
              </h1>
            </motion.div>
          </AnimatePresence>
        )}
      </FadeUp>
    </section>
  );
};

export default FeedHero;
