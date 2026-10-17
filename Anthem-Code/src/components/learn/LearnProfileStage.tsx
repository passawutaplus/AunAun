import { useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { MapPin } from "lucide-react";
import BriefIcon from "@/components/icons/BriefIcon";
import { LearnAuthLink } from "@/components/learn/LearnCtas";
import {
  LEARN_FALLBACK_WORKS,
  LEARN_SERIF,
  graphemes,
  typedAt,
  usePinnedProgress,
} from "@/components/learn/learnPinned";
import { cn } from "@/lib/utils";

const NAME = graphemes("Ploy Sirinya");
const AVATAR = "/learn/learn-about-portrait.jpg";

const STEPS = [
  { n: "01", title: "Say who you are", body: "A name, a role, a city. Short is fine." },
  { n: "02", title: "Put your work first", body: "Projects sit on top, so people meet the work before the bio." },
  { n: "03", title: "Say what you're open to", body: "Hire, collab, a team, or just a chat." },
] as const;

const OPEN_TO = ["รับจ้างงาน", "คอลแลป", "ชวนเข้าทีม"] as const;

/** Scroll timeline (0 → 1 across the pinned track). */
const T = {
  cover: [0, 0.06],
  avatar: [0.04, 0.12],
  nameFrom: 0.1,
  nameTo: 0.22,
  role: [0.2, 0.26],
  tilesFrom: 0.32,
  tileStep: 0.04,
  tileLen: 0.08,
  stats: [0.54, 0.6],
  openChip: [0.64, 0.68],
  chipsAt: [0.7, 0.75, 0.8],
  actions: [0.86, 0.92],
} as const;

function stepAt(v: number) {
  return v < 0.3 ? 0 : v < 0.62 ? 1 : 2;
}

function Tile({ p, src, index }: { p: MotionValue<number>; src: string; index: number }) {
  const start = T.tilesFrom + index * T.tileStep;
  const range = [start, start + T.tileLen];
  const opacity = useTransform(p, range, [0, 1]);
  const y = useTransform(p, range, [36, 0]);
  const scale = useTransform(p, range, [0.86, 1]);
  return (
    <div className="aspect-square rounded-lg border border-dashed border-[#e4e1db] bg-[#f7f6f3]">
      <motion.img
        src={src}
        alt=""
        draggable={false}
        className="h-full w-full rounded-lg bg-[#e4e1db] object-cover"
        style={{ opacity, y, scale }}
      />
    </div>
  );
}

function OpenChip({ p, label, at }: { p: MotionValue<number>; label: string; at: number }) {
  const [on, setOn] = useState(() => p.get() >= at);
  useMotionValueEvent(p, "change", (v) => {
    const next = v >= at;
    setOn((current) => (current === next ? current : next));
  });
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] transition-colors duration-300",
        on ? "border-[#2f2e2c] bg-[#2f2e2c] text-white" : "border-[#e4e1db] bg-white text-[#a8a49c]",
      )}
    >
      {label}
    </span>
  );
}

function ProfileMock({ p, works }: { p: MotionValue<number>; works: string[] }) {
  const [typed, setTyped] = useState(() => typedAt(p.get(), T.nameFrom, T.nameTo, NAME.length));
  useMotionValueEvent(p, "change", (v) => {
    const next = typedAt(v, T.nameFrom, T.nameTo, NAME.length);
    setTyped((current) => (current === next ? current : next));
  });

  const coverOpacity = useTransform(p, [...T.cover], [0, 1]);
  const avatarScale = useTransform(p, [...T.avatar], [0.4, 1]);
  const avatarOpacity = useTransform(p, [...T.avatar], [0, 1]);
  const roleOpacity = useTransform(p, [...T.role], [0, 1]);
  const roleY = useTransform(p, [...T.role], [8, 0]);
  const statsOpacity = useTransform(p, [...T.stats], [0, 1]);
  const openOpacity = useTransform(p, [...T.openChip], [0, 1]);
  const openY = useTransform(p, [...T.openChip], [10, 0]);
  const actionsOpacity = useTransform(p, [...T.actions], [0, 1]);
  const actionsY = useTransform(p, [...T.actions], [12, 0]);

  const tiles = (works.length >= 6 ? works : [...works, ...LEARN_FALLBACK_WORKS]).slice(0, 6);

  return (
    <div className="w-full overflow-hidden rounded-[1.25rem] border border-[#e4e1db] bg-white text-[#2f2e2c] shadow-[0_30px_80px_-30px_rgba(47,46,44,0.35)]">
      <motion.div className="h-16 bg-[#e4e1db] sm:h-20" style={{ opacity: coverOpacity }}>
        <img src={tiles[0]} alt="" className="h-full w-full object-cover opacity-70" draggable={false} />
      </motion.div>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <div className="relative z-10 -mt-8 flex items-end gap-3">
          <motion.img
            src={AVATAR}
            alt=""
            draggable={false}
            className="h-16 w-16 shrink-0 rounded-full border-4 border-white bg-[#e4e1db] object-cover"
            style={{ scale: avatarScale, opacity: avatarOpacity }}
          />
          <motion.span
            className="mb-1 ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#eaf6ee] px-2.5 py-1 text-[10px] font-medium text-[#23804a]"
            style={{ opacity: openOpacity, y: openY }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#23a35a]" />
            เปิดรับโอกาส
          </motion.span>
        </div>
        <p className="mt-2 min-h-[1.75rem] text-lg font-medium tracking-[-0.02em]">
          {NAME.slice(0, typed).join("")}
          {typed > 0 && typed < NAME.length ? (
            <span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-[#2f2e2c]" />
          ) : null}
        </p>
        <motion.p className="flex items-center gap-1.5 text-xs text-[#6b6862]" style={{ opacity: roleOpacity, y: roleY }}>
          Brand &amp; Packaging Designer
          <span aria-hidden>·</span>
          <MapPin className="h-3 w-3" aria-hidden />
          Bangkok
        </motion.p>

        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
          {tiles.map((src, index) => (
            <Tile key={src + index} p={p} src={src} index={index} />
          ))}
        </div>
        <motion.p className="mt-2.5 hidden text-[11px] text-[#8a867f] sm:block" style={{ opacity: statsOpacity }}>
          12 projects · 3 packages · 1 object
        </motion.p>

        <motion.div className="mt-4 flex flex-wrap gap-1.5" style={{ opacity: openOpacity }}>
          {OPEN_TO.map((label, i) => (
            <OpenChip key={label} p={p} label={label} at={T.chipsAt[i]} />
          ))}
        </motion.div>

        <motion.div className="mt-4 flex gap-2" style={{ opacity: actionsOpacity, y: actionsY }}>
          <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#2f2e2c] text-xs font-medium text-white">
            <BriefIcon className="h-3.5 w-3.5" />
            จ้างงาน
          </span>
          <span className="flex h-9 flex-1 items-center justify-center rounded-full border border-[#e4e1db] text-xs text-[#2f2e2c]">
            ชวนคอลแลป
          </span>
        </motion.div>
      </div>
    </div>
  );
}

const CTA_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-[#2f2e2c] px-6 text-sm font-medium text-[#f5f5f5] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2f2e2c] focus-visible:ring-offset-2";

function Heading() {
  return (
    <>
      <p className="text-[clamp(1.5rem,3vw,2.4rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={LEARN_SERIF}>
        Then build your
      </p>
      <h2 className="mt-2 text-[clamp(3rem,8.5vw,7rem)] font-medium leading-[0.84] tracking-[-0.06em] text-[#2f2e2c]">
        Profile
      </h2>
    </>
  );
}

/**
 * Pinned scroll story: a profile assembles itself — who you are, the work,
 * then what you're open to — while the step list on the left follows along.
 */
export function LearnProfileStage({ works }: { works: string[] }) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = usePinnedProgress(trackRef, Boolean(reduced));
  const staticProgress = useMotionValue(1);
  const [step, setStep] = useState(0);
  useMotionValueEvent(progress, "change", (v) => {
    const next = stepAt(v);
    setStep((current) => (current === next ? current : next));
  });

  const cta = (
    <LearnAuthLink to="/portfolio" className={CTA_CLASS}>
      สร้างโปรไฟล์
      <span aria-hidden>+</span>
    </LearnAuthLink>
  );

  if (reduced) {
    return (
      <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:px-10 lg:py-24">
        <div>
          <Heading />
          <ol className="mt-10 space-y-6">
            {STEPS.map((item) => (
              <li key={item.n}>
                <p className="text-xs text-[#6b6862]">( {item.n} )</p>
                <p className="mt-1 text-xl tracking-[-0.02em] text-[#2f2e2c]">{item.title}</p>
                <p className="mt-1 text-sm text-[#6b6862]">{item.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">{cta}</div>
        </div>
        <ProfileMock p={staticProgress} works={works} />
      </div>
    );
  }

  return (
    <>
      <div ref={trackRef} className="relative" style={{ height: "340vh" }}>
        <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-[80rem] items-center gap-6 px-4 pt-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:gap-16 md:pt-0 lg:px-10">
            <div>
              <Heading />
              <ol className="mt-6 md:mt-10 md:space-y-6">
                {STEPS.map((item, index) => {
                  const active = index === step;
                  return (
                    <li
                      key={item.n}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "transition-[opacity,color] duration-500",
                        active ? "opacity-100" : "hidden opacity-30 md:block",
                      )}
                    >
                      <p className="text-xs text-[#6b6862]">( {item.n} )</p>
                      <p className="mt-1 text-lg tracking-[-0.02em] text-[#2f2e2c] sm:text-xl">{item.title}</p>
                      <p className="mt-1 hidden max-w-sm text-sm leading-relaxed text-[#6b6862] md:block">{item.body}</p>
                    </li>
                  );
                })}
              </ol>
              <div className="mt-10 hidden md:block">{cta}</div>
            </div>
            <div className="mx-auto w-full max-w-[20rem] md:max-w-none">
              <ProfileMock p={progress} works={works} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-12 md:hidden">{cta}</div>
    </>
  );
}
