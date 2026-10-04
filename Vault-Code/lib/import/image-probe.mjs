/** Reads width/height from the first bytes of PNG, GIF, JPEG or WebP. Returns null when unknown. Pure. */
export function probeImageSize(buf) {
  if (!buf || buf.length < 12) return null;
  // PNG
  if (buf[0] === 0x89 && buf.toString("latin1", 1, 4) === "PNG" && buf.length >= 24) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), type: "png" };
  }
  // GIF
  if (buf.toString("latin1", 0, 3) === "GIF" && buf.length >= 10) {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8), type: "gif" };
  }
  // WebP
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP" && buf.length >= 30) {
    const kind = buf.toString("latin1", 12, 16);
    if (kind === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3), type: "webp" };
    if (kind === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1, type: "webp" };
    }
    if (kind === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff, type: "webp" };
    return null;
  }
  // JPEG: walk segments to the first SOFn marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), type: "jpeg" };
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
