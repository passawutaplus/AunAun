import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";

/**
 * iPhone/iPad default photos are HEIC/HEIF. Chromium & Firefox on desktop can't
 * decode them, so `browser-image-compression` (canvas draw) fails and the module
 * silently stays empty ("ภาพไม่ขึ้น"). We detect HEIC and transcode to JPEG in
 * the browser before the normal compression pass.
 */

/** File extensions we treat as HEIC/HEIF regardless of (often-missing) MIME. */
const HEIC_EXT = /\.(heic|heif|hif)$/i;
/** ISO-BMFF ftyp brands that mark a HEIF/HEIC still image or sequence. */
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/** True for HEIC/HEIF by MIME or filename (cheap, sync — for accept gates). */
export function isHeicByHint(file: File): boolean {
  return /image\/(heic|heif)/i.test(file.type) || HEIC_EXT.test(file.name);
}

/**
 * Accept gate for portfolio image pickers: the standard web-safe types plus
 * HEIC/HEIF (transcoded on upload). HEIC often has an empty MIME on Windows,
 * so we also match by extension.
 */
export function isAllowedPortfolioImage(file: File): boolean {
  return /^image\/(jpeg|png|webp)$/i.test(file.type) || isHeicByHint(file);
}

function readBytes(file: Blob, n: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, n));
  });
}

/** Cheap local check (no heavy wasm import) using MIME, extension, then ftyp bytes. */
async function looksLikeHeic(file: File): Promise<boolean> {
  if (/image\/(heic|heif)/i.test(file.type)) return true;
  if (HEIC_EXT.test(file.name)) return true;
  // Empty/generic MIME (common on Windows for .heic) — sniff the ftyp box.
  try {
    const head = await readBytes(file, 32);
    if (head.length < 12) return false;
    // Bytes 4..8 must be the ASCII "ftyp" box type.
    if (head[4] !== 0x66 || head[5] !== 0x74 || head[6] !== 0x79 || head[7] !== 0x70) {
      return false;
    }
    const major = String.fromCharCode(head[8], head[9], head[10], head[11]).toLowerCase();
    return HEIC_BRANDS.has(major);
  } catch {
    return false;
  }
}

/**
 * Convert HEIC/HEIF to a JPEG File the browser can decode. Non-HEIC files are
 * returned unchanged. The heavy converter (libheif wasm) is imported lazily so
 * it only ships to users who actually upload an iPhone photo.
 */
export async function normalizeImageForUpload(
  file: File,
  reporter?: UploadStageReporter,
): Promise<File> {
  if (!(await looksLikeHeic(file))) return file;

  reporter?.onStage?.(UPLOAD_STAGE.convertingHeic);
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  const name = file.name.replace(HEIC_EXT, "") + ".jpg";
  return new File([blob], name || "image.jpg", {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}
