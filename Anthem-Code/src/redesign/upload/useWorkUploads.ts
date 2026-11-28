import { useCallback, useEffect, useRef, useState } from "react";
import { useSubscription } from "@/core/subscription";
import { measureImage } from "@/lib/imageSize";
import { isGifFile } from "@/lib/uploadProjectGif";
import { UPLOAD_STAGE } from "@/lib/uploadProgress";
import { uploadWorkFile, WORK_FILE_MAX_BYTES } from "@/server/mutations/upload";
import type { Media } from "./model";

/** Longest side after the old pipeline's compression (lib/uploadImage: maxWidthOrHeight 1920). */
const COMPRESSED_MAX = 1920;
const UPLOAD_LABELS: ReadonlySet<string> = new Set([UPLOAD_STAGE.uploadingImage, UPLOAD_STAGE.uploadingVideo, UPLOAD_STAGE.uploadingGif]);

const TOO_BIG = "ไฟล์เกิน 20 MB";
const FAILED = "อัปโหลดไม่สำเร็จ";

const scaled = (s: [number, number], gif: boolean): [number, number] => {
  const k = gif ? 1 : Math.min(1, COMPRESSED_MAX / Math.max(s[0], s[1]));
  return [Math.max(1, Math.round(s[0] * k)), Math.max(1, Math.round(s[1] * k))];
};

/**
 * Pictures and videos of the work being edited: uploads with progress, retry, and their sizes
 * (recorded at upload, so the site never has to guess a picture's shape — mock rule "ห้ามครอป").
 */
export function useWorkUploads(uid: string, folder: string, initial: Record<string, Media> = {}) {
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
  const aborts = useRef(new Set<AbortController>());
  const folderRef = useRef(folder);
  useEffect(() => {
    folderRef.current = folder;
  }, [folder]);

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

  const start = useCallback(
    (id: string, file: File) => {
      files.current.set(id, file);
      const gif = isGifFile(file);
      const kind: Media["kind"] = file.type.startsWith("video/") ? "video" : "image";
      if (file.size > WORK_FILE_MAX_BYTES) {
        setMedia((m) => ({ ...m, [id]: { kind, url: "", size: null, progress: null, error: TOO_BIG, name: file.name } }));
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
      aborts.current.add(ac);
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
      const job = uploadWorkFile(file, uid, folderRef.current, tier, reporter, ac.signal)
        .then(async (res) => {
          // HEIC and some formats do not open as a blob in every browser: measure the uploaded copy then.
          const size = res.kind === "image" ? measured ?? (await measureImage(res.url)) : null;
          patch(id, { kind: res.kind, url: res.url, ...(res.poster ? { poster: res.poster } : {}), size, progress: null, error: undefined });
        })
        .catch((e: unknown) => {
          if (ac.signal.aborted) return;
          const msg = e instanceof Error && e.message ? e.message : FAILED;
          patch(id, { progress: null, error: msg });
        })
        .finally(() => {
          aborts.current.delete(ac);
          jobs.current.delete(id);
        });
      jobs.current.set(id, job);
    },
    [uid, tier, patch, setMedia],
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

  /** Media of an opened work, or a fresh start. */
  const replaceAll = useCallback(
    (m: Record<string, Media>) => {
      files.current.clear();
      setMedia(() => m);
    },
    [setMedia],
  );

  /** The newest media, also from inside an async step. */
  const latest = useCallback(() => now.current, []);

  const uploading = Object.values(media).some((m) => m.progress != null);
  return { media, latest, start, retry, settle, replaceAll, uploading };
}
