import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Camera, Check, Eye, ImagePlus, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FEEDBACK_PAGE_OPTIONS, featureFromRoute } from "@/lib/featureRoute";
import { dataUrlToBlob } from "@/lib/feedbackCapture";
import { uploadFeedbackScreenshot } from "@/lib/feedbackScreenshot";
import { FEEDBACK_KIND_OPTIONS, serializeFeedbackAnnotations } from "@/lib/feedbackTicket";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitFeedback } from "@/hooks/useFeedback";
import FeedbackAnnotateDialog from "@/components/feedback/FeedbackAnnotateDialog";
import BetaProgress from "@/components/beta/BetaProgress";
import MascotMood, { type MascotMoodValue } from "@/components/beta/MascotMood";
import { useFeedbackComposer } from "@/stores/feedbackComposerStore";

/** Capture notes travel in the message so admin sees them next to the text. */
function withCaptureNotes(message: string, captures: { note: string }[]) {
  const notes = captures
    .map((c, i) => (c.note.trim() ? `ภาพ ${i + 1}: ${c.note.trim()}` : null))
    .filter(Boolean);
  return [message.trim(), notes.length ? `โน้ตภาพ\n${notes.join("\n")}` : ""].filter(Boolean).join("\n\n");
}

const RATINGS = [
  { value: 5, label: "ดีมาก" },
  { value: 4, label: "ดี" },
  { value: 3, label: "เฉยๆ" },
  { value: 2, label: "แย่" },
  { value: 1, label: "แย่มาก" },
] as const;

const PLACEHOLDER: Record<string, string> = {
  idea: "อยากให้ SAMECOR มีอะไร หรือปรับตรงไหน…",
  bug: "เกิดอะไรขึ้น กดอะไรก่อนหน้านั้น…",
  ux: "ตรงไหนที่งง หาไม่เจอ หรือใช้ยาก…",
  praise: "ชอบส่วนไหน อยากให้เก็บอะไรไว้…",
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function FeedbackComposer() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const captures = useFeedbackComposer((s) => s.captures);
  const annotatingId = useFeedbackComposer((s) => s.annotatingId);
  const draft = useFeedbackComposer((s) => s.draft);
  const patchDraft = useFeedbackComposer((s) => s.patchDraft);
  const startSnip = useFeedbackComposer((s) => s.startSnip);
  const addCapture = useFeedbackComposer((s) => s.addCapture);
  const openAnnotator = useFeedbackComposer((s) => s.openAnnotator);
  const closeAnnotator = useFeedbackComposer((s) => s.closeAnnotator);
  const removeCapture = useFeedbackComposer((s) => s.removeCapture);
  const setCaptureNote = useFeedbackComposer((s) => s.setCaptureNote);
  const close = useFeedbackComposer((s) => s.close);
  const submit = useSubmitFeedback();
  const [doneNumber, setDoneNumber] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const routeFeature = featureFromRoute(pathname);
  const feature = draft.feature ?? routeFeature;
  const pageOptions = FEEDBACK_PAGE_OPTIONS.some((o) => o.value === routeFeature)
    ? FEEDBACK_PAGE_OPTIONS
    : [{ value: routeFeature, label: "หน้านี้" }, ...FEEDBACK_PAGE_OPTIONS];
  const busy = submit.isPending || uploading;
  const canSend = (!!draft.message.trim() || captures.length > 0) && !busy;

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("แนบได้เฉพาะไฟล์รูปภาพ");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("รูปใหญ่เกิน 10 MB");
      return;
    }
    try {
      addCapture(await readFileAsDataUrl(file));
    } catch {
      toast.error("อ่านรูปไม่สำเร็จ");
    }
  };

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
    if (!canSend || !user) return;
    try {
      setUploading(true);
      let screenshotPath: string | undefined;
      const first = captures[0];
      if (first) {
        screenshotPath = await uploadFeedbackScreenshot(user.id, dataUrlToBlob(first.dataUrl));
      }
      const row = await submit.mutateAsync({
        feature,
        route: pathname,
        kind: draft.kind,
        rating: draft.rating,
        message: withCaptureNotes(draft.message, captures).slice(0, 2000),
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
          "relative flex max-h-[92dvh] w-full max-w-[440px] flex-col overflow-hidden rounded-t-2xl shadow-sm sm:rounded-2xl",
          doneNumber ? "bg-gradient-brand text-white" : "bg-background",
        )}
      >
        {doneNumber ? (
          <div className="relative px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -left-10 -top-16 h-44 w-44 rounded-full bg-white/25 blur-2xl" />
              <div className="absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-warning/10 blur-3xl" />
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
              <h2 className="text-xl font-bold tracking-tight">ได้รับแล้ว ขอบคุณ</h2>
              <p className="mx-auto mt-2 max-w-[18rem] text-[13px] leading-relaxed text-white/90">
                ทีมจะอ่านทุกข้อความ และแจ้งกลับเมื่อนำไปใช้หรือแก้แล้ว
              </p>
              <p className="mt-3 text-sm text-white/80">
                เลขตั๋ว <span className="font-mono font-medium text-white">{doneNumber}</span>
              </p>
              <BetaProgress
                userId={user?.id}
                tone="onBrand"
                className="mx-auto mt-5 max-w-[16rem] rounded-xl bg-white/10 p-3 ring-1 ring-white/20"
              />
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
        <div className="relative px-6 pt-6 pb-2">
          <button
            type="button"
            aria-label="ปิด"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </button>
              <div className="flex items-center gap-2 pr-6">
                <h2 className="text-xl font-bold tracking-tight">มีอะไรอยากบอกเราไหม?</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary">
                  BETA
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                ทุกข้อความช่วยให้ SAMECOR ดีขึ้น — ทีมอ่านเองทุกอัน
              </p>
        </div>

            <div className="space-y-4 overflow-y-auto px-6 py-2">
              <Textarea
                id="feedback-message"
                aria-label="ข้อความฟีดแบ็ก"
                value={draft.message}
                onChange={(e) => patchDraft({ message: e.target.value })}
                placeholder={PLACEHOLDER[draft.kind] ?? PLACEHOLDER.idea}
                rows={4}
                maxLength={2000}
                autoFocus
                className="min-h-[120px] resize-none"
              />

              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="ประเภท">
                {FEEDBACK_KIND_OPTIONS.map((opt) => {
                  const selected = draft.kind === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={opt.hint}
                      onClick={() => patchDraft({ kind: opt.value })}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      {opt.chip}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <p className="text-[13px] font-medium text-muted-foreground">
                  ให้คะแนนประสบการณ์ <span className="font-normal">(ไม่บังคับ)</span>
                </p>
                <div className="flex items-start justify-between gap-1 px-1">
                  {RATINGS.map((r) => {
                    const selected = draft.rating === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        aria-label={r.label}
                        aria-pressed={selected}
                        onClick={() => patchDraft({ rating: selected ? null : r.value })}
                        className="group flex w-14 flex-col items-center gap-1 rounded-xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <MascotMood
                          mood={r.value as MascotMoodValue}
                          className={cn(
                            "h-10 w-10 transition-all duration-200",
                            selected
                              ? "-translate-y-0.5 scale-110 drop-shadow-md"
                              : draft.rating
                                ? "opacity-35 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                                : "opacity-80 group-hover:-translate-y-0.5 group-hover:opacity-100",
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px] leading-none transition-colors",
                            selected ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="feedback-page" className="text-[13px] font-medium text-muted-foreground">
                  เกี่ยวกับหน้า
                </label>
                <select
                  id="feedback-page"
                  value={feature}
                  onChange={(e) => patchDraft({ feature: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {pageOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.value === routeFeature && o.label !== "หน้านี้" ? `${o.label} (หน้านี้)` : o.label}
                    </option>
                  ))}
                </select>
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
                        <input
                          type="text"
                          value={shot.note}
                          onChange={(e) => setCaptureNote(shot.id, e.target.value)}
                          // New capture/upload mounts last — put the cursor straight on its note
                          autoFocus={index === captures.length - 1}
                          maxLength={200}
                          aria-label={`โน้ตภาพที่ ${index + 1}`}
                          placeholder={`ภาพ ${index + 1} — พิมพ์โน้ตสั้นๆ`}
                          className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition-colors placeholder:text-muted-foreground hover:border-border focus:border-ring focus:bg-background"
                        />
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
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={startSnip}>
                    <Camera className="mr-2 h-4 w-4" />
                    แคปหน้าจอ
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    แนบรูป
                  </Button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void onPickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <p className="flex items-start gap-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                  แนบข้อมูลเบราว์เซอร์ ขนาดจอ เวอร์ชันแอป และ error ล่าสุดให้อัตโนมัติ เพื่อช่วยแก้ปัญหา —
                  ไม่มีรหัสผ่านหรือข้อความแชท
                </p>
              </div>
            </div>

            <div className="px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
              <Button className="mx-auto flex h-11 w-40" disabled={!canSend} onClick={() => void send()}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                ส่งฟีดแบ็ก
              </Button>
            </div>
          </>
        )}
      </div>
      {annotatingId ? <FeedbackAnnotateDialog /> : null}
    </div>
  );
}
