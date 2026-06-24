import { PDFDocument } from "pdf-lib";

export const WHT_MAX_BYTES = 10 * 1024 * 1024;
const WHT_BUCKET = "wht-certificates";

/** Reject path traversal; path must be `{userId}/filename`. */
export function assertWhtStoragePath(storagePath: string, userId: string): void {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error("เส้นทางไฟล์ไม่ถูกต้อง");
  }
  const prefix = `${userId}/`;
  if (!normalized.startsWith(prefix) || normalized.slice(prefix.length).length === 0) {
    throw new Error("ไม่มีสิทธิ์เข้าถึงไฟล์นี้");
  }
}

export function whtStorageBucket() {
  return WHT_BUCKET;
}

/** Keep only page 1 of multi-page 50 ทวิ PDFs to cut AI payload size. */
export async function extractPdfFirstPage(bytes: Uint8Array): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  if (src.getPageCount() <= 1) return bytes;

  const dst = await PDFDocument.create();
  const [first] = await dst.copyPages(src, [0]);
  dst.addPage(first);
  return dst.save();
}

export async function prepareScanBytes(
  raw: Uint8Array,
  mimeType: string,
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  if (raw.byteLength > WHT_MAX_BYTES) {
    throw new Error(`ไฟล์ใหญ่เกิน ${WHT_MAX_BYTES / (1024 * 1024)}MB`);
  }

  if (mimeType === "application/pdf") {
    const trimmed = await extractPdfFirstPage(raw);
    return { bytes: trimmed, mimeType: "application/pdf" };
  }

  return { bytes: raw, mimeType };
}

export function toVisionDataUrl(bytes: Uint8Array, mimeType: string): string {
  const b64 = Buffer.from(bytes).toString("base64");
  return `data:${mimeType};base64,${b64}`;
}
