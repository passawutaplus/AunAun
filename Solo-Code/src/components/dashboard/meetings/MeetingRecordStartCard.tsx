import { ArrowRight } from "lucide-react";
import { StartCardWaveform } from "./RecordingWaveform";

export function MeetingRecordStartCard({
  modeLabel,
  maxLabel,
  disabled,
  onStart,
}: {
  modeLabel: string;
  maxLabel: string;
  disabled?: boolean;
  onStart: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]">
      {/* Top — white */}
      <div className="bg-white px-5 pt-6 pb-5">
        <div className="flex items-center justify-between text-[9px] font-semibold tracking-[0.22em] text-neutral-400 uppercase">
          <span>Talk</span>
          <span className="text-neutral-500">Transcribe</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-[8px] tracking-[0.18em] text-neutral-300 uppercase">
          <span>Easy</span>
          <span>Fast</span>
        </div>
        <div className="mt-3">
          <StartCardWaveform />
        </div>
      </div>

      {/* Bottom — black */}
      <div className="bg-black px-6 py-8 min-h-[220px] flex flex-col justify-between">
        <div>
          <p className="text-[2rem] font-bold leading-none text-white tracking-tight">Recording</p>
          <p className="text-[2rem] font-bold leading-none text-white/90 tracking-tight mt-1">
            {modeLabel}
          </p>
          <p className="text-[11px] text-white/45 mt-4">{maxLabel}</p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={onStart}
          className="group flex items-center gap-4 disabled:opacity-40 disabled:pointer-events-none"
        >
          <span className="text-[2.5rem] font-bold text-white leading-none tracking-tight">
            Start
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/40 transition group-active:scale-95">
            <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </button>
      </div>
    </div>
  );
}
