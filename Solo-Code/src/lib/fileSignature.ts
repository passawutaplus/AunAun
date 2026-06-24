// File signature (magic bytes) validation.
// Prevents extension/MIME spoofing — verifies the file's actual binary header
// matches one of the allowed file types.

export type AllowedKind = "jpeg" | "png" | "webp" | "gif" | "svg" | "pdf";

const KIND_BY_MIME: Record<string, AllowedKind> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
};

const KIND_BY_EXT: Record<string, AllowedKind> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  gif: "gif",
  svg: "svg",
  pdf: "pdf",
};

function readBytes(file: File, n: number): Promise<Uint8Array> {
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

function detectKind(head: Uint8Array, textHead: string): AllowedKind | null {
  // JPEG: FF D8 FF
  if (startsWith(head, [0xff, 0xd8, 0xff])) return "jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // GIF: "GIF87a" or "GIF89a"
  if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return "gif";
  // WEBP: "RIFF"...."WEBP"
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8))
    return "webp";
  // PDF: "%PDF-"
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  // SVG: text-based, must contain "<svg" and look like XML
  const t = textHead.trim().toLowerCase();
  if (t.startsWith("<?xml") || t.startsWith("<svg")) {
    if (textHead.toLowerCase().includes("<svg")) return "svg";
  }
  return null;
}

/**
 * Verify a file's MIME type, extension, and magic-byte signature all agree.
 * Throws a localized error if anything mismatches or the file type isn't allowed.
 *
 * @param file the user-supplied File
 * @param allowed list of allowed kinds (e.g. ["jpeg","png","pdf"])
 */
export async function assertFileSignature(
  file: File,
  allowed: readonly AllowedKind[],
): Promise<AllowedKind> {
  // 1) MIME check
  const mimeKind = KIND_BY_MIME[file.type];
  if (!mimeKind) {
    throw new Error(`ไม่อนุญาตประเภทไฟล์: ${file.type || "unknown"}`);
  }
  if (!allowed.includes(mimeKind)) {
    throw new Error(`ไม่อนุญาต .${mimeKind} (อนุญาต: ${allowed.join(", ")})`);
  }

  // 2) Extension check
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const extKind = KIND_BY_EXT[ext];
  if (!extKind) {
    throw new Error(`นามสกุลไฟล์ไม่รองรับ: .${ext || "unknown"}`);
  }
  if (extKind !== mimeKind) {
    throw new Error(`นามสกุล .${ext} ไม่ตรงกับประเภท ${file.type}`);
  }

  // 3) Magic-byte signature check
  const head = await readBytes(file, 32);
  const textHead = new TextDecoder("utf-8", { fatal: false }).decode(head);
  const sigKind = detectKind(head, textHead);
  if (!sigKind) {
    throw new Error("ไฟล์เสียหายหรือเป็นไฟล์ปลอม (อ่านลายเซ็นไม่ได้)");
  }
  if (sigKind !== mimeKind) {
    throw new Error(`เนื้อไฟล์เป็น ${sigKind} แต่ระบุเป็น ${mimeKind} — ปฏิเสธไฟล์ปลอม`);
  }

  return sigKind;
}
