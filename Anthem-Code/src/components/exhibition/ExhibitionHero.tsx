import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ExhibitionEvent } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

const SLIDE_MS = 5000;
/** House gallery shot: always the first slide, so the hero has a picture before any event has a cover. */
const HOUSE_SLIDE = { id: "", title: "", cover_url: "/exhibition/hero.webp" };

type Slide = Pick<ExhibitionEvent, "id" | "title" | "cover_url">;

/** Page head for /exhibition: title + intro on the left, event covers cross-fading on the right. */
export function ExhibitionHero({
  events,
  className,
}: {
  events: Slide[];
  className?: string;
}) {
  const slides: Slide[] = [
    HOUSE_SLIDE,
    ...events.filter((e) => e.cover_url).slice(0, 5),
  ];
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || reduceMotion) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      SLIDE_MS,
    );
    return () => window.clearInterval(t);
  }, [count, reduceMotion]);

  const current = slides[index % count];

  return (
    <section
      className={cn(
        "relative grid overflow-hidden rounded-[1.75rem] border border-border bg-card lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
        className,
      )}
    >
      <div className="relative z-10 flex flex-col justify-end gap-4 p-6 sm:p-8 lg:p-12">
        <span className="block h-0.5 w-10 bg-brand" aria-hidden />
        <h1
          data-feed-mode-title=""
          className="text-5xl font-semibold leading-[0.9] tracking-tight text-foreground lg:text-[4.25rem] xl:text-[5.25rem]"
        >
          Exhibition
          <span className="block whitespace-nowrap text-muted-foreground">&amp; Events</span>
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          นิทรรศการ เวิร์กช็อป และโอกาสสร้างสรรค์รอบตัวคุณ —
          ทุกงานผ่านการตรวจจากทีม SAMECOR
        </p>
      </div>

      <div className="relative min-h-[14rem] sm:min-h-[18rem] lg:min-h-[26rem]">
        <AnimatePresence initial={false}>
          <motion.img
            key={current.id || "house"}
            src={current.cover_url ?? undefined}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </AnimatePresence>
        {/* Blend the photo into the card on the text side. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent lg:bg-gradient-to-r lg:from-card lg:via-card/20"
          aria-hidden
        />
        {count > 1 ? (
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 lg:inset-x-6 lg:bottom-6">
            {current.id ? (
              <Link
                to={`/exhibition/${current.id}`}
                className="line-clamp-1 rounded-full bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
              >
                {current.title}
              </Link>
            ) : (
              <span />
            )}
            {count > 1 ? (
              <div
                className="flex shrink-0 gap-1.5"
                role="group"
                aria-label="เลือกภาพ"
              >
                {slides.map((s, i) => (
                  <button
                    key={s.id || "house"}
                    type="button"
                    aria-label={`ภาพที่ ${i + 1}${s.title ? `: ${s.title}` : ""}`}
                    aria-current={i === index % count || undefined}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1.5 rounded-full bg-background/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                      i === index % count ? "w-6 bg-background" : "w-1.5",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
