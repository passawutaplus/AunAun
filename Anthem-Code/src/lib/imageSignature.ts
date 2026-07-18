// Lightweight magic-byte check for image uploads.
// Rejects files whose bytes don't look like a real image (extension/MIME spoofing),
// while staying permissive enough not to block valid cropped/re-encoded blobs.

function readHead(file: Blob, n: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, n));
  });
}

function startsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

/** True when the binary header matches a common raster image format. */
function looksLikeImage(head: Uint8Array): boolean {
  // JPEG: FF D8 FF
  if (startsWith(head, [0xff, 0xd8, 0xff])) return true;
  // PNG
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
  // GIF87a / GIF89a
  if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return true;
  // WEBP: "RIFF"...."WEBP"
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) {
    return true;
  }
  // BMP
  if (startsWith(head, [0x42, 0x4d])) return true;
  return false;
}

/**
 * Verify an uploaded file's bytes actually look like an image. Throws a
 * localized error for spoofed/corrupt files. Skips exotic formats we re-encode
 * anyway (e.g. HEIC) to avoid false rejections.
 */
export async function assertRealImage(file: File): Promise<void> {
  if (!file.type.startsWith("image/")) {
    throw new Error("ไฟล์ไม่ใช่รูปภาพ");
  }
  // HEIC/HEIF/AVIF and svg have varied containers — let the encoder handle them.
  if (/heic|heif|avif|svg/i.test(file.type)) return;

  const head = await readHead(file, 16);
  if (!looksLikeImage(head)) {
    throw new Error("ไฟล์เสียหายหรือไม่ใช่รูปภาพจริง — ลองไฟล์อื่น");
  }
}
