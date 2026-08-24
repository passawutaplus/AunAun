import type { ReactNode } from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useStudioHeroSlides } from "@/hooks/useHeroSlides";
import { BRAND_CONCEPT } from "@/lib/brandConfig";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { carouselSlideTransition, carouselSlideVariants, smoothEase } from "@/lib/motion";
import { FadeUp } from "@/components/motion/FadeUp";
import type { FeedMode } from "@/components/feed/FeedModeToggle";
import HeroSpotlightShowcase from "./HeroSpotlightShowcase";
import CommunityHeroShowcase from "./CommunityHeroShowcase";
import WorkWallMarquee from "./WorkWallMarquee";
import HeroGridSpotlight from "./HeroGridSpotlight";
import HeroRotatingWord, { HeroHundredPlus, useHeroRotatingCycle } from "./HeroRotatingWord";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Match FeedPage / DesktopTopNav horizontal gutters so hero copy lines up with the logo. */
export const FEED_PAGE_GUTTER_X =
  "px-3 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]";

const HERO_GUTTER = FEED_PAGE_GUTTER_X;

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
  className?: string;
};

/** Projects + Designers: ambient work wall. Other modes: spotlight showcase. */
const FeedHero = ({ mode = "projects", className }: Props) => {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { data: studioSlides = [] } = useStudioHeroSlides();
  const copy = HERO_COPY[mode];
  const useHomeHero = mode === "projects" || mode === "designers" || mode === "packages";
  const heroCycle = useHeroRotatingCycle();

  if (useHomeHero) {
    return (
      <section
        ref={heroRef}
        data-feed-hero
        className={cn(
          "relative overflow-hidden bg-transparent",
          "-mx-3 sm:-mx-[calc(1rem+25px)] lg:-mx-[calc(1.5rem+25px)] 2xl:-mx-[calc(2.5rem+25px)]",
          // Mobile: leave room for FloatingNav (same 5.5rem + safe-area as mobileFabBottom).
          // Desktop (lg+): fill the viewport under the sticky site header (h-14).
          "h-[calc(100dvh-env(safe-area-inset-bottom,0px)-5.5rem)] min-h-[36rem]",
          "pt-[env(safe-area-inset-top)] lg:h-[calc(100dvh-3.5rem)] lg:min-h-[40rem]",
          className,
        )}
      >
        <HeroGridSpotlight trackRef={heroRef} className="z-0" />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <FadeUp
            className={cn(
              "relative z-10 mx-auto flex w-full max-w-3xl shrink-0 flex-col items-center text-center",
              HERO_GUTTER,
              "pt-4 pb-3 sm:pt-6 sm:pb-4 lg:pt-5 lg:pb-5",
            )}
          >
            <h1 className="text-[2.15rem] sm:text-4xl md:text-[2.85rem] lg:text-[3.25rem] font-bold tracking-tight text-foreground leading-[0.98] sm:leading-[0.95]">
              <span className="block">1 Profile to</span>
              <span className="block text-primary">
                <HeroHundredPlus /> <HeroRotatingWord cycle={heroCycle} lang="en" />
              </span>
            </h1>
            <p className="mt-4 max-w-md text-base sm:mt-5 sm:text-lg font-normal text-foreground">
              <span className="inline-flex flex-wrap items-baseline justify-center gap-x-1.5">
                <span>ให้ผลงานพาคุณไปสู่</span>
                <HeroRotatingWord cycle={heroCycle} lang="th" className="font-semibold text-primary" />
                <span>ใหม่ๆ</span>
              </span>
            </p>
            <Button
              asChild
              size="lg"
              className="mt-5 h-11 gap-2 rounded-full bg-gradient-brand px-7 text-sm font-medium text-white hover:opacity-90 sm:mt-6"
            >
              <Link to="/learn">
                <Rocket className="h-4 w-4" aria-hidden />
                Let's start
              </Link>
            </Button>
          </FadeUp>

          <div className="relative z-10 min-h-0 w-full flex-1 overflow-hidden pb-4 sm:pb-6">
            <WorkWallMarquee embed />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[12] h-16 sm:h-20 bg-gradient-to-t from-background via-background/70 to-transparent"
          aria-hidden
        />
      </section>
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
