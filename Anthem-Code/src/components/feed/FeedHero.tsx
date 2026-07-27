import type { ReactNode } from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";

/** Match FeedPage / DesktopTopNav horizontal gutters so hero copy lines up with the logo. */
export const FEED_PAGE_GUTTER_X =
  "px-3 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]";

const HERO_GUTTER = FEED_PAGE_GUTTER_X;

const HERO_POINTS = [
  "แชร์ Project กับ Community ฟรี",
  "ค้นพบ Designer Artist และ Creator ที่ตรงสไตล์",
  "เริ่ม Collaboration หรือ Hiring ได้ในที่เดียว",
] as const;

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

  const goShareProject = () => {
    if (!user) {
      openSignup("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  if (useHomeHero) {
    return (
      <section
        ref={heroRef}
        data-feed-hero
        className={cn(
          "relative overflow-hidden bg-background",
          "-mx-3 -mt-4 sm:-mx-[calc(1rem+25px)] lg:-mx-[calc(1.5rem+25px)] 2xl:-mx-[calc(2.5rem+25px)]",
          "min-h-[min(72vh,36rem)] sm:min-h-[min(70vh,40rem)] md:min-h-[min(68vh,42rem)]",
          "lg:pt-12",
          className,
        )}
      >
        {/* Full-hero ambient grid (left copy + right slides) */}
        <HeroGridSpotlight trackRef={heroRef} className="z-0" />

        <div className="relative z-10 grid min-h-[inherit] md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
          <FadeUp
            className={cn(
              "relative z-10 flex flex-col justify-center py-6 sm:py-8 md:py-10",
              HERO_GUTTER,
              "md:pr-6 lg:pr-8",
            )}
          >
            <div className="relative z-[1] max-w-xl">
              <h1 className="text-[2.35rem] sm:text-4xl md:text-[2.75rem] lg:text-[3.35rem] font-bold tracking-tight text-foreground leading-[0.95] sm:leading-[0.92] thai-display">
                <span className="block text-[0.82em] sm:text-[0.85em]">1 Profile to</span>
                <span className="block bg-gradient-brand bg-clip-text text-transparent">
                  100+ Opportunity
                </span>
              </h1>
              <p className="mt-4 sm:mt-5 leading-relaxed">
                <span className="block text-base sm:text-lg md:text-xl font-bold text-foreground">
                  ให้ผลงานพาคุณไปสู่โอกาสใหม่ๆ
                </span>
                <span className="block mt-1.5 text-xs sm:text-sm text-muted-foreground">
                  เชื่อมต่อผู้คน ดีไซเนอร์ ศิลปิน และครีเอเตอร์ สร้างโอกาสใหม่จากผลงานจริงของคุณ
                </span>
              </p>

              <ul className="mt-6 sm:mt-8 space-y-2.5">
                {HERO_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/90">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    <span className="leading-snug thai-body">{point}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={goShareProject}
                aria-label="Share your Project"
                className="first-post-create first-post-create-idle group mt-7 sm:mt-8 relative inline-flex h-11 items-center overflow-visible rounded-full"
              >
                <span className="first-post-create-beam rounded-full" aria-hidden />
                <span className="first-post-create-inner relative z-10 m-[1.5px] inline-flex h-full items-center gap-2 rounded-full border border-border/60 bg-foreground py-0 pl-1.5 pr-5 text-sm font-medium text-background">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white">
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <span className="whitespace-nowrap pr-0.5">Share your Project</span>
                </span>
              </button>
            </div>
          </FadeUp>

          <div className="relative min-h-[16rem] sm:min-h-[20rem] md:min-h-0 overflow-hidden">
            <WorkWallMarquee />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-16 sm:w-24 md:w-32 lg:w-40 bg-gradient-to-r from-background from-[10%] via-background/70 via-[50%] to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-16 sm:h-20 bg-gradient-to-t from-background to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-8 bg-gradient-to-b from-background/40 to-transparent md:hidden"
              aria-hidden
            />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[12] h-20 sm:h-24 bg-gradient-to-t from-background via-background/70 to-transparent"
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
