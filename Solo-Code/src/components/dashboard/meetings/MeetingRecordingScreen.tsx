import * as React from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { formatRecordingTimer } from "@/lib/meetingCaptureSchema";
import { useAudioAnalyser } from "@/hooks/useAudioAnalyser";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { RecordingWaveform } from "./RecordingWaveform";

export function MeetingRecordingScreen({
  open,
  elapsedMs,
  paused,
  stream,
  modeLabel,
  onBack,
  onDiscard,
  onPauseToggle,
  onFinish,
  onTranscriptChange,
}: {
  open: boolean;
  elapsedMs: number;
  paused: boolean;
  stream: MediaStream | null;
  modeLabel: string;
  onBack: () => void;
  onDiscard: () => void;
  onPauseToggle: () => void;
  onFinish: () => void;
  onTranscriptChange?: (text: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState("");

  const levels = useAudioAnalyser(stream, open && !paused);
  const { fullText, supported, setManualText } = useLiveTranscription(open && !paused);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (fullText) onTranscriptChange?.(fullText);
  }, [fullText, onTranscriptChange]);

  const openEdit = () => {
    setEditDraft(fullText);
    setEditing(true);
  };

  const saveEdit = () => {
    setManualText(editDraft.trim());
    onTranscriptChange?.(editDraft.trim());
    setEditing(false);
  };

  if (!mounted || !open) return null;

  const displayText = fullText || "กำลังฟัง… พูดได้เลย";
  const activeStart = Math.max(0, fullText.length - 120);
  const olderText = fullText.slice(0, activeStart);
  const activeText = fullText.slice(activeStart);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white text-black"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100"
          aria-label="กลับ"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[11px] font-semibold tracking-[0.28em] text-neutral-500 uppercase">
          {modeLabel}
        </span>
        <button
          type="button"
          onClick={onDiscard}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100"
          aria-label="ลบการอัด"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </header>

      {/* Timer */}
      <div className="px-6 pt-2 pb-6 text-center">
        <p className="font-mono text-[3.25rem] font-bold leading-none tracking-tight tabular-nums">
          {formatRecordingTimer(elapsedMs)}
        </p>
        <p className="mt-2 text-xs text-neutral-400">Recorded time</p>
      </div>

      {/* Waveform */}
      <div className="px-2">
        <RecordingWaveform levels={levels} paused={paused} />
      </div>

      {/* Live transcript */}
      <div className="flex-1 overflow-hidden px-6 pt-6 pb-4">
        {editing ? (
          <textarea
            autoFocus
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            className="h-full w-full resize-none rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed outline-none focus:border-neutral-400"
            placeholder="แก้ข้อความถอดเสียงสด…"
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <p
              className={`text-sm leading-relaxed transition-colors ${
                fullText ? "text-neutral-400" : "text-neutral-300 italic"
              }`}
            >
              {supported ? (
                <>
                  {olderText ? (
                    <span className="block text-neutral-400 mb-3 leading-relaxed">{olderText}</span>
                  ) : null}
                  <span className="block rounded-2xl bg-neutral-100 px-4 py-3 text-base font-semibold text-black leading-relaxed">
                    {activeText || displayText}
                  </span>
                </>
              ) : (
                <span className="block rounded-2xl bg-neutral-100 px-4 py-3 text-base font-semibold text-black">
                  {displayText}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-neutral-100 bg-neutral-50/80 px-4 py-5">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            type="button"
            onClick={editing ? saveEdit : openEdit}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-neutral-200/80 text-neutral-700 active:scale-95 transition"
            aria-label={editing ? "บันทึกข้อความ" : "แก้ข้อความ"}
          >
            {editing ? <Check className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={onPauseToggle}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-black text-base font-semibold text-white active:scale-[0.98] transition"
          >
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            type="button"
            onClick={() => {
              onTranscriptChange?.(fullText);
              onFinish();
            }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#FF3B30] text-white active:scale-95 transition shadow-lg shadow-[#FF3B30]/30"
            aria-label="เสร็จสิ้น"
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
