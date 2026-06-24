import * as React from "react";
import { WAVEFORM_BAR_COUNT } from "@/hooks/useAudioAnalyser";

export function RecordingWaveform({
  levels,
  paused,
  className,
}: {
  levels: number[];
  paused?: boolean;
  className?: string;
}) {
  const playhead = Math.floor(levels.length * 0.62);

  return (
    <div
      className={`flex items-end justify-center gap-[3px] h-28 px-1 ${className ?? ""}`}
      aria-hidden
    >
      {levels.slice(0, WAVEFORM_BAR_COUNT).map((level, i) => {
        const h = Math.round(12 + level * 72);
        const isPlayhead = i === playhead && !paused;
        return (
          <div
            key={i}
            className="relative flex flex-col items-center justify-end"
            style={{ width: 3 }}
          >
            {isPlayhead ? (
              <span className="mb-1 h-2 w-2 rounded-full bg-[#FF3B30]" />
            ) : (
              <span className="mb-1 h-2 w-2" />
            )}
            <div
              className="w-full rounded-full transition-[height] duration-75"
              style={{
                height: h,
                backgroundColor: isPlayhead ? "#FF3B30" : "#C8C8C8",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Decorative static waveform for the start card */
export function StartCardWaveform() {
  const bars = React.useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => {
        const wave = Math.sin(i * 0.35) * 0.35 + Math.cos(i * 0.18) * 0.25;
        return Math.max(0.15, 0.45 + wave);
      }),
    [],
  );

  return (
    <div className="flex items-end justify-center gap-[2px] h-16 px-4" aria-hidden>
      {bars.map((level, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full bg-neutral-300"
          style={{ height: 8 + level * 40 }}
        />
      ))}
    </div>
  );
}
