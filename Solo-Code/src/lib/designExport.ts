/** Export palettes for Adobe / Figma / CSS */

export type ExportColor = { name: string; hex: string };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Minimal Adobe Swatch Exchange (ASE) for RGB colors */
export function buildAseFile(colors: ExportColor[]): Uint8Array {
  const blocks: Uint8Array[] = [];
  for (const c of colors) {
    const name = (c.name || c.hex).slice(0, 32);
    const nameUtf16 = new Uint8Array(name.length * 2 + 2);
    for (let i = 0; i < name.length; i++) {
      nameUtf16[i * 2] = name.charCodeAt(i) & 0xff;
      nameUtf16[i * 2 + 1] = (name.charCodeAt(i) >> 8) & 0xff;
    }
    const { r, g, b } = hexToRgb(c.hex);
    const colorModel = new TextEncoder().encode("RGB ");
    const blockBody = new Uint8Array(
      2 + nameUtf16.length + 2 + colorModel.length + 3 + 2,
    );
    let o = 0;
    blockBody[o++] = 0;
    blockBody[o++] = name.length;
    blockBody.set(nameUtf16, o);
    o += nameUtf16.length;
    blockBody[o++] = 0;
    blockBody[o++] = 0;
    blockBody.set(colorModel, o);
    o += colorModel.length;
    blockBody[o++] = r;
    blockBody[o++] = g;
    blockBody[o++] = b;
    blockBody[o++] = 0;
    blockBody[o++] = 0;

    const header = new Uint8Array(6);
    const view = new DataView(header.buffer);
    view.setUint16(0, 0x0001, false);
    view.setUint32(2, blockBody.length, false);
    blocks.push(header, blockBody);
  }

  const totalLen = 12 + blocks.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(totalLen);
  const dv = new DataView(out.buffer);
  out.set(new TextEncoder().encode("ASEF"), 0);
  dv.setUint16(4, 1, false);
  dv.setUint16(6, 0, false);
  dv.setUint32(8, colors.length, false);
  let offset = 12;
  for (const b of blocks) {
    out.set(b, offset);
    offset += b.length;
  }
  return out;
}

export function buildDesignTokensJson(colors: ExportColor[]): string {
  const tokens: Record<string, { $type: string; $value: string }> = {};
  colors.forEach((c, i) => {
    const key = (c.name || `color-${i + 1}`).replace(/\s+/g, "-").toLowerCase();
    tokens[key] = { $type: "color", $value: c.hex };
  });
  return JSON.stringify(tokens, null, 2);
}

export function buildCssVariables(colors: ExportColor[]): string {
  const lines = colors.map((c, i) => {
    const varName = (c.name || `brand-${i + 1}`).replace(/\s+/g, "-").toLowerCase();
    return `  --${varName}: ${c.hex};`;
  });
  return [":root {", ...lines, "}"].join("\n");
}

export function buildCanvaHexList(colors: ExportColor[]): string {
  return [
    "รายการสีสำหรับ Canva Brand Kit:",
    ...colors.map((c) => `${c.hex}  (${c.name || "สี"})`),
    "",
    "เปิด Canva → Brand Kit → เพิ่มสีแบรนด์ → วาง HEX ทีละสี",
  ].join("\n");
}

/** Parse simple ASE RGB swatches (best-effort) */
export function parseAseColors(bytes: Uint8Array): string[] {
  const sig = new TextDecoder().decode(bytes.slice(0, 4));
  if (sig !== "ASEF") throw new Error("ไฟล์ ASE ไม่ถูกต้อง");
  const hexes: string[] = [];
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = dv.getUint32(8, false);
  let offset = 12;
  for (let i = 0; i < count && offset < bytes.length - 20; i++) {
    const blockLen = dv.getUint32(offset + 2, false);
    offset += 6;
    const model = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    if (model.startsWith("RGB")) {
      const r = bytes[offset + 8]!;
      const g = bytes[offset + 9]!;
      const b = bytes[offset + 10]!;
      hexes.push(
        `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase()}`,
      );
    }
    offset += blockLen;
  }
  return hexes;
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes.slice()], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
