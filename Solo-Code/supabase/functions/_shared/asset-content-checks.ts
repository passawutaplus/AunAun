/**
 * Content checks for project attachments that run on the bytes themselves (server side),
 * so a renamed or tampered upload cannot rely on what the client claims about it.
 * Pure functions — no Deno or Supabase imports — so they can be unit-tested under Node/Vitest too.
 */

const startsWith = (b: Uint8Array, ...bytes: number[]) => bytes.every((v, i) => b[i] === v);

/** First-bytes signatures per allowed extension. */
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  pdf: (b) => startsWith(b, 0x25, 0x50, 0x44, 0x46),
  zip: (b) => b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07),
  png: (b) => startsWith(b, 0x89, 0x50, 0x4e, 0x47),
  jpg: (b) => startsWith(b, 0xff, 0xd8, 0xff),
  jpeg: (b) => startsWith(b, 0xff, 0xd8, 0xff),
  webp: (b) => startsWith(b, 0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  ttf: (b) => startsWith(b, 0x00, 0x01, 0x00, 0x00) || startsWith(b, 0x74, 0x72, 0x75, 0x65),
  otf: (b) => startsWith(b, 0x4f, 0x54, 0x54, 0x4f),
  woff: (b) => startsWith(b, 0x77, 0x4f, 0x46, 0x46),
  woff2: (b) => startsWith(b, 0x77, 0x4f, 0x46, 0x32),
};

export function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const i = base.lastIndexOf(".");
  return i < 0 ? "" : base.slice(i + 1).toLowerCase();
}

/** True when the file's leading bytes are what its extension promises (an .exe renamed .pdf fails). */
export function signatureMatchesExtension(ext: string, bytes: Uint8Array): boolean {
  const check = SIGNATURES[ext];
  return !!check && check(bytes);
}

/** File names inside the ZIP, read from the central directory. Null if the archive is not parseable. */
export function zipEntryNames(bytes: Uint8Array): string[] | null {
  // End-of-central-directory record (signature 0x06054b50) lives in the last 64 KB + 22 bytes.
  const min = Math.max(0, bytes.length - 22 - 0xffff);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= min; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const names: string[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: false });
  for (let n = 0; n < total; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) return null;
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    if (offset + 46 + nameLen > bytes.length) return null;
    names.push(decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLen)));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

/** Programs and scripts that must not ride along inside an uploaded ZIP. */
export const DANGEROUS_ARCHIVE_EXTENSIONS = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "pif", "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "psm1",
  "hta", "jar", "apk", "dmg", "app", "lnk", "dll", "sh", "reg", "cpl", "msc", "iso", "appimage",
]);

export function dangerousZipEntry(names: string[]): string | null {
  for (const name of names) {
    // Path traversal in an archive entry is never legitimate.
    if (name.includes("..\\") || name.includes("../") || name.startsWith("/") || /^[a-zA-Z]:/.test(name)) return name;
    if (DANGEROUS_ARCHIVE_EXTENSIONS.has(extensionOf(name))) return name;
  }
  return null;
}

/** PDF actions that run programs or open arbitrary files. Plain JavaScript/forms are left alone. */
export function pdfHasLaunchAction(bytes: Uint8Array): boolean {
  // Scan the raw bytes as latin1; PDF structure keywords are ASCII.
  let text = "";
  const step = 1 << 13;
  for (let i = 0; i < bytes.length; i += step) {
    text += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + step)));
  }
  return /\/Launch\b/.test(text) || /\/EmbeddedFile\b/.test(text) && /\/Filespec\b/.test(text) && /\.(exe|bat|cmd|scr|vbs|js|jar|msi)\b/i.test(text);
}

export type ContentCheck = { ok: true } | { ok: false; reason: string };

/** All local, no-network content checks for one downloaded attachment. */
export function checkAttachmentBytes(ext: string, bytes: Uint8Array): ContentCheck {
  if (!SIGNATURES[ext]) return { ok: false, reason: "ประเภทไฟล์นี้ไม่รองรับ" };
  if (!signatureMatchesExtension(ext, bytes)) {
    return { ok: false, reason: "เนื้อไฟล์ไม่ตรงกับนามสกุลไฟล์" };
  }
  if (ext === "zip") {
    const names = zipEntryNames(bytes);
    if (names === null) return { ok: false, reason: "อ่านโครงสร้างไฟล์ ZIP ไม่ได้" };
    const bad = dangerousZipEntry(names);
    if (bad) return { ok: false, reason: `ไฟล์ ZIP มีไฟล์ที่อาจเป็นอันตราย (${bad.slice(0, 40)})` };
  }
  if (ext === "pdf" && pdfHasLaunchAction(bytes)) {
    return { ok: false, reason: "ไฟล์ PDF มีคำสั่งที่เรียกโปรแกรมภายนอก" };
  }
  return { ok: true };
}
