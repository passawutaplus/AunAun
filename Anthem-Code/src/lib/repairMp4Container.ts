/**
 * Repair broken MP4 containers where the mdat atom size incorrectly
 * swallows the trailing moov atom (common on some mobile camera/web-capture
 * exports). Without this, ffmpeg.wasm and many players report "moov atom not found".
 */

async function readBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") {
    return new Uint8Array(await blob.arrayBuffer());
  }
  // jsdom File polyfill may lack arrayBuffer — fall back to FileReader.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsArrayBuffer(blob);
  });
}

function readU32BE(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function writeU32BE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

function fourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

type TopAtom = { type: string; offset: number; size: number };

function parseTopAtoms(view: DataView): { atoms: TopAtom[]; broken: boolean } {
  const atoms: TopAtom[] = [];
  let offset = 0;
  const len = view.byteLength;

  while (offset + 8 <= len) {
    let size = readU32BE(view, offset);
    const type = fourCC(view, offset + 4);
    let header = 8;

    if (size === 1) {
      if (offset + 16 > len) return { atoms, broken: true };
      // 64-bit largesize — rare for our uploads; treat as broken if huge.
      const hi = readU32BE(view, offset + 8);
      const lo = readU32BE(view, offset + 12);
      size = hi * 0x100000000 + lo;
      header = 16;
    } else if (size === 0) {
      size = len - offset;
    }

    if (size < header || offset + size > len) {
      atoms.push({ type, offset, size });
      return { atoms, broken: true };
    }

    atoms.push({ type, offset, size });
    offset += size;
  }

  return { atoms, broken: offset !== len };
}

/** Find a valid moov box start by scanning for size+"moov" that ends within the file. */
function findMoovBoxStart(view: DataView, searchFrom: number): number | null {
  const len = view.byteLength;
  const m = "m".charCodeAt(0);
  const o = "o".charCodeAt(0);
  const v = "v".charCodeAt(0);

  // Prefer a moov that ends at EOF (typical non-faststart layout).
  let best: number | null = null;

  for (let i = Math.max(0, searchFrom); i + 8 <= len; i++) {
    if (
      view.getUint8(i + 4) !== m ||
      view.getUint8(i + 5) !== o ||
      view.getUint8(i + 6) !== o ||
      view.getUint8(i + 7) !== v
    ) {
      continue;
    }
    const size = readU32BE(view, i);
    if (size < 8) continue;
    const end = i + size;
    if (end > len) continue;
    // Reasonable moov: metadata box, not media. Cap absolute size; for tiny
    // fixtures allow a larger fraction so unit tests still work.
    if (size > 32 * 1024 * 1024) continue;
    if (len > 1024 && size > len * 0.5) continue;
    if (end === len) return i;
    if (best == null) best = i;
  }
  return best;
}

function hasFourCC(bytes: Uint8Array, start: number, end: number, a: number, b: number, c: number, d: number): boolean {
  const lim = Math.min(end, bytes.length) - 3;
  for (let i = start; i < lim; i++) {
    if (bytes[i] === a && bytes[i + 1] === b && bytes[i + 2] === c && bytes[i + 3] === d) {
      return true;
    }
  }
  return false;
}

/**
 * True if bytes look like HEVC (hvc1/hev1) sample entry — needs H.264 re-encode
 * for Chrome/Windows. Codec tags live in moov, often at the *end* of the file
 * (non-faststart phone captures), so we scan head + tail.
 */
export function looksLikeHevcMp4(bytes: Uint8Array): boolean {
  const H = 0x68;
  const head = Math.min(bytes.length, 512 * 1024);
  const tailStart = Math.max(0, bytes.length - 2 * 1024 * 1024);
  // hvc1
  if (hasFourCC(bytes, 0, head, H, 0x76, 0x63, 0x31)) return true;
  if (hasFourCC(bytes, tailStart, bytes.length, H, 0x76, 0x63, 0x31)) return true;
  // hev1
  if (hasFourCC(bytes, 0, head, H, 0x65, 0x76, 0x31)) return true;
  if (hasFourCC(bytes, tailStart, bytes.length, H, 0x65, 0x76, 0x31)) return true;
  return false;
}

export type Mp4BytesRepairResult = {
  bytes: Uint8Array;
  repaired: boolean;
  needsTranscode: boolean;
  reason?: string;
};

export type Mp4RepairResult = {
  file: File;
  repaired: boolean;
  needsTranscode: boolean;
  reason?: string;
};

/**
 * Byte-level repair used by uploads and unit tests.
 * If mdat size hides a trailing moov, rewrite mdat size so moov is a sibling.
 * Also flags HEVC for forced H.264 transcode (Chrome/Windows).
 */
export function repairMp4Bytes(
  buf: Uint8Array,
  opts?: { fileName?: string },
): Mp4BytesRepairResult {
  const name = (opts?.fileName ?? "video.mp4").toLowerCase();
  if (buf.byteLength < 32) {
    return { bytes: buf, repaired: false, needsTranscode: true, reason: "too-small" };
  }

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const hevc = looksLikeHevcMp4(buf);
  const { atoms, broken } = parseTopAtoms(view);
  const hasMoov = atoms.some((a) => a.type === "moov");
  const mdat = atoms.find((a) => a.type === "mdat");

  // Healthy container: moov visible as a top-level atom.
  if (hasMoov && !broken) {
    return {
      bytes: buf,
      repaired: false,
      needsTranscode: hevc || !(name.endsWith(".mp4") || name.endsWith(".m4v")),
      reason: hevc ? "hevc" : undefined,
    };
  }

  if (!mdat) {
    return { bytes: buf, repaired: false, needsTranscode: true, reason: "no-mdat" };
  }

  // Katie-style: mdat size claims to run to EOF (or overflows), hiding moov inside.
  const moovStart = findMoovBoxStart(view, mdat.offset + 8);
  if (moovStart == null || moovStart <= mdat.offset + 8) {
    return {
      bytes: buf,
      repaired: false,
      needsTranscode: true,
      reason: "moov-not-found",
    };
  }

  const correctMdatSize = moovStart - mdat.offset;
  if (correctMdatSize < 8) {
    return { bytes: buf, repaired: false, needsTranscode: true, reason: "bad-mdat" };
  }

  const fixed = buf.slice();
  writeU32BE(fixed, mdat.offset, correctMdatSize);

  const fixedView = new DataView(fixed.buffer, fixed.byteOffset, fixed.byteLength);
  const check = parseTopAtoms(fixedView);
  if (!check.atoms.some((a) => a.type === "moov") || check.broken) {
    return {
      bytes: buf,
      repaired: false,
      needsTranscode: true,
      reason: "repair-failed",
    };
  }

  return {
    bytes: fixed,
    repaired: true,
    // Always re-encode after container repair (+faststart + HEVC→H.264).
    needsTranscode: true,
    reason: hevc ? "mdat-swallowed-moov+hevc" : "mdat-swallowed-moov",
  };
}

/**
 * If the MP4 has a broken mdat size that hides moov, rewrite mdat size so
 * moov is a sibling atom again. Also flags HEVC for forced transcode.
 */
export async function repairMp4Container(file: File): Promise<Mp4RepairResult> {
  const name = file.name.toLowerCase();
  const isMp4Like =
    file.type === "video/mp4" ||
    file.type === "video/quicktime" ||
    name.endsWith(".mp4") ||
    name.endsWith(".m4v") ||
    name.endsWith(".mov");

  if (!isMp4Like) {
    return { file, repaired: false, needsTranscode: true };
  }

  const buf = await readBytes(file);
  const result = repairMp4Bytes(buf, { fileName: file.name });

  if (!result.repaired) {
    return {
      file,
      repaired: false,
      needsTranscode: result.needsTranscode,
      reason: result.reason,
    };
  }

  // Copy into a fresh ArrayBuffer so File/Blob constructors can't share a view.
  const ab = result.bytes.buffer.slice(
    result.bytes.byteOffset,
    result.bytes.byteOffset + result.bytes.byteLength,
  );
  const out = new File([ab], file.name, {
    type: file.type || "video/mp4",
    lastModified: file.lastModified,
  });

  return {
    file: out,
    repaired: true,
    needsTranscode: result.needsTranscode,
    reason: result.reason,
  };
}
