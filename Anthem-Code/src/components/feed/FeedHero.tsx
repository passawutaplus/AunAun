import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedStats } from "@/hooks/useFeedStats";
import { useDesignerHeroSlides, useStudioHeroSlides } from "@/hooks/useHeroSlides";
import { BRAND_CONCEPT } from "@/lib/brandConfig";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { carouselSlideTransition, carouselSlideVariants, smoothEase } from "@/lib/motion";
import { FadeUp } from "@/components/motion/FadeUp";
import type { FeedMode } from "@/components/feed/FeedModeToggle";
import TopProjectShowcase from "./TopProjectShowcase";
import HeroSpotlightShowcase from "./HeroSpotlightShowcase";
import CommunityHeroShowcase from "./CommunityHeroShowcase";

import { cn } from "@/lib/utils";

const formatNum = (n: number) => n.toLocaleString("th-TH");

const STATS = [
  { key: "designers", label: "ดีไซเนอร์" },
  { key: "projects", label: "ผลงาน" },
  { key: "collabs", label: "คอลแลป" },
  { key: "hires", label: "จ้างงาน" },
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

const FeedHero = ({ mode = "projects", className }: Props) => {
  const reduced = useReducedMotion();
  const { data, isLoading } = useFeedStats();
  const { slides: designerSlides } = useDesignerHeroSlides();
  const { data: studioSlides = [] } = useStudioHeroSlides();
  const s = data ?? { designers: 0, projects: 0, collabs: 0, hires: 0 };
  const copy = HERO_COPY[mode];

  const showcase =
    mode === "community" ? (
      <CommunityHeroShowcase />
    ) : mode === "designers" ? (
      <HeroSpotlightShowcase slides={designerSlides} variant="designer" />
    ) : mode === "studios" ? (
      <HeroSpotlightShowcase slides={studioSlides} variant="studio" />
    ) : (
      <TopProjectShowcase />
    );

  return (
    <section
      className={cn(
        "relative overflow-hidden min-h-[26rem] sm:min-h-[28rem] md:min-h-[19rem] lg:min-h-[21rem]",
        // Mobile: edge-to-edge (cancel page padding), no radius
        "-mx-3 -mt-4 rounded-none ring-0 shadow-none sm:-mx-4",
        // Desktop/tablet card treatment
        "md:mx-0 md:mt-0 md:rounded-[1.75rem] md:ring-1 md:ring-border/35 md:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] lg:mx-0",
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
      <div
        className="absolute inset-0 z-[1] pointer-events-none hidden md:block bg-gradient-to-t from-black/[0.06] via-transparent to-transparent"
        aria-hidden
      />

      <FadeUp className="relative z-10 flex h-full min-h-[inherit] flex-col px-5 pb-8 pt-6 sm:px-7 sm:pt-7 md:justify-center md:gap-6 md:max-w-[min(100%,30rem)] md:px-8 md:py-10 lg:max-w-[28rem] lg:px-10 lg:py-12">
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

        {/* ช่องว่างเดิมของคำอธิบาย — มือถือ/แท็บเลตเท่านั้น */}
        <div className="min-h-[2.75rem] sm:min-h-[3rem] md:hidden" aria-hidden />

        <div className="mt-auto flex flex-wrap gap-2 w-fit max-w-full md:mt-0 md:gap-2.5">
          {(isAplus1LaunchMinimal() ? STATS.filter(({ key }) => key !== "collabs") : STATS).map(({ key, label }) => (
            <div
              key={key}
              className="w-fit rounded-xl border border-white/20 bg-white/15 px-2.5 py-2 shadow-sm backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/10 md:border-white/15 md:bg-white/10 md:px-3 md:py-2.5 md:backdrop-blur-xl dark:border-white/15 dark:bg-white/[0.12] dark:shadow-[inset_0_1px_0_0_hsl(0_0%_100%_/_0.1)] dark:supports-[backdrop-filter]:bg-white/[0.08]"
            >
              <span className="block text-[10px] uppercase tracking-[0.1em] text-foreground/70 font-medium thai-body whitespace-nowrap md:text-[11px] md:tracking-[0.12em]">
                {label}
              </span>
              {isLoading ? (
                <Skeleton className="h-6 w-8 mt-1 md:h-7 md:w-10 md:mt-1.5" />
              ) : (
                <span className="mt-1 block text-lg font-semibold text-foreground tabular-nums leading-none md:text-2xl">
                  {formatNum(s[key])}
                </span>
              )}
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  );
};

export default FeedHero;
