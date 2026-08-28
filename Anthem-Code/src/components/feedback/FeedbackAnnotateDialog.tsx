import { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackAnnotator, type FeedbackAnnotatorHandle } from "@/components/feedback/FeedbackAnnotator";
import { useFeedbackComposer } from "@/stores/feedbackComposerStore";

export default function FeedbackAnnotateDialog() {
  const captures = useFeedbackComposer((s) => s.captures);
  const annotatingId = useFeedbackComposer((s) => s.annotatingId);
  const closeAnnotator = useFeedbackComposer((s) => s.closeAnnotator);
  const updateCapture = useFeedbackComposer((s) => s.updateCapture);
  const annotatorRef = useRef<FeedbackAnnotatorHandle>(null);

  const capture = captures.find((c) => c.id === annotatingId);
  if (!capture) return null;

  const save = () => {
    try {
      const snap = annotatorRef.current?.exportSnapshot();
      if (snap) updateCapture(capture.id, snap.dataUrl, snap.comments);
      closeAnnotator();
    } catch {
      closeAnnotator();
    }
  };

  return (
    <div
      data-feedback-ui
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) save();
      }}
    >
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">ขีดเขียนภาพแคป</h2>
          <button type="button" aria-label="ปิด" className="rounded-md p-1 text-muted-foreground" onClick={save}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
          <FeedbackAnnotator
            ref={annotatorRef}
            imageDataUrl={capture.dataUrl}
            initialComments={capture.comments}
            layout="full"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" onClick={closeAnnotator}>
            ยกเลิก
          </Button>
          <Button onClick={save}>บันทึก</Button>
        </div>
      </div>
    </div>
  );
}
