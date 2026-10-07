import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Camera, Check, Eye, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { featureFromRoute } from "@/lib/featureRoute";
import { dataUrlToBlob } from "@/lib/feedbackCapture";
import { uploadFeedbackScreenshot } from "@/lib/feedbackScreenshot";
import { FEEDBACK_KIND_OPTIONS, serializeFeedbackAnnotations, type FeedbackKind } from "@/lib/feedbackTicket";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitFeedback } from "@/hooks/useFeedback";
import FeedbackAnnotateDialog from "@/components/feedback/FeedbackAnnotateDialog";
import { useFeedbackComposer } from "@/stores/feedbackComposerStore";

const RATINGS = [
  { value: 1, emoji: "😠", label: "แย่มาก" },
  { value: 2, emoji: "🙁", label: "แย่" },
  { value: 3, emoji: "😐", label: "ปานกลาง" },
  { value: 4, emoji: "🙂", label: "ดี" },
  { value: 5, emoji: "😍", label: "ดีมาก" },
] as const;

export default function FeedbackComposer() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const captures = useFeedbackComposer((s) => s.captures);
  const annotatingId = useFeedbackComposer((s) => s.annotatingId);
  const draft = useFeedbackComposer((s) => s.draft);
  const patchDraft = useFeedbackComposer((s) => s.patchDraft);
  const startSnip = useFeedbackComposer((s) => s.startSnip);
  const openAnnotator = useFeedbackComposer((s) => s.openAnnotator);
  const closeAnnotator = useFeedbackComposer((s) => s.closeAnnotator);
  const removeCapture = useFeedbackComposer((s) => s.removeCapture);
  const close = useFeedbackComposer((s) => s.close);
  const submit = useSubmitFeedback();
  const [doneNumber, setDoneNumber] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const feature = featureFromRoute(pathname);
  const busy = submit.isPending || uploading;
  const canSend =
    draft.title.trim().length >= 3 &&
    draft.rating != null &&
    !!draft.kind &&
    !!draft.message.trim() &&
    !busy;

  useEffect(() => {
    void import("html-to-image");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      if (annotatingId) {
        closeAnnotator();
        return;
      }
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [annotatingId, busy, close, closeAnnotator]);

  const send = async () => {
    if (!canSend || !user || !draft.kind || draft.rating == null) return;
    try {
      setUploading(true);
      let screenshotPath: string | undefined;
      const first = captures[0];
      if (first) {
        screenshotPath = await uploadFeedbackScreenshot(user.id, dataUrlToBlob(first.dataUrl));
      }
      const title = draft.title.trim().slice(0, 120);
      const body = draft.message.trim();
      const row = await submit.mutateAsync({
        feature,
        route: pathname,
        kind: draft.kind,
        rating: draft.rating,
        message: `${title}\n\n${body}`.slice(0, 2000),
        screenshot_path: screenshotPath,
        annotation_json: serializeFeedbackAnnotations(first?.comments ?? []),
      });
      setDoneNumber(row?.ticket_number ?? "AP-");
    } catch {
      // toast from hook
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      data-feedback-ui
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy && !annotatingId) close();
      }}
    >
      <div
        className={cn(
          "relative flex max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:rounded-2xl",
          doneNumber ? "bg-gradient-brand text-white" : "bg-background",
        )}
      >
        {doneNumber ? (
          <div className="relative px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-10 -top-16 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
              <div className="absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-amber-100/35 blur-3xl" />
              <div className="absolute left-1/2 top-8 h-28 w-40 -translate-x-1/2 rounded-full bg-white/15 blur-2xl" />
            </div>
            <button
              type="button"
              aria-label="ปิด"
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-white/80 hover:text-white"
              onClick={close}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                <Check className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold tracking-tight">ขอบคุณที่ส่งฟีดแบ็ก</h2>
              <p className="mx-auto mt-2 max-w-[18rem] text-[13px] leading-relaxed text-white/90">
                เราจะนำไปพัฒนา แก้ไข และปรับปรุงต่อ
              </p>
              <p className="mt-3 text-sm text-white/80">
                เลขตั๋ว <span className="font-mono font-medium text-white">{doneNumber}</span>
              </p>
              <Button
                className="mx-auto mt-6 mb-2 h-11 w-40 border-0 bg-white text-primary hover:bg-white/90"
                onClick={close}
              >
                ปิด
              </Button>
            </div>
          </div>
        ) : (
          <>
        <div className="relative px-6 pt-6 pb-2 text-center">
          <button
            type="button"
            aria-label="ปิด"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </button>
              <h2 className="text-xl font-bold tracking-tight">Customer Review</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                บอกประสบการณ์ที่ใช้ Aplus1 — บั๊ก ไอเดีย หรือหน้าพัง แล้วแคปหน้าจอชี้จุดได้
              </p>
        </div>

            <div className="space-y-5 overflow-y-auto px-6 py-2">
              <div className="space-y-1.5">
                <label htmlFor="feedback-title" className="text-sm font-semibold">
                  Topic
                </label>
                <Input
                  id="feedback-title"
                  value={draft.title}
                  onChange={(e) => patchDraft({ title: e.target.value })}
                  placeholder="สรุปสั้น ๆ ว่าเกิดอะไร"
                  maxLength={120}
                />
              </div>

              <div className="space-y-2" role="group" aria-label="ประเภท">
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_KIND_OPTIONS.map((opt) => {
                    const selected = draft.kind === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        title={opt.hint}
                        onClick={() => patchDraft({ kind: opt.value as FeedbackKind })}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-primary/40 bg-background text-primary hover:bg-primary/5",
                        )}
                      >
                        {opt.chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">Rate</p>
                <div className="flex items-center justify-between gap-1 px-1">
                  {RATINGS.map((r) => {
                    const selected = draft.rating === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        aria-label={r.label}
                        title={r.label}
                        onClick={() => patchDraft({ rating: r.value })}
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full text-2xl transition-transform",
                          selected && "scale-110 bg-yellow-300/70 ring-4 ring-yellow-200",
                        )}
                      >
                        {r.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="feedback-message" className="text-sm font-semibold">
                  ข้อเสนอแนะ / ปรับปรุง
                </label>
                <Textarea
                  id="feedback-message"
                  value={draft.message}
                  onChange={(e) => patchDraft({ message: e.target.value })}
                  placeholder="Your Feedback (Required)"
                  rows={4}
                  maxLength={2000}
                  className="min-h-[110px] resize-none"
                />
              </div>

              <div className="space-y-2">
                {captures.length ? (
                  <ul className="space-y-2">
                    {captures.map((shot, index) => (
                      <li
                        key={shot.id}
                        className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-2 py-2"
                      >
                        <img loading="lazy" decoding="async"
                          src={shot.dataUrl}
                          alt=""
                          className="h-14 w-[4.5rem] shrink-0 rounded object-cover"
                        />
                        <p className="min-w-0 flex-1 text-sm font-medium">Capture {index + 1}</p>
                        <button
                          type="button"
                          aria-label="ขีดเขียนภาพแคป"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                          onClick={() => openAnnotator(shot.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="ลบภาพแคป"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                          onClick={() => removeCapture(shot.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button type="button" variant="secondary" className="w-full" onClick={startSnip}>
                  <Camera className="mr-2 h-4 w-4" />
                  แคปหน้าจอ
                </Button>
              </div>
            </div>

            <div className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              <Button className="mx-auto flex h-11 w-40" disabled={!canSend} onClick={() => void send()}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                Submit
              </Button>
            </div>
          </>
        )}
      </div>
      {annotatingId ? <FeedbackAnnotateDialog /> : null}
    </div>
  );
}
