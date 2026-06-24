import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";

export function TranscriptReviewPanel({
  transcript,
  onChange,
  transcribeCredits,
  reportCredits,
  onSummarize,
  busy,
  recordedAt,
}: {
  transcript: string;
  onChange: (v: string) => void;
  transcribeCredits: number;
  reportCredits: number;
  onSummarize: () => void;
  busy: boolean;
  recordedAt?: string;
}) {
  const dateLabel = recordedAt
    ? new Date(recordedAt)
        .toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
        .toUpperCase()
    : null;

  return (
    <div className="rounded-[28px] border border-neutral-200 bg-white overflow-hidden shadow-sm">
      {dateLabel ? (
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-neutral-500">
            {dateLabel}
          </p>
        </div>
      ) : (
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-sm font-semibold">
            ถอดเสียงแล้ว — ตรวจและแก้ชื่อร้าน/ตัวเลขก่อนสรุปรายงาน
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            AI จะร่างรายงานสรุปให้อ่าน — ไม่ใช่เอกสารสำเร็จรูป · ใช้ประมาณ {reportCredits} เครดิต
            {transcribeCredits > 0 ? ` (ถอดเสียงแล้ว ${transcribeCredits})` : " (ถอดเสียงฟรี)"}
          </p>
        </div>
      )}

      <div className="px-5 py-4 space-y-3 max-h-[50vh] overflow-y-auto">
        {transcript ? (
          <>
            <p className="text-sm leading-relaxed text-neutral-400">
              {transcript.slice(0, Math.max(0, transcript.length - 180))}
            </p>
            <p className="rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold leading-relaxed text-black">
              {transcript.slice(-180)}
            </p>
          </>
        ) : (
          <p className="text-sm text-neutral-400 italic">ยังไม่มีข้อความถอดเสียง</p>
        )}
      </div>

      <div className="border-t border-neutral-100 bg-neutral-50/80 p-4 space-y-3">
        <Textarea
          value={transcript}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="text-sm leading-relaxed bg-white border-neutral-200 rounded-2xl resize-none"
          placeholder="แก้ไขข้อความถอดเสียง…"
        />
        <Button
          onClick={onSummarize}
          disabled={busy || !transcript.trim()}
          className="w-full h-12 rounded-2xl gap-2 bg-black hover:bg-neutral-800 text-white font-semibold"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "กำลังสรุปรายงาน…" : "สรุปเป็นรายงาน →"}
        </Button>
      </div>
    </div>
  );
}
