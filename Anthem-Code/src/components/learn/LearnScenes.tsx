import { type ReactNode, type RefObject } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Check } from "lucide-react";
import { LearnProductFrame } from "@/components/learn/LearnProductFrame";
import { PinFilm, useCinemaStage } from "@/components/learn/LearnMotion";
import { LEARN_FILM, LEARN_LOOP_WORDS, LEARN_WHO_NOT } from "@/data/learnContent";
import { cn } from "@/lib/utils";

function StageDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300",
            i === active ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

export function StepRail({
  steps,
  active,
}: {
  steps: readonly { step?: string; title: string; body: string }[];
  active: number;
}) {
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => {
        const on = i === active;
        const done = i < active;
        return (
          <li
            key={step.title}
            className={cn(
              "flex gap-3 transition-opacity duration-300",
              on ? "opacity-100" : done ? "opacity-70" : "opacity-35",
            )}
          >
            <span
              className={cn(
                "mt-0.5 text-xs font-semibold tracking-widest",
                on ? "text-primary" : "text-muted-foreground",
              )}
            >
              {step.step ?? String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function useHeroScroll(target: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end start"],
  });
  const rotate = useTransform(scrollYProgress, [0, 0.4], [0, -5.5]);
  const y = useTransform(scrollYProgress, [0, 0.4], [0, 36]);
  const secondY = useTransform(scrollYProgress, [0, 0.16], [18, 0]);
  const secondOp = useTransform(scrollYProgress, [0, 0.16], [0.2, 1]);
  return { reduced: !!reduced, rotate, y, secondY, secondOp };
}

export function LearnMarqueeStage({
  rotate,
  y,
  reduced,
  children,
}: {
  rotate: MotionValue<number>;
  y: MotionValue<number>;
  reduced: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      style={reduced ? undefined : { rotate, y }}
      className="origin-top will-change-transform"
    >
      {children}
    </motion.div>
  );
}

export function LearnWhoFan({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  const rot = [
    useTransform(progress, [0, 0.65], [0, -16]),
    useTransform(progress, [0, 0.65], [0, 0]),
    useTransform(progress, [0, 0.65], [0, 16]),
  ];
  const x = [
    useTransform(progress, [0, 0.65], [20, -150]),
    useTransform(progress, [0, 0.65], [0, 0]),
    useTransform(progress, [0, 0.65], [-20, 150]),
  ];
  const y = [
    useTransform(progress, [0, 0.65], [12, 28]),
    useTransform(progress, [0, 0.65], [0, 0]),
    useTransform(progress, [0, 0.65], [12, 28]),
  ];
  const covers = [LEARN_FILM.poster, LEARN_FILM.cover, LEARN_FILM.tiles[2]];

  return (
    <div className="relative mx-auto aspect-[16/11] w-full max-w-lg">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={LEARN_WHO_NOT[i].title}
          style={
            reduced
              ? undefined
              : { rotate: rot[i], x: x[i], y: y[i], zIndex: i === 1 ? 4 : 2 }
          }
          className={cn(
            "absolute inset-x-[10%] top-[8%] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)]",
            reduced && i === 0 && "-translate-x-[28%] -rotate-[12deg]",
            reduced && i === 2 && "translate-x-[28%] rotate-[12deg]",
            "origin-bottom",
          )}
        >
          <img src={covers[i]} alt="" className="aspect-[16/10] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 py-3">
            <p className="text-sm font-semibold text-white">{LEARN_WHO_NOT[i].title}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function LearnFirstVisitPlay({
  steps,
  stage,
  reduced,
}: {
  steps: readonly { step: string; title: string; body: string }[];
  stage: number;
  reduced: boolean;
}) {
  const tiles = LEARN_FILM.tiles;
  const featured = tiles[1];

  return (
    <div>
      <LearnProductFrame title="samecor.com · Explore">
        <div className="relative aspect-[16/10] overflow-hidden bg-zinc-950">
          <AnimatePresence mode="wait">
            {stage === 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative grid h-full grid-cols-3 grid-rows-2 gap-1.5 p-2 sm:gap-2 sm:p-3"
              >
                {tiles.map((src, i) => (
                  <motion.div
                    key={src}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="overflow-hidden rounded-lg"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </motion.div>
                ))}
                {!reduced ? (
                  <motion.div
                    aria-hidden
                    animate={{ x: [12, 46, 12], y: [10, -8, 10] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute left-[36%] top-[42%] z-30 h-5 w-5 rounded-full border-2 border-white bg-primary shadow-[0_0_0_6px_hsl(14_100%_55%/0.28)]"
                  />
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <img src={featured} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {stage >= 2 ? (
              <motion.aside
                key="profile"
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 80, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-2 right-2 z-10 w-[42%] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl"
              >
                <div className="flex items-center gap-2">
                  <img src={LEARN_FILM.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-white">Mokka Studio</p>
                    <p className="text-[10px] text-emerald-400">เปิดรับโอกาส</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <img src={LEARN_FILM.cover} alt="" className="aspect-[4/3] rounded-md object-cover" />
                  <img src={LEARN_FILM.poster} alt="" className="aspect-[4/3] rounded-md object-cover" />
                </div>
              </motion.aside>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {stage >= 3 ? (
              <motion.div
                key="auth"
                initial={{ y: 48, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 48, opacity: 0 }}
                className="absolute inset-x-6 bottom-6 z-20 rounded-2xl border border-white/10 bg-background/95 p-4 shadow-2xl"
              >
                <p className="text-sm font-semibold text-foreground">เข้าสู่ระบบเพื่อคุยต่อ</p>
                <p className="mt-1 text-xs text-muted-foreground">บันทึก ทัก หรือลงผลงาน — แล้วย้อนหน้าที่ค้างไว้ได้</p>
                <div className="mt-3 h-8 rounded-full bg-gradient-brand" />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </LearnProductFrame>
      <StageDots count={steps.length} active={stage} />
    </div>
  );
}

export function LearnAssembleProject({
  checklist,
  stage,
}: {
  checklist: readonly string[];
  stage: number;
}) {

  return (
    <div>
      <LearnProductFrame title="ลงผลงานชิ้นแรก">
        <div className="relative overflow-hidden bg-zinc-950 p-4 sm:p-5">
          <motion.div
            initial={false}
            animate={{ scale: stage === 0 ? 1.06 : 1, y: stage === 0 ? 16 : 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-xl"
          >
            <img src={LEARN_FILM.cover} alt="" className="aspect-[16/9] w-full object-cover" />
          </motion.div>
          <AnimatePresence>
            {stage >= 1 ? (
              <motion.p
                key="title"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm font-semibold text-white"
              >
                Brand refresh · Mokka
              </motion.p>
            ) : null}
          </AnimatePresence>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["Branding", "Packaging", "Print"].map((tag, i) =>
              stage >= 2 + Math.min(i, 1) ? (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/80"
                >
                  {tag}
                </motion.span>
              ) : null,
            )}
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: stage >= 4 ? 1 : 0, x: stage >= 4 ? 0 : -8 }}
            className="mt-3 inline-flex rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-400"
          >
            เปิดรับโอกาส · สาธารณะ
          </motion.div>
          <ul className="mt-4 space-y-2">
            {checklist.map((item, i) => (
              <motion.li
                key={item}
                initial={false}
                animate={{ opacity: i <= stage ? 1 : 0.28, x: i <= stage ? 0 : 8 }}
                className="flex items-start gap-2.5 text-xs text-white/90 sm:text-sm"
              >
                <Check
                  className={cn("mt-0.5 h-4 w-4 shrink-0", i <= stage ? "text-emerald-400" : "text-white/25")}
                  aria-hidden
                />
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </LearnProductFrame>
    </div>
  );
}

export function LearnMagnetSave({ stage }: { stage: number }) {
  const pulled = stage >= 2;
  const showCta = stage >= 3;

  return (
    <div>
      <LearnProductFrame title="Explore · เก็บไว้แล้วคุย">
        <div className="relative flex aspect-[16/10] overflow-hidden bg-zinc-950">
          <div className="grid min-w-0 flex-1 grid-cols-3 grid-rows-2 gap-1.5 p-2 sm:p-3">
            {LEARN_FILM.tiles.map((src, i) => {
              const magnet = i < 3;
              return (
                <motion.div
                  key={src}
                  initial={false}
                  animate={
                    magnet && pulled
                      ? { x: 72, scale: 0.72, opacity: 0.35 }
                      : { x: 0, scale: 1, opacity: 1 }
                  }
                  transition={{ duration: 0.5, delay: magnet ? i * 0.06 : 0, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden rounded-lg"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </motion.div>
              );
            })}
          </div>
          <motion.aside
            initial={false}
            animate={{ width: pulled ? "34%" : "0%", opacity: pulled ? 1 : 0 }}
            className="overflow-hidden border-l border-white/10 bg-zinc-900/90"
          >
            <p className="px-2 pt-3 text-[10px] font-medium tracking-wide text-white/60">คอลเลกชัน</p>
            <div className="space-y-1.5 p-2">
              {LEARN_FILM.tiles.slice(0, 3).map((src) => (
                <img key={src} src={src} alt="" className="aspect-[16/10] w-full rounded-md object-cover" />
              ))}
            </div>
          </motion.aside>
          <motion.div
            initial={false}
            animate={{ y: showCta ? 0 : 36, opacity: showCta ? 1 : 0 }}
            className="absolute inset-x-0 bottom-3 z-10 flex justify-center"
          >
            <span className="rounded-full bg-gradient-brand px-5 py-2 text-sm font-medium text-white shadow-lg">
              คุยต่อจากผลงานนี้
            </span>
          </motion.div>
        </div>
      </LearnProductFrame>
    </div>
  );
}

export function LearnChatBridge({ stage }: { stage: number }) {
  const draw = stage >= 1 ? 1 : 0;

  return (
    <div>
      <LearnProductFrame title="แชทจากชิ้นงาน">
        <div className="relative overflow-hidden bg-zinc-950 p-4 sm:p-5">
          <motion.img
            src={LEARN_FILM.poster}
            alt=""
            initial={false}
            animate={{ rotate: stage >= 0 ? 0 : -12, opacity: 1 }}
            className="mb-4 h-20 w-28 rounded-xl object-cover shadow-lg"
          />
          <svg className="pointer-events-none absolute left-16 top-16 h-16 w-36 text-primary" viewBox="0 0 160 80" aria-hidden>
            <motion.path
              d="M8 8 C 40 8, 80 40, 150 58"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: draw }}
              transition={{ duration: 0.6 }}
            />
          </svg>
          <motion.div
            initial={false}
            animate={{ opacity: stage >= 1 ? 1 : 0, x: stage >= 1 ? 0 : -16 }}
            className="max-w-[85%] rounded-2xl rounded-tl-md bg-white/10 px-3 py-2.5 text-xs leading-relaxed text-white"
          >
            ชอบโทนงานชิ้นนี้มาก — อยากคุยขอบเขตรีแบรนด์ครับ
          </motion.div>
          <motion.div
            initial={false}
            animate={{ opacity: stage >= 2 ? 1 : 0, x: stage >= 2 ? 0 : 16 }}
            className="ml-auto mt-3 max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-brand px-3 py-2.5 text-xs leading-relaxed text-white"
          >
            ได้เลย ส่ง moodboard ที่ชอบมาได้เลยนะ
          </motion.div>
          <p className="mt-4 text-xs text-white/55">
            เลือกคำให้ตรงเจตนา:{" "}
            <AnimatePresence mode="wait">
              <motion.span
                key={LEARN_LOOP_WORDS[Math.min(stage, LEARN_LOOP_WORDS.length - 1)]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="inline-block font-semibold text-primary"
              >
                {LEARN_LOOP_WORDS[Math.min(stage, LEARN_LOOP_WORDS.length - 1)]}
              </motion.span>
            </AnimatePresence>
          </p>
        </div>
      </LearnProductFrame>
    </div>
  );
}

export function LearnCtaStill({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-brand">
      <div className="footer-cta-wave absolute inset-0 opacity-90" aria-hidden />
      {!reduced
        ? LEARN_FILM.tiles.slice(0, 5).map((src, i) => (
            <motion.img
              key={src}
              src={src}
              alt=""
              animate={{
                y: [0, -10 - i * 2, 0],
                x: [0, (i % 2 === 0 ? 8 : -8), 0],
              }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
              className={cn(
                "pointer-events-none absolute h-16 w-24 rounded-lg object-cover opacity-80 shadow-lg sm:h-20 sm:w-28",
                i === 0 && "left-[8%] top-[18%]",
                i === 1 && "right-[10%] top-[22%]",
                i === 2 && "left-[14%] bottom-[20%]",
                i === 3 && "right-[16%] bottom-[18%]",
                i === 4 && "left-1/2 top-[12%] -translate-x-1/2",
              )}
            />
          ))
        : null}
      <div className="relative px-6 py-14 sm:px-10 sm:py-16">{children}</div>
    </div>
  );
}

export { PinFilm };

type RailStep = { step?: string; title: string; body: string };

export function LearnPinnedWho() {
  return (
    <PinFilm>
      {(progress, reduced) => <WhoPinBody progress={progress} reduced={reduced} />}
    </PinFilm>
  );
}

function WhoPinBody({
  progress,
  reduced,
}: {
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const { stage, hostRef } = useCinemaStage(progress, LEARN_WHO_NOT.length, reduced);
  return (
    <div ref={hostRef} className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
      <StepRail steps={LEARN_WHO_NOT} active={stage} />
      <LearnWhoFan progress={progress} reduced={reduced} />
    </div>
  );
}

export function LearnPinPair({
  steps,
  count,
  flip,
  film,
}: {
  steps: readonly RailStep[];
  count: number;
  flip?: boolean;
  film: (stage: number, reduced: boolean) => ReactNode;
}) {
  return (
    <PinFilm>
      {(progress, reduced) => (
        <PinPairBody steps={steps} count={count} flip={flip} progress={progress} reduced={reduced} film={film} />
      )}
    </PinFilm>
  );
}

function PinPairBody({
  steps,
  count,
  flip,
  progress,
  reduced,
  film,
}: {
  steps: readonly RailStep[];
  count: number;
  flip?: boolean;
  progress: MotionValue<number>;
  reduced: boolean;
  film: (stage: number, reduced: boolean) => ReactNode;
}) {
  const { stage, hostRef } = useCinemaStage(progress, count, reduced);
  return (
    <div
      ref={hostRef}
      className={cn(
        "mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14",
        flip && "lg:[&>:first-child]:order-2",
      )}
    >
      <StepRail steps={steps} active={stage} />
      <div>{film(stage, reduced)}</div>
    </div>
  );
}
