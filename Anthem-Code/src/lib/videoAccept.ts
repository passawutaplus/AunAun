/** Video-only picker: `video/*` + extensions (no image MIME types). */
export const PROJECT_VIDEO_ACCEPT = [
  "video/*",
  ".mp4",
  ".m4v",
  ".webm",
  ".mov",
  ".qt",
  ".avi",
  ".mkv",
  ".ogv",
  ".ogg",
  ".mpeg",
  ".mpg",
  ".mpe",
  ".3gp",
  ".3g2",
].join(",");

const VIDEO_EXT = new Set([
  "mp4",
  "m4v",
  "webm",
  "mov",
  "qt",
  "avi",
  "mkv",
  "ogv",
  "ogg",
  "mpeg",
  "mpg",
  "mpe",
  "3gp",
  "3g2",
]);

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  if (file.type.startsWith("image/")) return false;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT.has(ext);
}

/** Detect a stored media URL that points to a video (e.g. GIFs converted to mp4). */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.split("?")[0]?.split("#")[0] ?? "";
  const ext = clean.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT.has(ext);
}
