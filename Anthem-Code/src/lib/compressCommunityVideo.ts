import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const MAX_INPUT_MB = 80;
const TARGET_MB = 12;
const SKIP_COMPRESS_BELOW_MB = 10;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(onProgress?: (pct: number) => void): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    if (onProgress) {
      instance.on("progress", ({ progress }) => {
        onProgress(Math.min(99, Math.round(progress * 100)));
      });
    }
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = instance;
    return instance;
  })();

  return loadPromise;
}

function extFromType(type: string, name: string): string {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && ["mp4", "webm", "mov", "m4v"].includes(fromName)) return fromName;
  if (type.includes("webm")) return "webm";
  if (type.includes("quicktime")) return "mov";
  return "mp4";
}

/** Client-side transcode for community uploads — skips if already small enough. */
export async function compressCommunityVideo(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<File> {
  if (!file.type.startsWith("video/")) throw new Error("ไฟล์ไม่ใช่วิดีโอ");
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`วิดีโอใหญ่เกิน ${MAX_INPUT_MB}MB`);
  }
  if (file.size <= SKIP_COMPRESS_BELOW_MB * 1024 * 1024) {
    return file;
  }

  onProgress?.(0);
  const ff = await getFfmpeg(onProgress);
  const inputExt = extFromType(file.type, file.name);
  const inputName = `input.${inputExt}`;
  const outputName = "output.mp4";

  await ff.writeFile(inputName, await fetchFile(file));

  await ff.exec([
    "-i",
    inputName,
    "-vf",
    "scale='min(1280,iw)':-2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const blob = new Blob([data], { type: "video/mp4" });
  let out = new File([blob], file.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });

  if (out.size > TARGET_MB * 1024 * 1024) {
    await ff.writeFile(inputName, await fetchFile(out));
    await ff.exec([
      "-i",
      inputName,
      "-vf",
      "scale='min(960,iw)':-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "32",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-movflags",
      "+faststart",
      outputName,
    ]);
    const data2 = await ff.readFile(outputName);
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);
    out = new File([new Blob([data2], { type: "video/mp4" })], out.name, { type: "video/mp4" });
  }

  onProgress?.(100);

  if (out.size > 15 * 1024 * 1024) {
    throw new Error("วิดีโอยังใหญ่เกิน 15MB หลังบีบอัด — ลองคลิปสั้นลง");
  }

  return out;
}
