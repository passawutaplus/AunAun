import * as React from "react";
import { toast } from "sonner";
import { MEETING_LIMITS, formatDuration } from "@/lib/meetingCaptureSchema";

export type RecorderMode = "audio" | "screen";

export type RecorderState = {
  recording: boolean;
  paused: boolean;
  elapsedSec: number;
  elapsedMs: number;
  blob: Blob | null;
  mimeType: string;
};

export function useMediaRecorder(mode: RecorderMode, maxSec: number) {
  const [state, setState] = React.useState<RecorderState>({
    recording: false,
    paused: false,
    elapsedSec: 0,
    elapsedMs: 0,
    blob: null,
    mimeType: mode === "audio" ? "audio/webm" : "video/webm",
  });
  const [activeStream, setActiveStream] = React.useState<MediaStream | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = React.useRef(0);
  const pausedTotalRef = React.useRef(0);
  const pauseStartRef = React.useRef(0);
  const cancelledRef = React.useRef(false);

  const elapsedMsNow = React.useCallback(() => {
    let ms = Date.now() - startTimeRef.current - pausedTotalRef.current;
    if (pauseStartRef.current > 0) {
      ms -= Date.now() - pauseStartRef.current;
    }
    return Math.max(0, ms);
  }, []);

  const cleanup = React.useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActiveStream(null);
    mediaRecorderRef.current = null;
    pauseStartRef.current = 0;
  }, []);

  React.useEffect(() => () => cleanup(), [cleanup]);

  const stop = React.useCallback(() => {
    cancelledRef.current = false;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setState((s) => ({ ...s, recording: false, paused: false }));
  }, []);

  const cancel = React.useCallback(() => {
    cancelledRef.current = true;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    chunksRef.current = [];
    cleanup();
    pausedTotalRef.current = 0;
    setState((s) => ({
      ...s,
      recording: false,
      paused: false,
      elapsedSec: 0,
      elapsedMs: 0,
      blob: null,
    }));
  }, [cleanup]);

  const pause = React.useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "recording") return;
    if (typeof mr.pause !== "function") {
      toast.info("เบราว์เซอร์นี้ยังไม่รองรับ Pause — ใช้หยุดอัดแทน");
      return;
    }
    mr.pause();
    pauseStartRef.current = Date.now();
    setState((s) => ({ ...s, paused: true }));
  }, []);

  const resume = React.useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state !== "paused") return;
    if (pauseStartRef.current > 0) {
      pausedTotalRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
    mr.resume();
    setState((s) => ({ ...s, paused: false }));
  }, []);

  const start = React.useCallback(async () => {
    try {
      chunksRef.current = [];
      cancelledRef.current = false;
      pausedTotalRef.current = 0;
      pauseStartRef.current = 0;
      let stream: MediaStream;

      if (mode === "audio") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const audioTracks = display.getAudioTracks();
        if (audioTracks.length === 0) {
          toast.error("ไม่พบเสียงแท็บ — เลือกแท็บประชุมและติ๊ก Share tab audio");
        }
        stream = display;
      }

      streamRef.current = stream;
      setActiveStream(stream);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? mode === "audio"
          ? "audio/webm;codecs=opus"
          : "video/webm;codecs=vp9,opus"
        : mode === "audio"
          ? "audio/webm"
          : "video/webm";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        if (cancelledRef.current) {
          cancelledRef.current = false;
          cleanup();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mimeType.split(";")[0] });
        const elapsed = Math.round(elapsedMsNow() / 1000);
        setState((s) => ({
          ...s,
          blob,
          mimeType: mimeType.split(";")[0],
          elapsedSec: elapsed,
          elapsedMs: elapsedMsNow(),
          recording: false,
          paused: false,
        }));
        cleanup();
      };

      mr.start(1000);
      startTimeRef.current = Date.now();
      setState({
        recording: true,
        paused: false,
        elapsedSec: 0,
        elapsedMs: 0,
        blob: null,
        mimeType: mimeType.split(";")[0],
      });

      timerRef.current = setInterval(() => {
        const ms = elapsedMsNow();
        const elapsed = Math.round(ms / 1000);
        setState((s) => ({ ...s, elapsedSec: elapsed, elapsedMs: ms }));
        if (elapsed >= maxSec) {
          toast.info(`อัดครบ ${formatDuration(maxSec)} — หยุดอัตโนมัติ`);
          stop();
        }
      }, 50);
    } catch (e) {
      cleanup();
      const msg = e instanceof Error ? e.message : "ไม่สามารถเริ่มอัดได้";
      toast.error(msg);
      throw e;
    }
  }, [mode, maxSec, cleanup, stop, elapsedMsNow]);

  return { state, activeStream, start, stop, pause, resume, cancel, cleanup };
}

/** Read duration from audio/video file without uploading. */
export function readMediaDurationSec(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = el.duration;
      if (!Number.isFinite(d) || d <= 0) {
        reject(new Error("อ่านความยาวไฟล์ไม่ได้"));
        return;
      }
      resolve(Math.ceil(d));
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("อ่านไฟล์ไม่ได้"));
    };
    el.src = url;
  });
}

export function freeTierMaxSec() {
  return MEETING_LIMITS.freeMaxSec;
}
