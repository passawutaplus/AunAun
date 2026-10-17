import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import { LEARN_FALLBACK_WORKS, LEARN_SERIF, usePinnedProgress } from "@/components/learn/learnPinned";
import { cn } from "@/lib/utils";

export type LearnDesigner = {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  cover: string;
  projectCount: number;
  href: string | null;
};

const SAMPLE_DESIGNERS: LearnDesigner[] = [
  ["Ploy Sirinya", "Brand & Packaging"],
  ["Krit Thana", "Motion Designer"],
  ["Mali Studio", "Illustration"],
  ["Nattapong W.", "Photographer"],
  ["Fah Ratchada", "UX/UI Designer"],
  ["Pixel Lab", "3D & Objects"],
].map(([name, role], i) => ({
  id: `sample-${i}`,
  name,
  role,
  avatar: null,
  cover: LEARN_FALLBACK_WORKS[i % LEARN_FALLBACK_WORKS.length],
  projectCount: 4 + ((i * 5) % 9),
  href: null,
}));

const DIRECTORY_PATH = "/?mode=designers";
const AVATAR_TONES = ["bg-[#2f2e2c]", "bg-[#b59a7a]", "bg-[#7a8b99]", "bg-[#8f7a99]"];

function DesignerCard({ designer, index }: { designer: LearnDesigner; index: number }) {
  const body = (
    <>
      <span className="block overflow-hidden rounded-[1.1rem] bg-[#e4e1db]">
        <img
          src={designer.cover}
          alt=""
          loading="lazy"
          draggable={false}
          className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </span>
      <span className="mt-3 flex items-center gap-2.5">
        {designer.avatar ? (
          <img src={designer.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" draggable={false} />
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
              AVATAR_TONES[index % AVATAR_TONES.length],
            )}
          >
            {designer.name.slice(0, 1)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[#2f2e2c]">{designer.name}</span>
          <span className="block truncate text-xs text-[#6b6862]">{designer.role}</span>
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-[#8a867f]">
          {designer.projectCount} {designer.projectCount === 1 ? "project" : "projects"}
        </span>
      </span>
    </>
  );

  const className = cn(
    "group block w-[min(17rem,68vw)] shrink-0 rounded-[1.1rem] outline-none focus-visible:ring-2 focus-visible:ring-[#2f2e2c] focus-visible:ring-offset-4",
    index % 2 === 1 && "md:mt-[4vh]",
  );

  return designer.href ? (
    <Link to={designer.href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function DirectoryCard() {
  return (
    <Link
      to={DIRECTORY_PATH}
      className="flex aspect-[4/5] w-[min(17rem,68vw)] shrink-0 flex-col justify-between rounded-[1.1rem] bg-[#2f2e2c] p-6 text-[#f5f5f5] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2f2e2c] focus-visible:ring-offset-4"
    >
      <span className="text-[11px] uppercase tracking-[0.16em] text-[#f5f5f5]/60">Directory</span>
      <span>
        <span className="block text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.05]" style={LEARN_SERIF}>
          Meet everyone
        </span>
        <span className="mt-3 inline-flex items-center gap-2 text-sm underline decoration-[#f5f5f5]/30 underline-offset-4">
          ดูทำเนียบดีไซเนอร์ทั้งหมด <span aria-hidden>+</span>
        </span>
      </span>
    </Link>
  );
}

function Heading() {
  return (
    <>
      <p className="text-[clamp(1.5rem,3vw,2.4rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={LEARN_SERIF}>
        A community of
      </p>
      <h2 className="mt-2 text-[clamp(3rem,8.5vw,7rem)] font-medium leading-[0.84] tracking-[-0.06em] text-[#2f2e2c]">
        Designers
      </h2>
    </>
  );
}

const LEAD = "Every profile starts from real work. Browse by style, then talk to the person behind it.";

/**
 * Pinned horizontal gallery: vertical scroll slides a row of designer
 * profiles sideways, ending on a card into the full directory.
 */
export function LearnDesignersStage({ designers }: { designers: LearnDesigner[] }) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef(0);
  const [trackHeight, setTrackHeight] = useState<number | null>(null);
  const progress = usePinnedProgress(trackRef, Boolean(reduced));
  const people = designers.length ? designers : SAMPLE_DESIGNERS;

  useEffect(() => {
    const row = rowRef.current;
    if (!row || reduced) return;
    const measure = () => {
      const distance = Math.max(0, row.scrollWidth - window.innerWidth);
      distanceRef.current = distance;
      setTrackHeight(window.innerHeight + distance * 1.15);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [people.length, reduced]);

  const x = useTransform(progress, (v) => {
    const t = Math.min(1, Math.max(0, (v - 0.04) / 0.9));
    return -t * distanceRef.current;
  });
  const bar = useTransform(progress, [0.04, 0.94], [0, 1]);

  if (reduced) {
    return (
      <div className="py-16 lg:py-24">
        <div className="mx-auto max-w-[80rem] px-4 sm:px-6 lg:px-10">
          <Heading />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[#6b6862]">{LEAD}</p>
        </div>
        <div className="mt-10 flex snap-x gap-5 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-10">
          {people.map((designer, index) => (
            <div key={designer.id} className="snap-start">
              <DesignerCard designer={designer} index={index} />
            </div>
          ))}
          <DirectoryCard />
        </div>
      </div>
    );
  }

  return (
    <div ref={trackRef} className="relative" style={{ height: trackHeight ? `${trackHeight}px` : "300vh" }}>
      <div className="sticky top-0 flex h-[100dvh] flex-col justify-center overflow-hidden pt-16">
        <div className="mx-auto flex w-full max-w-[80rem] flex-wrap items-end justify-between gap-x-10 gap-y-3 px-4 sm:px-6 lg:px-10">
          <div>
            <Heading />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-[#6b6862]">{LEAD}</p>
        </div>

        <motion.div
          ref={rowRef}
          className="mt-8 flex w-max items-start gap-5 px-4 sm:px-6 md:mt-10 md:gap-7 lg:px-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]"
          style={{ x }}
        >
          {people.map((designer, index) => (
            <DesignerCard key={designer.id} designer={designer} index={index} />
          ))}
          <DirectoryCard />
        </motion.div>

        <div className="mx-auto mt-8 w-full max-w-[80rem] px-4 sm:px-6 lg:px-10">
          <div className="h-px w-full bg-[#e4e1db]">
            <motion.div className="h-px origin-left bg-[#2f2e2c]" style={{ scaleX: bar }} />
          </div>
        </div>
      </div>
    </div>
  );
}
