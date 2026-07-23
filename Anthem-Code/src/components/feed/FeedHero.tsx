import type { ReactNode } from "react";
import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedStats } from "@/hooks/useFeedStats";
import { useDesignerHeroSlides, useStudioHeroSlides } from "@/hooks/useHeroSlides";
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

const formatNum = (n: number) => n.toLocaleString("th-TH");

const STATS = [
  { key: "designers", label: "Designers" },
  { key: "projects", label: "Projects" },
  { key: "hires", label: "Hire" },
  { key: "successfulCollabs", label: "Collab" },
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

/** Projects: ambient work wall. Other modes: spotlight showcase. */
const FeedHero = ({ mode = "projects", className }: Props) => {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { data, isLoading } = useFeedStats();
  const { slides: designerSlides } = useDesignerHeroSlides();
  const { data: studioSlides = [] } = useStudioHeroSlides();
  const copy = HERO_COPY[mode];
  const isProjects = mode === "projects";
  const s = data ?? { designers: 0, projects: 0, hires: 0, successfulCollabs: 0 };

  if (isProjects) {
    return (
      <section
        ref={heroRef}
        className={cn(
          "relative overflow-hidden bg-background",
          "-mx-3 -mt-4 sm:-mx-[calc(1rem+25px)] lg:-mx-[calc(1.5rem+25px)] 2xl:-mx-[calc(2.5rem+25px)]",
          "min-h-[min(88vh,44rem)] sm:min-h-[min(86vh,48rem)] md:min-h-[min(84vh,52rem)]",
          className,
        )}
      >
        {/* Full-hero ambient grid (left copy + right slides) */}
        <HeroGridSpotlight trackRef={heroRef} className="z-0" />

        <div className="relative z-10 grid min-h-[inherit] md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
          <FadeUp className="relative z-10 flex flex-col justify-center px-5 py-10 sm:px-8 sm:py-12 md:px-10 md:py-14 lg:px-12 xl:px-14">
            <div className="relative z-[1] max-w-xl">
              <h1 className="text-[2.35rem] sm:text-4xl md:text-[2.75rem] lg:text-[3.35rem] font-bold tracking-tight text-foreground leading-[0.95] sm:leading-[0.92] thai-display">
                <span className="block">1 Profile to</span>
                <span className="block bg-gradient-brand bg-clip-text text-transparent">
                  100+ Opportunity
                </span>
              </h1>
              <p className="mt-4 sm:mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground">
                  Discover inspiring work from designers and artists around the world.
                </span>{" "}
                Explore creative ideas, connect with like-minded people, and turn your
                portfolio into new collaboration and career opportunities—all in one community.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-col items-start gap-2.5">
                <div className="flex flex-wrap items-stretch divide-x divide-black/20 dark:divide-white/20">
                  {STATS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="px-3.5 first:pl-0 last:pr-0 sm:px-4 py-0.5"
                    >
                      <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/65 whitespace-nowrap">
                        {label}
                      </span>
                      {isLoading ? (
                        <Skeleton className="mt-1.5 h-6 w-9 sm:h-7 sm:w-10" />
                      ) : (
                        <span className="mt-1.5 block text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                          {formatNum(s[key])}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] sm:text-[11px] font-light tracking-[0.16em] text-foreground/50 uppercase">
                  Live platform overview
                </p>
              </div>
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
    ) : mode === "designers" ? (
      <HeroSpotlightShowcase slides={designerSlides} variant="designer" />
    ) : (
      <HeroSpotlightShowcase slides={studioSlides} variant="studio" />
    );

  return (
    <section
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
