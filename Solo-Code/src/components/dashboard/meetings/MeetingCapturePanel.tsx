import * as React from "react";
import {
  ArrowLeft,
  Loader2,
  Monitor,
  Upload,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { BriefClientInfo } from "@/lib/briefSchema";
import type { MeetingMode, MeetingSourceType } from "@/lib/meetingCaptureSchema";
import {
  formatDuration,
  maxDurationForSource,
  MEETING_LIMITS,
} from "@/lib/meetingCaptureSchema";
import {
  meetingReportCredits,
  meetingTotalCredits,
} from "@/lib/meetingCredits";
import { uploadMeetingMedia } from "@/lib/uploadMeetingMedia";
import { aiMeetingTranscribe } from "@/lib/aiMeetingTranscribe.functions";
import { aiMeetingReport } from "@/lib/aiMeetingReport.functions";
import { ClientPicker } from "@/components/dashboard/briefs/ClientPicker";
import { TranscriptReviewPanel } from "@/components/dashboard/briefs/TranscriptReviewPanel";
import { readMediaDurationSec, useMediaRecorder } from "@/components/dashboard/briefs/useMediaRecorder";
import { useSubscription } from "@/hooks/useSubscription";
import { MeetingReportView } from "./MeetingReportView";
import { MeetingRecordStartCard } from "./MeetingRecordStartCard";
import { MeetingRecordingScreen } from "./MeetingRecordingScreen";
import type { MeetingCaptureRow } from "./MeetingReportPdfTemplate";

type Step = "mode" | "capture" | "processing" | "transcript" | "report";

export function MeetingCapturePanel({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: (capture: MeetingCaptureRow) => void;
}) {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const transcribeFn = useServerFn(aiMeetingTranscribe);
  const reportFn = useServerFn(aiMeetingReport);

  const [step, setStep] = React.useState<Step>("mode");
  const [mode, setMode] = React.useState<MeetingMode | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [clientInfo, setClientInfo] = React.useState<BriefClientInfo>({});
  const [captureId, setCaptureId] = React.useState<string | null>(null);
  const [durationSec, setDurationSec] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [transcript, setTranscript] = React.useState("");
  const [reportMarkdown, setReportMarkdown] = React.useState("");
  const [transcribeCreditsUsed, setTranscribeCreditsUsed] = React.useState(0);
  const [createdAt, setCreatedAt] = React.useState(new Date().toISOString());

  const isFree = tier === "free";
  const maxSec = mode
    ? maxDurationForSource(
        mode === "online" ? "video_record" : "audio_record",
        isFree,
      )
    : MEETING_LIMITS.audioMaxSec;

  const recorderMode = mode === "online" ? "screen" : "audio";
  const {
    state: recState,
    activeStream,
    start: startRec,
    stop: stopRec,
    pause: pauseRec,
    resume: resumeRec,
    cancel: cancelRec,
  } = useMediaRecorder(recorderMode, maxSec);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const processedBlobRef = React.useRef<Blob | null>(null);
  const [liveTranscriptDraft, setLiveTranscriptDraft] = React.useState("");

  const discardRecording = () => {
    cancelRec();
    setLiveTranscriptDraft("");
  };

  const pickMode = (m: MeetingMode) => {
    setMode(m);
    setStep("capture");
  };

  const createCaptureRow = async (st: MeetingSourceType) => {
    if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
    const { data, error } = await (supabase as any)
      .from("meeting_captures")
      .insert({
        user_id: user.id,
        client_id: clientInfo.client_id ?? null,
        title: title.trim() || null,
        source_type: st,
        status: "uploading",
      })
      .select("id, created_at")
      .single();
    if (error || !data) throw new Error(error?.message ?? "สร้างรายการไม่สำเร็จ");
    setCreatedAt(data.created_at);
    return data.id as string;
  };

  const processMedia = async (file: Blob, fileName: string, mime: string, st: MeetingSourceType) => {
    if (!user || !consent) {
      toast.error("กรุณายืนยันความยินยอมก่อนอัปโหลด");
      return;
    }
    setBusy(true);
    setStep("processing");
    setProgress(15);
    try {
      let dur = durationSec;
      if (file instanceof File && dur <= 0) {
        dur = await readMediaDurationSec(file);
      }
      if (recState.elapsedSec > 0) dur = recState.elapsedSec;

      const cap = maxDurationForSource(st, isFree);
      if (dur > cap) {
        throw new Error(
          isFree
            ? "แผน Free ใช้ได้สูงสุด 15 นาที — อัปเกรด Pro เพื่ออัดนานขึ้น"
            : `ไฟล์ยาวเกิน ${formatDuration(cap)}`,
        );
      }
      setDurationSec(dur);

      const id = await createCaptureRow(st);
      setCaptureId(id);
      setProgress(40);

      const uploaded = await uploadMeetingMedia({
        file,
        fileName,
        mimeType: mime,
        userId: user.id,
        captureId: id,
        sourceType: st,
      });

      await (supabase as any)
        .from("meeting_captures")
        .update({
          media_path: uploaded.path,
          media_mime: mime,
          file_size_bytes: uploaded.size,
          duration_sec: dur,
          status: "transcribing",
        })
        .eq("id", id);

      setProgress(55);
      const tx = await transcribeFn({
        data: {
          captureId: id,
          sourceType: st,
          durationSec: dur,
        },
      });
      setProgress(100);
      setTranscript(tx.transcript || liveTranscriptDraft);
      setTranscribeCreditsUsed(tx.creditsUsed);
      setStep("transcript");
      toast.success("ถอดเสียงเสร็จแล้ว — ตรวจและแก้ก่อนสรุปรายงาน");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ประมวลผลไม่สำเร็จ";
      toast.error(msg);
      setStep("capture");
    } finally {
      setBusy(false);
    }
  };

  const onFilePicked = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const st: MeetingSourceType =
      mode === "online"
        ? file.type.startsWith("video/")
          ? "video_upload"
          : "audio_upload"
        : "audio_upload";
    await processMedia(file, file.name, file.type || "audio/m4a", st);
  };

  const onRecordingDone = async () => {
    if (!recState.blob) return;
    const st: MeetingSourceType = mode === "online" ? "video_record" : "audio_record";
    const ext = recState.mimeType.includes("video") ? "webm" : "webm";
    await processMedia(recState.blob, `recording.${ext}`, recState.mimeType, st);
  };

  React.useEffect(() => {
    if (!recState.blob || recState.recording) return;
    if (processedBlobRef.current === recState.blob) return;
    processedBlobRef.current = recState.blob;
    void onRecordingDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recState.blob, recState.recording]);

  const runReport = async () => {
    if (!captureId || !transcript.trim()) return;
    setBusy(true);
    try {
      const res = await reportFn({ data: { captureId, transcript } });
      setReportMarkdown(res.reportMarkdown);
      setStep("report");
      toast.success("สรุปรายงานแล้ว — ตรวจและบันทึกได้");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สรุปรายงานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = () => {
    if (!captureId || !user) return;
    const row: MeetingCaptureRow = {
      id: captureId,
      user_id: user.id,
      client_id: clientInfo.client_id ?? null,
      title: title.trim() || null,
      source_type: mode === "online" ? "video_record" : "audio_record",
      duration_sec: durationSec,
      status: "ready",
      transcript,
      report_markdown: reportMarkdown,
      extract_result: null,
      brief_id: null,
      error_message: null,
      created_at: createdAt,
      updated_at: new Date().toISOString(),
    };
    onDone(row);
  };

  const estCredits = durationSec > 0 ? meetingTotalCredits(durationSec) : meetingTotalCredits(900);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">บันทึกการประชุมใหม่</h2>
          <p className="text-[11px] text-muted-foreground">
            อัดหรืออัปโหลดการประชุม → AI ถอดเสียงและสรุปรายงานให้อ่าน
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ยกเลิก
        </Button>
      </div>

      {step === "mode" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => pickMode("onsite")}
            className="rounded-2xl border border-border p-4 text-left hover:border-primary/50 transition"
          >
            <MapPin className="h-5 w-5 text-primary mb-2" />
            <p className="font-semibold text-sm">ประชุมหน้างาน</p>
            <p className="text-xs text-muted-foreground mt-1">
              อัปโหลดไฟล์เสียง หรืออัดเสียงในแอป — เหมาะคุยลูกค้าที่ร้าน / café
            </p>
          </button>
          <button
            type="button"
            onClick={() => pickMode("online")}
            className="rounded-2xl border border-border p-4 text-left hover:border-primary/50 transition"
          >
            <Monitor className="h-5 w-5 text-primary mb-2" />
            <p className="font-semibold text-sm">ประชุมออนไลน์</p>
            <p className="text-xs text-muted-foreground mt-1">
              อัดหน้าจอ+เสียง หรืออัปโหลดวิดีโอ — Zoom / Meet / Teams บน PC
            </p>
          </button>
        </div>
      )}

      {step === "capture" && mode && (
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => setStep("mode")}>
            <ArrowLeft className="h-4 w-4" /> กลับ
          </Button>

          {mode === "online" && (
            <p className="text-xs text-muted-foreground rounded-xl bg-muted/40 p-3">
              เลือกแท็บ Meet/Zoom แล้วติ๊ก &quot;แชร์เสียงแท็บ&quot;
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-xs">
                การบันทึกเสียง/วิดีโอจะถูกอัปโหลดและประมวลผลด้วย AI เพื่อถอดเสียงและสรุปรายงาน
              </p>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="meeting-consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                />
                <Label htmlFor="meeting-consent" className="text-xs font-normal cursor-pointer">
                  ฉันได้รับความยินยอมจากลูกค้า/ผู้เข้าร่วมประชุมแล้ว
                </Label>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">ชื่องาน (ไม่บังคับ)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น คุยบรีฟโลโก้ร้าน Bloom" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ลูกค้า (ไม่บังคับ)</Label>
              <ClientPicker value={clientInfo} onPick={setClientInfo} />
            </div>
          </div>

          <MeetingRecordStartCard
            modeLabel={mode === "online" ? "Screen + Audio" : "On-site"}
            maxLabel={`สูงสุด ${formatDuration(maxSec)}${isFree ? " · Free ≤15 นาที" : ""}`}
            disabled={!consent || busy || recState.recording}
            onStart={() => void startRec()}
          />

          <MeetingRecordingScreen
            open={recState.recording || recState.paused}
            elapsedMs={recState.elapsedMs}
            paused={recState.paused}
            stream={activeStream}
            modeLabel="Recording"
            onBack={discardRecording}
            onDiscard={discardRecording}
            onPauseToggle={() => (recState.paused ? resumeRec() : pauseRec())}
            onFinish={stopRec}
            onTranscriptChange={setLiveTranscriptDraft}
          />

          <div className="text-center text-xs text-muted-foreground">— หรือ —</div>

          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={!consent || busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {mode === "online" ? "อัปโหลดวิดีโอ/เสียง" : "อัปโหลดไฟล์เสียง"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept={mode === "online" ? "audio/*,video/*,.m4a,.mp3,.wav,.webm,.mp4" : "audio/*,.m4a,.mp3,.wav,.webm"}
            onChange={(e) => void onFilePicked(e.target.files)}
          />

          <p className="text-[10px] text-muted-foreground text-center">
            ใช้ประมาณ {estCredits} เครดิต (ถอดเสียง + สรุปรายงาน)
            {isFree && " · ครั้งแรกในเดือนนี้ฟรีถ้า ≤15 นาที"}
          </p>
        </div>
      )}

      {step === "processing" && (
        <div className="rounded-2xl border border-border p-8 text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="font-medium">กำลังถอดเสียง…</p>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">ประมาณ 2–5 นาที · ปิดหน้านี้ได้</p>
        </div>
      )}

      {step === "transcript" && (
        <TranscriptReviewPanel
          transcript={transcript}
          onChange={setTranscript}
          transcribeCredits={transcribeCreditsUsed}
          reportCredits={meetingReportCredits(durationSec || 900)}
          onSummarize={() => void runReport()}
          busy={busy}
          recordedAt={createdAt}
        />
      )}

      {step === "report" && captureId && user && (
        <MeetingReportView
          capture={{
            id: captureId,
            user_id: user.id,
            client_id: clientInfo.client_id ?? null,
            title: title.trim() || null,
            source_type: mode === "online" ? "video_record" : "audio_record",
            duration_sec: durationSec,
            status: "ready",
            transcript,
            report_markdown: reportMarkdown,
            extract_result: null,
            brief_id: null,
            error_message: null,
            created_at: createdAt,
            updated_at: new Date().toISOString(),
          }}
          reportMarkdown={reportMarkdown}
          onReportChange={setReportMarkdown}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
