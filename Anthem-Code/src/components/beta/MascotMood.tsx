import { useId } from "react";

/**
 * The tour mascot (see components/project/TourMascot.tsx) as a small static face whose expression follows a 1–5 rating.
 * Mood 0 is the idle face (no mouth) used before anything is picked.
 */
export type MascotMoodValue = 0 | 1 | 2 | 3 | 4 | 5;

/** Tile colour by mood: green (great) → grey (meh) → red (bad); 0 keeps the brand orange. */
const TILE: Record<MascotMoodValue, { top: string; bottom: string; ink: string }> = {
  0: { top: "#f5a352", bottom: "#e9822f", ink: "#7a3a0c" },
  5: { top: "#6fd08c", bottom: "#36a95c", ink: "#1d5a31" },
  4: { top: "#b4dd7a", bottom: "#8cc251", ink: "#3f5d1c" },
  3: { top: "#c9c6c1", bottom: "#a8a49e", ink: "#4a4744" },
  2: { top: "#f7b267", bottom: "#ee8c3a", ink: "#7a3a0c" },
  1: { top: "#f2857a", bottom: "#de4f45", ink: "#6e1a14" },
};
const EYE = "#fffaf2";

function Face({ mood }: { mood: MascotMoodValue }) {
  const INK = TILE[mood].ink;
  const stroke = { stroke: INK, strokeWidth: 2.6, strokeLinecap: "round" as const, fill: "none" };
  switch (mood) {
    case 1:
      return (
        <>
          <ellipse cx="25" cy="34" rx="3.8" ry="4.2" fill={EYE} />
          <ellipse cx="39" cy="34" rx="3.8" ry="4.2" fill={EYE} />
          <path d="M19.5 25.5 L28.5 29.5 M44.5 25.5 L35.5 29.5" {...stroke} />
          <path d="M26 47 Q32 41.5 38 47" {...stroke} />
        </>
      );
    case 2:
      return (
        <>
          <ellipse cx="25" cy="34.5" rx="3.6" ry="4.6" fill={EYE} />
          <ellipse cx="39" cy="34.5" rx="3.6" ry="4.6" fill={EYE} />
          <path d="M20.5 28.5 L28 26 M43.5 28.5 L36 26" {...stroke} />
          <path d="M27.5 46 Q32 43 36.5 46" {...stroke} />
        </>
      );
    case 3:
      return (
        <>
          <ellipse cx="25" cy="33" rx="3.8" ry="5.4" fill={EYE} />
          <ellipse cx="39" cy="33" rx="3.8" ry="5.4" fill={EYE} />
          <path d="M27.5 44.5 L36.5 44.5" {...stroke} />
        </>
      );
    case 4:
      return (
        <>
          <ellipse cx="25" cy="32.5" rx="3.8" ry="5.6" fill={EYE} />
          <ellipse cx="39" cy="32.5" rx="3.8" ry="5.6" fill={EYE} />
          <path d="M26 42.5 Q32 48.5 38 42.5" {...stroke} />
          <ellipse cx="18.5" cy="41" rx="3.6" ry="2.2" fill="#ff7f6e" opacity=".35" />
          <ellipse cx="45.5" cy="41" rx="3.6" ry="2.2" fill="#ff7f6e" opacity=".35" />
        </>
      );
    case 5:
      return (
        <>
          <path d="M20.5 34 Q25 27.5 29.5 34 M34.5 34 Q39 27.5 43.5 34" stroke={EYE} strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M25 41 Q32 52 39 41 Z" fill={INK} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M28.5 46.2 Q32 48.6 35.5 46.2" fill="#ff8f7d" />
          <ellipse cx="18" cy="40.5" rx="4" ry="2.4" fill="#ff7f6e" opacity=".5" />
          <ellipse cx="46" cy="40.5" rx="4" ry="2.4" fill="#ff7f6e" opacity=".5" />
        </>
      );
    default:
      return (
        <>
          <ellipse cx="25.5" cy="35" rx="3.8" ry="5.4" fill={EYE} transform="rotate(-6 25.5 35)" />
          <ellipse cx="38.5" cy="33" rx="3.8" ry="5.8" fill={EYE} transform="rotate(8 38.5 33)" />
        </>
      );
  }
}

export default function MascotMood({ mood, className }: { mood: MascotMoodValue; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TILE[mood].top} />
          <stop offset="1" stopColor={TILE[mood].bottom} />
        </linearGradient>
        <radialGradient id={`${id}-dome`} cx="50%" cy="62%" r="62%">
          <stop offset="0" stopColor={TILE[mood].bottom} />
          <stop offset=".5" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".9" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <rect x="6" y="6" width="52" height="54" rx="18" />
        </clipPath>
      </defs>
      <rect x="6" y="6" width="52" height="54" rx="18" fill={`url(#${id}-tile)`} />
      <g clipPath={`url(#${id}-clip)`}>
        <ellipse cx="32" cy="58" rx="40" ry="32" fill={`url(#${id}-dome)`} opacity=".55" />
      </g>
      <Face mood={mood} />
    </svg>
  );
}
