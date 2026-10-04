/**
 * Strips location/camera metadata (EXIF incl. GPS, XMP, IPTC, PNG text chunks) from JPEG, PNG and WebP.
 * Pure Uint8Array code so the browser bundle and the serverless API share it. JPEG keeps only the
 * EXIF orientation so photos still display upright. Unknown formats are returned unchanged.
 */

const ascii = (b, at, len) => String.fromCharCode(...b.subarray(at, at + len));
const concat = parts => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

function exifOrientation(b, start, end) {
  // start points at the TIFF header
  if (end - start < 14) return 1;
  const little = ascii(b, start, 2) === "II";
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u16 = at => dv.getUint16(at, little);
  const u32 = at => dv.getUint32(at, little);
  if (u16(start + 2) !== 0x2a) return 1;
  const ifd = start + u32(start + 4);
  if (ifd + 2 > end) return 1;
  const n = u16(ifd);
  for (let i = 0; i < n && ifd + 2 + i * 12 + 12 <= end; i++) {
    const e = ifd + 2 + i * 12;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}

function orientationOnlyExif(orientation) {
  const body = new Uint8Array([
    0x45, 0x78, 0x69, 0x66, 0, 0, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // big-endian TIFF header, IFD0 at 8
    0, 1, // one entry
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, // Orientation, SHORT, count 1
    0, 0, 0, 0, // no next IFD
  ]);
  return concat([new Uint8Array([0xff, 0xe1, 0, body.length + 2]), body]);
}

function stripJpeg(b) {
  const out = [b.subarray(0, 2)];
  let i = 2;
  let orientation = 1;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];
    if (marker === 0xda) { out.push(b.subarray(i)); i = b.length; break; } // SOS: rest is image data
    const len = (b[i + 2] << 8) | b[i + 3];
    const seg = b.subarray(i, i + 2 + len);
    const isExif = marker === 0xe1 && ascii(b, i + 4, 6) === "Exif\0\0";
    const isXmp = marker === 0xe1 && ascii(b, i + 4, 28).startsWith("http://ns.adobe.com/xap");
    if (isExif) orientation = exifOrientation(b, i + 10, i + 2 + len);
    else if (!isXmp && marker !== 0xed && marker !== 0xfe) out.push(seg); // drop APP13 (IPTC) and comments
    i += 2 + len;
  }
  if (i < b.length) out.push(b.subarray(i));
  if (orientation > 1 && orientation <= 8) out.splice(1, 0, orientationOnlyExif(orientation));
  return concat(out);
}

function stripPng(b) {
  const out = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) { out.push(b.subarray(i)); break; }
    if (!["eXIf", "tEXt", "zTXt", "iTXt"].includes(type)) out.push(b.subarray(i, end));
    i = end;
  }
  return concat(out);
}

function stripWebp(b) {
  const out = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
    const end = i + 8 + len + (len & 1);
    if (end > b.length) { out.push(b.subarray(i)); break; }
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = b.slice(i, end);
      if (type === "VP8X") chunk[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
      out.push(chunk);
    }
    i = end;
  }
  const body = concat(out);
  const head = new Uint8Array(12);
  head.set(b.subarray(0, 12));
  const size = body.length + 4;
  head[4] = size & 255; head[5] = (size >> 8) & 255; head[6] = (size >> 16) & 255; head[7] = (size >>> 24) & 255;
  return concat([head, body]);
}

export function stripImageMetadata(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  try {
    if (b[0] === 0xff && b[1] === 0xd8) return stripJpeg(b);
    if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return stripPng(b);
    if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return stripWebp(b);
  } catch { /* malformed: fall through to the original bytes */ }
  return b;
}

/** True when the bytes contain a GPS IFD pointer (tag 0x8825) inside a JPEG EXIF block. Used by tests. */
export function hasGpsExif(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  for (let i = 0; i + 12 < b.length; i++) {
    if (b[i] === 0xff && b[i + 1] === 0xe1 && ascii(b, i + 4, 6) === "Exif\0\0") {
      const len = (b[i + 2] << 8) | b[i + 3];
      for (let j = i + 10; j + 1 < i + 2 + len; j++) {
        if ((b[j] === 0x88 && b[j + 1] === 0x25) || (b[j] === 0x25 && b[j + 1] === 0x88)) return true;
      }
    }
  }
  return false;
}
