/** Capture a still frame from a local video file for use as poster/thumbnail. */

const DEFAULT_SEEK_SEC = 0.25;
const MAX_EDGE = 1280;

function loadVideo(objectUrl: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = objectUrl;

    const fail = (msg: string) => {
      cleanup();
      reject(new Error(msg));
    };

    const cleanup = () => {
      video.onloadeddata = null;
      video.onerror = null;
      video.onseeked = null;
    };

    video.onerror = () => fail("อ่านวิดีโอเพื่อสร้าง thumbnail ไม่สำเร็จ");
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seekTo =
        duration > 0 ? Math.min(DEFAULT_SEEK_SEC, Math.max(0, duration * 0.05)) : DEFAULT_SEEK_SEC;

      const finish = () => {
        cleanup();
        resolve(video);
      };

      if (seekTo <= 0.01) {
        finish();
        return;
      }

      video.onseeked = finish;
      try {
        video.currentTime = seekTo;
      } catch {
        finish();
      }
    };
  });
}

function drawPosterBlob(video: HTMLVideoElement): Promise<Blob> {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (vw < 2 || vh < 2) {
    return Promise.reject(new Error("วิดีโอยังไม่มีเฟรมภาพ"));
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh));
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("สร้าง thumbnail ไม่สำเร็จ"));
  ctx.drawImage(video, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("สร้าง thumbnail ไม่สำเร็จ"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.88,
    );
  });
}

/** Extract a JPEG poster frame from a video File (client-side). */
export async function extractVideoPosterFile(file: File): Promise<File> {
  if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov)$/i.test(file.name)) {
    throw new Error("ไฟล์ไม่ใช่วิดีโอ");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const video = await loadVideo(objectUrl);
    try {
      const blob = await drawPosterBlob(video);
      const base = file.name.replace(/\.[^.]+$/, "") || "video";
      return new File([blob], `${base}-poster.jpg`, { type: "image/jpeg" });
    } finally {
      video.removeAttribute("src");
      video.load();
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
