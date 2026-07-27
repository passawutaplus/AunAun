import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  OVERALL_MOOD_OPTIONS,
  type OverallMoodValue,
} from "@/lib/workReviews";

type Props = {
  value: OverallMoodValue;
  onChange: (value: OverallMoodValue) => void;
  title?: string;
  className?: string;
};

/** Active face fill + soft aura per mood. */
const MOOD_COLOR: Record<
  OverallMoodValue,
  { fill: string; glow: string; label: string }
> = {
  1: {
    fill: "hsl(0 84% 58%)",
    glow: "hsla(0, 84%, 58%, 0.35)",
    label: "text-red-400",
  },
  2: {
    fill: "hsl(24 95% 53%)",
    glow: "hsla(24, 95%, 53%, 0.32)",
    label: "text-orange-400",
  },
  3: {
    fill: "hsl(45 95% 52%)",
    glow: "hsla(45, 95%, 52%, 0.32)",
    label: "text-yellow-400",
  },
  4: {
    fill: "hsl(142 70% 42%)",
    glow: "hsla(142, 70%, 42%, 0.32)",
    label: "text-emerald-400",
  },
  5: {
    fill: "hsl(142 85% 48%)",
    glow: "hsla(142, 85%, 55%, 0.45)",
    label: "text-emerald-300",
  },
};

function MoodFace({
  value,
  active,
}: {
  value: OverallMoodValue;
  active: boolean;
}) {
  const stroke = active ? "hsl(0 0% 12%)" : "hsl(var(--muted-foreground) / 0.55)";
  const fill = active ? MOOD_COLOR[value].fill : "hsl(var(--muted) / 0.9)";

  const eyes =
    value === 1 ? (
      <>
        <path d="M14 18 L20 22" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M20 18 L14 22" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M28 18 L34 22" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M34 18 L28 22" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="17" cy="20" r="2.2" fill={stroke} />
        <circle cx="31" cy="20" r="2.2" fill={stroke} />
      </>
    );

  const mouth =
    value === 1 ? (
      <path d="M16 34 Q24 28 32 34" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
    ) : value === 2 ? (
      <path d="M17 34 Q24 30 31 34" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
    ) : value === 3 ? (
      <path d="M17 33 L31 31" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
    ) : value === 4 ? (
      <path d="M16 31 Q24 38 32 31" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
    ) : (
      <path
        d="M15 30 Q24 40 33 30"
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    );

  return (
    <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
      <circle cx="24" cy="24" r="22" fill={fill} />
      {eyes}
      {mouth}
    </svg>
  );
}

/** Horizontal Terrible→Great mood scale with spring selection motion. */
export function OverallMoodRating({
  value,
  onChange,
  title = "ภาพรวมการจ้างครั้งนี้",
  className,
}: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="relative px-1 pt-1">
        <div
          className="pointer-events-none absolute left-6 right-6 top-[22px] h-px bg-border/70 sm:top-[26px]"
          aria-hidden
        />
        <div className="relative z-[1] flex items-start justify-between gap-1">
          {OVERALL_MOOD_OPTIONS.map((opt) => {
            const active = value === opt.value;
            const colors = MOOD_COLOR[opt.value];
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className="flex w-[18%] max-w-[4.5rem] flex-col items-center gap-1.5 outline-none"
                aria-label={opt.labelTh}
                aria-pressed={active}
              >
                <motion.span
                  className="relative flex h-10 w-10 items-center justify-center sm:h-11 sm:w-11"
                  animate={{
                    scale: active ? (opt.value === 5 ? 1.28 : 1.22) : 1,
                    y: active ? -2 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.7 }}
                >
                  {active ? (
                    <motion.span
                      layoutId="overall-mood-glow"
                      className="absolute inset-[-8px] rounded-full"
                      style={{
                        background: colors.glow,
                        boxShadow:
                          opt.value === 5
                            ? `0 0 18px 6px ${colors.glow}`
                            : `0 0 10px 2px ${colors.glow}`,
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    />
                  ) : null}
                  <span className="relative h-full w-full drop-shadow-sm">
                    <MoodFace value={opt.value} active={active} />
                  </span>
                </motion.span>
                <motion.span
                  className={cn(
                    "text-center text-[10px] leading-tight sm:text-[11px]",
                    active ? cn("font-semibold", colors.label) : "text-muted-foreground/70",
                  )}
                  animate={{ opacity: active ? 1 : 0.75 }}
                >
                  {opt.labelTh}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OverallMoodRating;
