import { fetchFile } from "@ffmpeg/util";
import { isVideoFile } from "@/lib/videoAccept";
import { getSharedFfmpeg, resetSharedFfmpeg, withTimeout } from "@/lib/ffmpegCore";
import { repairMp4Container } from "@/lib/repairMp4Container";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

const MAX_INPUT_MB = 300;
/** Final upload ceiling after compression (matches uploadVideo). */
const MAX_OUTPUT_MB = 50;
/** Trigger a second, harder pass when the first output is still above this. */
const TARGET_MB = 45;
/** Already-web-friendly H.264 mp4 below this size skips transcoding entirely. */
const SKIP_COMPRESS_BELOW_MB = 20;
/** Abort a stuck transcode so the user can retry instead of hanging forever. */
const TRANSCODE_TIMEOUT_MS = 5 * 60_000;

function extFromType(type: string, name: string): string {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (
    fromName &&
    ["mp4", "webm", "mov", "m4v", "avi", "mkv", "ogv", "mpeg", "mpg", "3gp", "3g2"].includes(fromName)
  ) {
    return fromName === "3g2" ? "3gp" : fromName;
  }
  if (type.includes("webm")) return "webm";
  if (type.includes("quicktime")) return "mov";
  if (type.includes("matroska")) return "mkv";
  if (type.includes("avi")) return "avi";
  return "mp4";
}

function isWebFriendlyMp4(file: File): boolean {
  return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
}

function mapTranscodeError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/moov|invalid data|does not contain any stream/i.test(msg)) {
    return new Error(
      "ไฟล์วิดีโอเสียหรืออ่านไม่ได้ — ลองส่งออกจากแอปกล้องใหม่ หรือแปลงเป็น MP4 (H.264) ก่อนอัป",
    );
  }
  if (err instanceof Error) return err;
  return new Error(msg || "แปลงวิดีโอไม่สำเร็จ");
}

/** Client-side prepare+transcode — repairs broken mdat/moov, forces HEVC→H.264. */
export async function compressCommunityVideo(
  file: File,
  reporter?: UploadStageReporter,
): Promise<File> {
  if (!isVideoFile(file)) throw new Error("ไฟล์ไม่ใช่วิดีโอ");
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`วิดีโอใหญ่เกิน ${MAX_INPUT_MB}MB — ลองคลิปสั้นลงหรือย่อก่อนอัป`);
  }

  reporter?.onStage?.(UPLOAD_STAGE.checkingVideo);

  // Some phone/web-capture MP4s write mdat size so it swallows trailing moov
  // (players/ffmpeg say "moov atom not found"). Repair before anything else.
  // Also detect HEVC so we never skip re-encode (Chrome/Windows often can't play it).
  const prepared = await repairMp4Container(file);
  const source = prepared.file;
  const isHevc = prepared.reason?.includes("hevc") ?? false;

  if (prepared.repaired) {
    reporter?.onStage?.(UPLOAD_STAGE.repairingVideo);
  }

  // Fast path only for already-safe H.264 mp4 under the soft ceiling.
  if (
    !prepared.needsTranscode &&
    isWebFriendlyMp4(source) &&
    source.size <= SKIP_COMPRESS_BELOW_MB * 1024 * 1024
  ) {
    return source;
  }

  reporter?.onStage?.(UPLOAD_STAGE.preparingTranscoder);
  const ff = await getSharedFfmpeg(reporter?.onPercent);
  const inputExt = extFromType(source.type, source.name);
  const inputName = `input.${inputExt}`;
  const outputName = "output.mp4";

  try {
    await ff.writeFile(inputName, await fetchFile(source));

    reporter?.onStage?.(isHevc ? UPLOAD_STAGE.transcodingHevc : UPLOAD_STAGE.compressingVideo);
    await withTimeout(
      ff.exec([
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
      ]),
      TRANSCODE_TIMEOUT_MS,
      "แปลงวิดีโอนานเกินไป — ลองคลิปสั้นลงหรืออัปจากเครื่องที่แรงกว่า",
    );

    const data = await ff.readFile(outputName);
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);

    const blob = new Blob([data], { type: "video/mp4" });
    let out = new File([blob], source.name.replace(/\.\w+$/, "") + ".mp4", { type: "video/mp4" });

    if (out.size > TARGET_MB * 1024 * 1024) {
      reporter?.onStage?.(UPLOAD_STAGE.compressingVideoMore);
      await ff.writeFile(inputName, await fetchFile(out));
      await withTimeout(
        ff.exec([
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
        ]),
        TRANSCODE_TIMEOUT_MS,
        "แปลงวิดีโอนานเกินไป — ลองคลิปสั้นลงหรืออัปจากเครื่องที่แรงกว่า",
      );
      const data2 = await ff.readFile(outputName);
      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
      out = new File([new Blob([data2], { type: "video/mp4" })], out.name, { type: "video/mp4" });
    }

    if (out.size > MAX_OUTPUT_MB * 1024 * 1024) {
      throw new Error(`วิดีโอยังใหญ่เกิน ${MAX_OUTPUT_MB}MB หลังบีบอัด — ลองคลิปสั้นลง`);
    }

    return out;
  } catch (err) {
    // A failed exec can leave the instance in a bad state — reset for next try.
    resetSharedFfmpeg();
    throw mapTranscodeError(err);
  }
}
