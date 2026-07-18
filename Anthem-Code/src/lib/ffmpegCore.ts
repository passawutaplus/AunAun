import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

/** Local (self-hosted) core first, public CDN as fallback if it 404s/blocked. */
const CORE_SOURCES = [
  `${import.meta.env.BASE_URL}ffmpeg`,
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm",
];

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
let progressCb: ((pct: number) => void) | null = null;

async function loadCore(instance: FFmpeg): Promise<void> {
  let lastErr: unknown;
  for (const baseURL of CORE_SOURCES) {
    try {
      await instance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("โหลดตัวแปลงสื่อไม่สำเร็จ");
}

/** Shared ffmpeg.wasm instance (loaded once, reused for video/gif transcode). */
export async function getSharedFfmpeg(onProgress?: (pct: number) => void): Promise<FFmpeg> {
  progressCb = onProgress ?? null;
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    instance.on("progress", ({ progress }) => {
      progressCb?.(Math.min(99, Math.round(progress * 100)));
    });
    try {
      await loadCore(instance);
    } catch {
      loadPromise = null;
      throw new Error("โหลดตัวแปลงสื่อไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง");
    }
    ffmpeg = instance;
    return instance;
  })();

  return loadPromise;
}

/** Terminate a stuck instance so the next attempt starts clean. */
export function resetSharedFfmpeg(): void {
  try {
    ffmpeg?.terminate();
  } catch {
    /* ignore */
  }
  ffmpeg = null;
  loadPromise = null;
  progressCb = null;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      resetSharedFfmpeg();
      reject(new Error(message));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
