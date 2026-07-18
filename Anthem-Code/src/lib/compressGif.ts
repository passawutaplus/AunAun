import { fetchFile } from "@ffmpeg/util";
import { getSharedFfmpeg, resetSharedFfmpeg, withTimeout } from "@/lib/ffmpegCore";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

/** GIFs at or below this size upload as-is (animation preserved, cheap to serve). */
const GIF_CONVERT_ABOVE_BYTES = 2 * 1024 * 1024;
const TRANSCODE_TIMEOUT_MS = 3 * 60_000;

export type PreparedGif =
  | { file: File; isVideo: false }
  | { file: File; isVideo: true };

/**
 * Large animated GIFs are huge and slow to serve. Convert them to a looping,
 * muted mp4 (10–20× smaller) while keeping small GIFs untouched so short
 * stickers still play natively as images.
 */
export async function prepareGif(
  file: File,
  reporter?: UploadStageReporter,
): Promise<PreparedGif> {
  if (file.size <= GIF_CONVERT_ABOVE_BYTES) {
    return { file, isVideo: false };
  }

  reporter?.onStage?.(UPLOAD_STAGE.compressingGif);
  const ff = await getSharedFfmpeg(reporter?.onPercent);
  const inputName = "input.gif";
  const outputName = "output.mp4";

  try {
    await ff.writeFile(inputName, await fetchFile(file));
    await withTimeout(
      ff.exec([
        "-i",
        inputName,
        // h264 needs yuv420p + even dimensions.
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        "-vf",
        "scale='min(1280,iw)':-2:flags=lanczos,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "26",
        "-an",
        outputName,
      ]),
      TRANSCODE_TIMEOUT_MS,
      "แปลง GIF นานเกินไป — ลองไฟล์เล็กลง",
    );
    const data = await ff.readFile(outputName);
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);

    const mp4 = new File(
      [new Blob([data], { type: "video/mp4" })],
      file.name.replace(/\.gif$/i, "") + ".mp4",
      { type: "video/mp4" },
    );

    // If conversion somehow produced a bigger file, keep the original GIF.
    if (mp4.size >= file.size) {
      return { file, isVideo: false };
    }
    return { file: mp4, isVideo: true };
  } catch (err) {
    resetSharedFfmpeg();
    throw err;
  }
}
