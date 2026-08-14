import type { ReactNode } from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useStudioHeroSlides } from "@/hooks/useHeroSlides";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { BRAND_CONCEPT } from "@/lib/brandConfig";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { carouselSlideTransition, carouselSlideVariants, smoothEase } from "@/lib/motion";
import { FadeUp } from "@/components/motion/FadeUp";
import type { FeedMode } from "@/components/feed/FeedModeToggle";
import HeroSpotlightShowcase from "./HeroSpotlightShowcase";
import CommunityHeroShowcase from "./CommunityHeroShowcase";
import WorkWallMarquee from "./WorkWallMarquee";
import HeroGridSpotlight from "./HeroGridSpotlight";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { data: studioSlides = [] } = useStudioHeroSlides();
  const copy = HERO_COPY[mode];
  const useHomeHero = mode === "projects" || mode === "designers";

  const goBecomeCreator = () => {
    if (!user) {
      openSignup("/hire/start");
      return;
    }
    navigate("/hire/start");
  };

  if (useHomeHero) {
    return (
      <section
        ref={heroRef}
        data-feed-hero
        className={cn(
          "relative overflow-hidden bg-background",
          "-mx-3 sm:-mx-[calc(1rem+25px)] lg:-mx-[calc(1.5rem+25px)] 2xl:-mx-[calc(2.5rem+25px)]",
          // Mobile: leave room for FloatingNav (same 5.5rem + safe-area as mobileFabBottom).
          // Desktop (lg+): full viewport — nav overlays the hero.
          "h-[calc(100dvh-env(safe-area-inset-bottom,0px)-5.5rem)] min-h-[32rem]",
          "pt-[env(safe-area-inset-top)] lg:h-dvh lg:min-h-dvh",
          className,
        )}
      >
        <HeroGridSpotlight trackRef={heroRef} className="z-0" />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <FadeUp
            className={cn(
              "relative z-10 grid shrink-0 gap-3 sm:gap-6 lg:grid-cols-2 lg:items-end lg:gap-12",
              HERO_GUTTER,
              "pt-6 pb-4 sm:pt-10 sm:pb-12 lg:pt-[4.75rem] lg:pb-16",
            )}
          >
            <h1 className="text-left text-[2.35rem] sm:text-4xl md:text-[2.75rem] lg:text-[3.35rem] font-bold tracking-tight text-foreground leading-[0.95] sm:leading-[0.92]">
              <span className="block">1 Profile to</span>
              <span className="block text-primary">100+ Opportunity</span>
            </h1>

            <div className="flex max-w-md flex-col lg:ml-auto lg:pb-1">
              <p className="leading-relaxed">
                <span className="block text-base sm:text-lg font-bold text-foreground">
                  ให้ผลงานพาคุณไปสู่โอกาสใหม่ๆ
                </span>
                <span className="mt-1.5 block text-xs sm:text-sm text-muted-foreground">
                  เชื่อมต่อผู้คน ดีไซเนอร์ ศิลปิน และครีเอเตอร์ สร้างโอกาสใหม่จากผลงานจริงของคุณ
                </span>
              </p>
              <Button
                type="button"
                size="lg"
                onClick={goBecomeCreator}
                aria-label="Become a Creator"
                className="mt-5 h-11 w-fit gap-2 rounded-full bg-gradient-brand px-5 text-sm font-medium text-white hover:opacity-90 sm:mt-6"
              >
                <Rocket className="h-4 w-4" aria-hidden />
                Become a Creator
              </Button>
            </div>
          </FadeUp>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <WorkWallMarquee />
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
