import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  captureViewportOrRect,
  clampRectToViewport,
  normalizeDragRect,
  type CaptureRect,
} from "@/lib/feedbackCapture";
import { useFeedbackComposer } from "@/stores/feedbackComposerStore";

export default function FeedbackSnipOverlay() {
  const beginCompose = useFeedbackComposer((s) => s.beginCompose);
  const cancelSnip = useFeedbackComposer((s) => s.cancelSnip);
  const capturing = useFeedbackComposer((s) => s.capturing);
  const setCapturing = useFeedbackComposer((s) => s.setCapturing);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void import("html-to-image");
  }, []);

  const rect: CaptureRect | null =
    start && current
      ? clampRectToViewport(normalizeDragRect(start, current), window.innerWidth, window.innerHeight)
      : null;

  const finish = useCallback(
    async (crop: CaptureRect | null) => {
      if (capturing) return;
      if (crop && (crop.width < 8 || crop.height < 8)) {
        toast.message("ลากกรอบให้ใหญ่กว่านี้ หรือกดทั้งหน้าต่าง");
        return;
      }
      if (useFeedbackComposer.getState().captures.length >= 5) {
        toast.message("แคปได้สูงสุด 5 ภาพ");
        beginCompose(null);
        return;
      }
      setCapturing(true);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      try {
        const dataUrl = await captureViewportOrRect(crop);
        beginCompose(dataUrl);
      } catch {
        toast.error("แคปหน้าจอไม่สำเร็จ — พิมพ์หรืออัปโหลดรูปแทนได้");
        beginCompose(null);
      } finally {
        setCapturing(false);
      }
    },
    [beginCompose, capturing, setCapturing],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelSnip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelSnip]);

  if (capturing) {
    return (
      <div
        data-feedback-ui
        className="fixed inset-0 z-[80] flex items-center justify-center bg-background/40"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังแคปหน้าจอ
        </div>
      </div>
    );
  }

  return (
    <div data-feedback-ui className="fixed inset-0 z-[80]">
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs shadow-lg">
          <span className="text-muted-foreground">ลากเพื่อเลือกพื้นที่</span>
          <button
            type="button"
            className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
            onClick={() => void finish(null)}
          >
            ทั้งหน้าต่าง
          </button>
          <button type="button" className="rounded-full px-3 py-1 text-muted-foreground" onClick={cancelSnip}>
            ยกเลิก
          </button>
        </div>
      </div>
      <div
        className="absolute inset-0 cursor-crosshair bg-black/35"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button")) return;
          setStart({ x: e.clientX, y: e.clientY });
          setCurrent({ x: e.clientX, y: e.clientY });
        }}
        onPointerMove={(e) => {
          if (!start) return;
          setCurrent({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={() => {
          if (!rect) {
            setStart(null);
            setCurrent(null);
            return;
          }
          const crop = rect;
          setStart(null);
          setCurrent(null);
          void finish(crop);
        }}
      >
        {rect ? (
          <div
            className="absolute border-2 border-primary bg-primary/10"
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          />
        ) : null}
      </div>
    </div>
  );
}
