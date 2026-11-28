import { useCallback, useEffect, useRef, useState } from "react";
import { useSubscription } from "@/core/subscription";
import { measureImage } from "@/lib/imageSize";
import { isGifFile } from "@/lib/uploadProjectGif";
import { UPLOAD_STAGE } from "@/lib/uploadProgress";
import { isVideoFile } from "@/lib/videoAccept";
import { uploadWorkFile } from "@/server/mutations/upload";
import type { Media } from "./model";

/** Longest side after the old pipeline's compression (lib/uploadImage: maxWidthOrHeight 1920). */
const COMPRESSED_MAX = 1920;
const UPLOAD_LABELS: ReadonlySet<string> = new Set([UPLOAD_STAGE.uploadingImage, UPLOAD_STAGE.uploadingVideo, UPLOAD_STAGE.uploadingGif]);

const TOO_BIG = "ไฟล์เกิน 20 MB";
const FAILED = "อัปโหลดไม่สำเร็จ";
/** A block or slot taken away while its file was going up (Undo brings it back with Retry). */
const CANCELLED = "ยกเลิกแล้ว";

const scaled = (s: [number, number], gif: boolean): [number, number] => {
  const k = gif ? 1 : Math.min(1, COMPRESSED_MAX / Math.max(s[0], s[1]));
  return [Math.max(1, Math.round(s[0] * k)), Math.max(1, Math.round(s[1] * k))];
};

/**
 * Pictures and videos of the work being edited: uploads with progress, retry, and their sizes
 * (recorded at upload, so the site never has to guess a picture's shape — mock rule "ห้ามครอป").
 */
export type WorkUploadOptions = {
  /**
   * Largest file accepted, checked before anything runs, and the row's message when a file is bigger.
   * Without it the pipeline decides: a work's 20 MB applies to the compressed file (uploadWorkFile).
   */
  maxBytes?: number;
  tooBig?: string;
  /** Another pipeline for the bytes (EventPost: pictures only, into the events folder). */
  upload?: typeof uploadWorkFile;
};

export function useWorkUploads(uid: string, folder: string, initial: Record<string, Media> = {}, opts: WorkUploadOptions = {}) {
  const { tier } = useSubscription();
  const [media, setMediaState] = useState<Record<string, Media>>(initial);
  // Mirror updated at once, so a save right after an upload finishes sees it (state lands a render later).
  const now = useRef(media);
  const setMedia = useCallback((fn: (m: Record<string, Media>) => Record<string, Media>) => {
    now.current = fn(now.current);
    setMediaState(now.current);
  }, []);
  const files = useRef(new Map<string, File>());
  const jobs = useRef(new Map<string, Promise<void>>());
  const aborts = useRef(new Map<string, AbortController>());
  const folderRef = useRef(folder);
  const optsRef = useRef(opts);
  useEffect(() => {
    folderRef.current = folder;
  }, [folder]);
  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    const running = aborts.current;
    return () => running.forEach((a) => a.abort());
  }, []);

  const patch = useCallback(
    (id: string, p: Partial<Media>) => {
      setMedia((m) => (m[id] ? { ...m, [id]: { ...m[id], ...p } } : m));
    },
    [setMedia],
  );

  /** Stops the upload of `id` (if any): nothing waits for it and its result is dropped. */
  const stop = useCallback((id: string) => {
    aborts.current.get(id)?.abort();
    aborts.current.delete(id);
    jobs.current.delete(id);
  }, []);

  const start = useCallback(
    (id: string, file: File) => {
      stop(id);
      files.current.set(id, file);
      const gif = isGifFile(file);
      const kind: Media["kind"] = isVideoFile(file) ? "video" : "image";
      const max = optsRef.current.maxBytes;
      if (max != null && file.size > max) {
        setMedia((m) => ({ ...m, [id]: { kind, url: "", size: null, progress: null, error: optsRef.current.tooBig ?? TOO_BIG, name: file.name } }));
        return;
      }
      const preview = URL.createObjectURL(file);
      setMedia((m) => ({ ...m, [id]: { kind, url: "", preview, size: null, progress: 0, name: file.name } }));

      let measured: [number, number] | null = null;
      if (kind === "image") {
        void measureImage(preview).then((s) => {
          if (!s) return;
          measured = scaled(s, gif);
          patch(id, { size: measured });
        });
      }

      const ac = new AbortController();
      aborts.current.set(id, ac);
      let sending = false;
      const reporter = {
        onStage: (label: string) => {
          sending = UPLOAD_LABELS.has(label);
        },
        // Preparing the file is the first 40%, sending it the rest (one bar, as the mock).
        onPercent: (pct: number) => {
          const p = Math.max(0, Math.min(100, pct));
          patch(id, { progress: Math.round(sending ? 40 + p * 0.6 : p * 0.4) });
        },
      };
      const job = (optsRef.current.upload ?? uploadWorkFile)(file, uid, folderRef.current, tier, reporter, ac.signal)
        .then(async (res) => {
          if (ac.signal.aborted) return;
          // HEIC and some formats do not open as a blob in every browser: measure the uploaded copy then.
          const size = res.kind === "image" ? measured ?? (await measureImage(res.url)) : null;
          if (ac.signal.aborted) return;
          patch(id, { kind: res.kind, url: res.url, ...(res.poster ? { poster: res.poster } : {}), size, progress: null, error: undefined });
        })
        .catch((e: unknown) => {
          if (ac.signal.aborted) return;
          const msg = e instanceof Error && e.message ? e.message : FAILED;
          patch(id, { progress: null, error: msg });
        })
        .finally(() => {
          // Still this upload (not a newer retry of the same block): it is done.
          if (aborts.current.get(id) !== ac) return;
          aborts.current.delete(id);
          jobs.current.delete(id);
        });
      // A stopped upload must not hold Publish: the wait ends at once even if a step (compression) runs on.
      jobs.current.set(id, Promise.race([job, new Promise<void>((r) => ac.signal.addEventListener("abort", () => r(), { once: true }))]));
    },
    [uid, tier, patch, setMedia, stop],
  );

  /** The block or slot of `id` is gone: stop its upload; the row shows "ยกเลิกแล้ว" + Retry if Undo brings it back. */
  const cancel = useCallback(
    (id: string) => {
      if (!aborts.current.has(id)) return;
      stop(id);
      patch(id, { progress: null, error: CANCELLED });
    },
    [stop, patch],
  );

  const retry = useCallback(
    (id: string) => {
      const f = files.current.get(id);
      if (f) start(id, f);
    },
    [start],
  );

  /** Waits for every upload that is still running (Publish, leaving). */
  const settle = useCallback(async () => {
    while (jobs.current.size) await Promise.allSettled([...jobs.current.values()]);
  }, []);

  /** Media of an opened work, or a fresh start (uploads still running are stopped). */
  const replaceAll = useCallback(
    (m: Record<string, Media>) => {
      [...aborts.current.keys()].forEach(stop);
      files.current.clear();
      setMedia(() => m);
    },
    [setMedia, stop],
  );

  /** The newest media, also from inside an async step. */
  const latest = useCallback(() => now.current, []);

  const uploading = Object.values(media).some((m) => m.progress != null);
  return { media, latest, start, retry, cancel, settle, replaceAll, uploading };
}
